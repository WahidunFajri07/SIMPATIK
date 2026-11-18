import { mkdir, writeFile } from "node:fs/promises";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { dataContoh } from "../src/lib/contoh";
const { masters, titik, tinjauan } = dataContoh();
await mkdir("public/contoh", { recursive: true });
const workbook = XLSX.utils.book_new();
for (const m of masters) {
  const rows = titik
    .filter((t) => t.masterId === m.id)
    .map((t) => ({
      Deskripsi: t.deskripsi,
      Longitude: t.x,
      Latitude: t.y,
      Wilayah: "Bandung",
    }));
  await writeFile(`public/contoh/${m.file}`, "\uFEFF" + Papa.unparse(rows));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    m.kategori,
  );
}
const rows = tinjauan.map((t) => ({
  Deskripsi: t.deskripsi,
  Longitude: t.x,
  Latitude: t.y,
}));
await writeFile(
  "public/contoh/Data_Tinjauan_Campuran.csv",
  "\uFEFF" + Papa.unparse(rows),
);
await writeFile(
  "public/contoh/Koordinat_Tanpa_Deskripsi.csv",
  "\uFEFF" +
    Papa.unparse(
      rows
        .slice(0, 20)
        .map(({ Longitude, Latitude }) => ({ Longitude, Latitude })),
    ),
);
XLSX.utils.book_append_sheet(
  workbook,
  XLSX.utils.json_to_sheet(rows),
  "TINJAUAN",
);
await writeFile(
  "public/contoh/Simulasi_Multi_Sheet.xlsx",
  XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
);
console.log("6 berkas simulasi dibuat di public/contoh.");
