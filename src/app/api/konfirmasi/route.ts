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
    format = q.get("format") ?? "xlsx";
  if (!["csv", "xlsx", "kml", "geojson"].includes(format))
    throw new ApiError("Format ekspor harus csv, xlsx, kml, atau geojson.");
  const semuaSesi = await daftarSesi();
  const sesi = semuaSesi.find((s) => s.id === id);
  if (!sesi) throw new ApiError("Sesi tidak ditemukan.", 404);
  const hasil = await bacaHasil(id, 0, 100000);
  const rows = hasil.map((h) => ({
    "Deskripsi A": aman(h.deskripsiA),
    "Sumber Master": aman(h.sumber),
    "Koordinat A X": h.ax,
    "Koordinat A Y": h.ay,
    Status: h.status,
    "Jarak (m)": h.jarak === null ? "" : Number(h.jarak.toFixed(3)),
    "Deskripsi B": aman(h.deskripsiB),
    "Koordinat B X": h.bx,
    "Koordinat B Y": h.by,
    Keputusan: h.keputusan,
    "Deskripsi Hasil": aman(h.hasilDeskripsi),
    "Koordinat Hasil X": h.hasilX,
    "Koordinat Hasil Y": h.hasilY,
  }));
  // Golden dataset: pakai koordinat hasil koreksi, fallback ke data B/masternya.
  const final = hasil.map((h) => ({
    deskripsi: aman(
      h.hasilDeskripsi || h.deskripsiB || h.deskripsiA || "Tanpa deskripsi",
    ),
    x: h.hasilX ?? h.bx,
    y: h.hasilY ?? h.by,
    status: h.keputusan,
  }));
  const headers = {
    "Content-Disposition": `attachment; filename="SIMPATIK-${id.slice(0, 8)}.${format === "geojson" ? "geojson" : format}"`,
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
  const persen = (n: number) =>
    total ? `${((n / total) * 100).toFixed(1)}%` : "0.0%";
  const dikonfirmasi = hasil.filter(
    (h) => h.keputusan !== "BELUM_DITINJAU",
  ).length;
  const ringkasan = [
    { Keterangan: "Nama Sesi", Nilai: aman(sesi.nama) },
    { Keterangan: "Tanggal Export", Nilai: new Date().toISOString() },
    {
      Keterangan: "Master Acuan",
      Nilai: masters.map((m) => m.nama).join("; ") || "-",
    },
    { Keterangan: "Toleransi (m)", Nilai: sesi.toleransi },
    { Keterangan: "Total Titik", Nilai: total },
    { Keterangan: "", Nilai: "" },
    { Keterangan: "Rekap Status", Nilai: "Jumlah" },
    ...STATUS.map((s) => ({
      Keterangan: `${LABEL_STATUS[s]} (${s})`,
      Nilai: `${hitung(s)} \u00B7 ${persen(hitung(s))}`,
    })),
    { Keterangan: "", Nilai: "" },
    {
      Keterangan: "Sudah Dikonfirmasi",
      Nilai: `${dikonfirmasi} \u00B7 ${persen(dikonfirmasi)}`,
    },
    {
      Keterangan: "Belum Dikonfirmasi",
      Nilai: `${total - dikonfirmasi} \u00B7 ${persen(total - dikonfirmasi)}`,
    },
  ];
  const finalRows = final.map((f) => ({
    "Deskripsi Final": f.deskripsi,
    "Koordinat X Final": f.x,
    "Koordinat Y Final": f.y,
    "Status Akhir": f.status,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(ringkasan),
    "Ringkasan Audit",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Audit Trail Transparansi",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(finalRows),
    "Data Final Siap Pakai",
  );
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
