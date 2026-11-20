import { z } from "zod";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { endpoint, json, body, uuid, ApiError } from "@/lib/api";
import {
  konfirmasi,
  konfirmasiBanyak,
  bacaHasil,
  daftarSesi,
} from "@/lib/repositori";
import { KEPUTUSAN } from "@/lib/tipe";
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
export const GET = endpoint(async (req) => {
  const q = new URL(req.url).searchParams,
    id = uuid.parse(q.get("sesiId")),
    format = q.get("format") ?? "xlsx";
  if (!["csv", "xlsx"].includes(format))
    throw new ApiError("Format ekspor harus csv atau xlsx.");
  if (!(await daftarSesi()).some((s) => s.id === id))
    throw new ApiError("Sesi tidak ditemukan.", 404);
  const rows = (await bacaHasil(id, 0, 100000)).map((h) => ({
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
  const headers = {
    "Content-Disposition": `attachment; filename="SIMPATIK-${id.slice(0, 8)}.${format}"`,
    "Cache-Control": "no-store",
  };
  if (format === "csv")
    return new Response("\uFEFF" + Papa.unparse(rows), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
    });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    "Hasil Pencocokan",
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
