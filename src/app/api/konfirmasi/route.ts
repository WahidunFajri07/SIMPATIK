import { z } from "zod";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { endpoint, json, body, uuid, ApiError } from "@/lib/api";
import {
  konfirmasi,
  konfirmasiBanyak,
  bacaHasil,
  daftarSesi,
  daftarMaster,
  ubahCatatanManual,
} from "@/lib/repositori";
import { KEPUTUSAN, STATUS, LABEL_STATUS } from "@/lib/tipe";
export const POST = endpoint(async (req) => {
  const input = await body(
    req,
    z.union([
      z.object({
        id: z.string().regex(/^\d+$/),
        sesiId: uuid,
        keputusan: z.enum(KEPUTUSAN).exclude(["BELUM_DITINJAU"]),
        x: z.number().finite().min(-180).max(180).optional(),
        y: z.number().finite().min(-90).max(90).optional(),
        catatanManual: z.string().max(2000).nullable().optional(),
      }),
      z.object({
        ids: z.array(z.string().regex(/^\d+$/)).min(1).max(500),
        sesiId: uuid,
        keputusan: z
          .enum(KEPUTUSAN)
          .exclude(["BELUM_DITINJAU", "PAKAI_KOORDINAT_BARU"]),
      }),
    ]),
  );
  if ("ids" in input) return json(await konfirmasiBanyak(input));
  return json(await konfirmasi(input));
});
export const PATCH = endpoint(async (req) => {
  const input = await body(
    req,
    z.object({
      id: z.string().regex(/^\d+$/),
      sesiId: uuid,
      catatanManual: z.string().max(2000).nullable(),
    }),
  );
  return json(await ubahCatatanManual(input));
});
// Prevent spreadsheet formula execution while preserving original source coordinates.
function aman(s: string | null) {
  return /^[=+\-@\t\r]/.test(s ?? "") ? "'" + s : (s ?? "");
}
const esc = (s: string | null) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
/** KML butuh GeoJSON-style [lon,lat] \u2014 KML sendiri memakai lon,lat,alt. */
function kml(
  nama: string,
  rows: Array<{ deskripsi: string; x: number; y: number; status: string }>,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(nama)}</name>
    <description>SIMPATIK \u00B7 data final siap pakai</description>
${rows
  .map(
    (r) => `    <Placemark>
      <name>${esc(r.deskripsi)}</name>
      <description><![CDATA[Status akhir: ${r.status}]]></description>
      <Point><coordinates>${r.x},${r.y},0</coordinates></Point>
    </Placemark>`,
  )
  .join("\n")}
  </Document>
</kml>`;
}
function geojson(
  rows: Array<{ deskripsi: string; x: number; y: number; status: string }>,
) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((r) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [r.x, r.y] },
      properties: { deskripsi: r.deskripsi, status_akhir: r.status },
    })),
  };
}
export const GET = endpoint(async (req) => {
  const q = new URL(req.url).searchParams,
    id = uuid.parse(q.get("sesiId")),
    format = q.get("format") ?? "xlsx",
    requestedStatus = q.get("status") ?? "",
    isiKeteranganOtomatis = q.get("isiKeteranganOtomatis") === "true";
  if (!["csv", "xlsx", "kml", "geojson"].includes(format))
    throw new ApiError("Format ekspor harus csv, xlsx, kml, atau geojson.");
  if (
    requestedStatus &&
    requestedStatus !== "SEMUA" &&
    !STATUS.includes(requestedStatus as (typeof STATUS)[number])
  )
    throw new ApiError("Filter status ekspor tidak dikenal.");
  const filterStatus =
    requestedStatus && requestedStatus !== "SEMUA" ? requestedStatus : "SEMUA";
  const semuaSesi = await daftarSesi();
  const sesi = semuaSesi.find((s) => s.id === id);
  if (!sesi) throw new ApiError("Sesi tidak ditemukan.", 404);
  const hasil = (await bacaHasil(id, 0, 100000)).filter(
    (h) => filterStatus === "SEMUA" || h.status === filterStatus,
  );
  const keterangan = (h: (typeof hasil)[number]) =>
    aman(
      h.catatanManual || (isiKeteranganOtomatis ? LABEL_STATUS[h.status] : ""),
    );
  const rows = hasil.map((h) => ({
    "Deskripsi A": aman(h.deskripsiA),
    "Koordinat A X": h.ax,
    "Koordinat A Y": h.ay,
    Keterangan: keterangan(h),
    "Jarak (m)": h.jarak === null ? "" : Number(h.jarak.toFixed(3)),
    "Deskripsi B": aman(h.deskripsiB),
    "Koordinat B X": h.bx,
    "Koordinat B Y": h.by,
  }));
  // Golden dataset: pakai koordinat hasil koreksi, fallback ke data B/masternya.
  const final = hasil.map((h) => ({
    deskripsi: aman(
      h.hasilDeskripsi || h.deskripsiB || h.deskripsiA || "Tanpa deskripsi",
    ),
    x: h.hasilX ?? h.bx,
    y: h.hasilY ?? h.by,
    status: h.keputusan,
    statusPencocokan: h.status,
    keputusan: h.keputusan,
    sumber: aman(h.sumber),
    keterangan: keterangan(h),
  }));
  const amanNamaFile = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || id.slice(0, 8);
  const ekstensi = format === "geojson" ? "geojson" : format;
  const headers = {
    "Content-Disposition": `attachment; filename="SIMPATIK_${amanNamaFile(sesi.nama)}_${filterStatus}.${ekstensi}"`,
    "Cache-Control": "no-store",
  };
  if (format === "csv")
    return new Response("\uFEFF" + Papa.unparse(rows), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  if (format === "kml")
    return new Response(kml(sesi.nama, final), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8",
      },
    });
  if (format === "geojson")
    return new Response(JSON.stringify(geojson(final), null, 2), {
      headers: {
        ...headers,
        "Content-Type": "application/geo+json; charset=utf-8",
      },
    });
  // --- XLSX 3 sheet ---
  const masters = (await daftarMaster()).filter((m) =>
    sesi.masterIds.includes(m.id),
  );
  const hitung = (s: string) => hasil.filter((h) => h.status === s).length;
  const total = hasil.length;
  const persen = (n: number) => (total ? n / total : 0);
  const waktuWib =
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date()) + " WIB";
  const ringkasan = [
    { Kategori: "Nama Sesi", Nilai: aman(sesi.nama) },
    { Kategori: "Tanggal Export", Nilai: waktuWib },
    { Kategori: "Filter Export", Nilai: filterStatus },
    {
      Kategori: "Master Acuan",
      Nilai: masters.map((m) => m.nama).join("; ") || "-",
    },
    { Kategori: "Toleransi (m)", Nilai: sesi.toleransi },
    { Kategori: "Total Titik", Nilai: total },
    ...STATUS.map((s) => ({
      Kategori: LABEL_STATUS[s],
      Jumlah: hitung(s),
      Persentase: persen(hitung(s)),
    })),
  ];
  const finalRows = final.map((f) => ({
    "Deskripsi Final": f.deskripsi,
    "Koordinat X Final": f.x,
    "Koordinat Y Final": f.y,
    "Status Pencocokan": f.statusPencocokan,
    Keputusan: f.keputusan,
    "Sumber Master": f.sumber,
    Keterangan: f.keterangan,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Hasil Pencocokan",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(finalRows),
    "Data Final Siap Pakai",
  );
  const ringkasanSheet = XLSX.utils.json_to_sheet(ringkasan);
  const percentColumn = XLSX.utils.decode_col("D");
  for (let row = 1; row <= ringkasan.length; row++) {
    const cell =
      ringkasanSheet[XLSX.utils.encode_cell({ c: percentColumn, r: row })];
    if (cell && typeof cell.v === "number") cell.z = "0.00%";
  }
  XLSX.utils.book_append_sheet(workbook, ringkasanSheet, "Ringkasan Audit");
  return new Response(
    new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })),
    {
      headers: {
        ...headers,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    },
  );
});
