import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { masuk } from "./masuk";

async function buatSesi(request: APIRequestContext) {
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Export Master ${Date.now()}`,
        kategori: "TRAFO",
        file: "export.csv",
        titik: [{ deskripsi: "EXPORT-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  return (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `Export / Filter ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: [
          { deskripsi: "EXPORT-1A", x: 107.6, y: -6.91 },
          { deskripsi: "EXPORT-NONE", x: 107.7, y: -6.8 },
        ],
      },
    })
  ).json();
}

async function ambilExport(
  request: APIRequestContext,
  sesiId: string,
  format: string,
  status?: string,
) {
  const query = new URLSearchParams({ sesiId, format });
  if (status) query.set("status", status);
  return request.get(`/api/konfirmasi?${query}`);
}

test("export status memfilter semua format dan mencatat metadata", async ({
  request,
}) => {
  await masuk(request);
  const sesi = await buatSesi(request);
  for (const format of ["csv", "kml", "geojson"]) {
    const response = await ambilExport(request, sesi.id, format, "AKURAT");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-disposition"]).toContain("_AKURAT.");
    const body = await response.text();
    expect(body).toContain("EXPORT-1A");
    expect(body).not.toContain("EXPORT-NONE");
  }

  const xlsx = await ambilExport(request, sesi.id, "xlsx", "AKURAT");
  expect(xlsx.ok()).toBeTruthy();
  expect(xlsx.headers()["content-disposition"]).toContain("_AKURAT.xlsx");
  const workbook = XLSX.read(await xlsx.body(), { type: "buffer" });
  const summary = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets["Ringkasan Audit"],
  );
  expect(summary.find((row) => row.Keterangan === "Filter Export")?.Nilai).toBe(
    "AKURAT",
  );
  const filteredRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets["Audit Trail Transparansi"],
  );
  expect(filteredRows).toHaveLength(1);

  const all = await ambilExport(request, sesi.id, "csv");
  expect(all.headers()["content-disposition"]).toContain("_SEMUA.csv");
  const allCsv = await all.text();
  expect(allCsv).toContain("EXPORT-1A");
  expect(allCsv).toContain("EXPORT-NONE");

  expect((await ambilExport(request, sesi.id, "csv", "INVALID")).status()).toBe(
    400,
  );
});

test("menu export ruang kerja membawa status filter aktif", async ({
  page,
  request,
}) => {
  await masuk(request);
  await masuk(page);
  const sesi = await buatSesi(request);
  await page.goto(`/ruang-kerja?sesi=${sesi.id}`);
  await expect(page.locator(".intro")).toHaveCount(0);
  const filter = page.locator('select[aria-label="Filter status"]');
  await filter.selectOption("AKURAT");
  await page.getByRole("button", { name: /Ekspor hasil/ }).click();
  await expect(
    page.getByRole("link", { name: /Export Sesuai Filter \(Akurat\)/ }).first(),
  ).toBeVisible();
  const filteredLink = page
    .getByRole("link", { name: /Export Sesuai Filter/ })
    .first();
  expect(await filteredLink.getAttribute("href")).toContain("status=AKURAT");
  await expect(
    page.getByRole("link", { name: /Export Semua Status/ }).first(),
  ).toBeVisible();
});
