import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { masuk } from "./masuk";

async function sesi(request: APIRequestContext) {
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Baku Master ${Date.now()}`,
        kategori: "TRAFO",
        file: "baku.csv",
        titik: [{ deskripsi: "BAKU-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  return (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `Baku Export ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: [{ deskripsi: "BAKU-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
}

test("export menghasilkan format baku mentor", async ({ request }) => {
  await masuk(request);
  const s = await sesi(request);
  const xlsx = await request.get(
    `/api/konfirmasi?sesiId=${s.id}&format=xlsx&isiKeteranganOtomatis=true`,
  );
  expect(xlsx.ok()).toBeTruthy();
  const workbook = XLSX.read(await xlsx.body(), {
    type: "buffer",
    cellStyles: true,
  });
  expect(workbook.SheetNames).toEqual([
    "Hasil Pencocokan",
    "Data Final Siap Pakai",
    "Ringkasan Audit",
  ]);
  const bakuRows = XLSX.utils.sheet_to_json<string[]>(
    workbook.Sheets["Hasil Pencocokan"],
    { header: 1, defval: "" },
  );
  expect(bakuRows[0]).toEqual([
    "Deskripsi A",
    "Koordinat A X",
    "Koordinat A Y",
    "Keterangan",
    "Jarak (m)",
    "Deskripsi B",
    "Koordinat B X",
    "Koordinat B Y",
  ]);
  expect(bakuRows[1][3]).toBe("Akurat");
  expect(
    XLSX.utils.sheet_to_json(workbook.Sheets["Data Final Siap Pakai"], {
      header: 1,
      defval: "",
    })[0],
  ).toEqual([
    "Deskripsi Final",
    "Koordinat X Final",
    "Koordinat Y Final",
    "Status Pencocokan",
    "Keputusan",
    "Sumber Master",
    "Keterangan",
  ]);
  const summary = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets["Ringkasan Audit"],
  );
  expect(summary.some((r) => r.Kategori === "Tanggal Export")).toBeTruthy();
  const akurat = summary.find((r) => r.Kategori === "Akurat");
  expect(typeof akurat?.Jumlah).toBe("number");
  expect(typeof akurat?.Persentase).toBe("number");
  expect(
    Object.values(workbook.Sheets["Ringkasan Audit"]).some(
      (cell) =>
        typeof cell === "object" &&
        cell !== null &&
        "z" in cell &&
        (cell as { z?: string }).z === "0.00%",
    ),
  ).toBeTruthy();

  const csv = await request.get(`/api/konfirmasi?sesiId=${s.id}&format=csv`);
  const header = (await csv.text())
    .split("\n")[0]
    .replace(/^﻿/, "")
    .replace(/\r$/, "");
  expect(header).toBe(
    "Deskripsi A,Koordinat A X,Koordinat A Y,Keterangan,Jarak (m),Deskripsi B,Koordinat B X,Koordinat B Y",
  );
});
