import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";
import * as XLSX from "xlsx";
test("fase 4–5: pencocokan, peta, konfirmasi, ekspor dan riwayat", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Data_Tinjauan_Campuran.csv");
  await expect(
    page.getByRole("textbox", { name: "Nama sesi", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Nama sesi", exact: true })
    .fill("Audit E2E Campuran");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "101");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page.screenshot({
    path: "test-results/ruang-kerja.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Kandidat terdekat/ }).click();
  await page.locator(".data-row").first().click();
  await expect(
    page.getByRole("complementary", { name: "Inspeksi titik" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lihat detail", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pakai koordinat master", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Konfirmasi titik B valid", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lihat detail", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Kembalikan kartu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Kembalikan kartu", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lihat detail", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Terima deskripsi master", exact: true })
    .click();
  await expect(page.locator(".confirmation-saved")).toContainText(
    "Terima deskripsi master",
  );
  await page.getByRole("button", { name: "Tutup inspeksi" }).click();
  await page.getByRole("button", { name: /Perlu koreksi/ }).click();
  await page.locator(".data-row").first().click();
  await page
    .getByRole("button", { name: "Pakai koordinat master", exact: true })
    .click();
  await expect(page.locator(".confirmation-saved")).toContainText(
    "Pakai koordinat master",
  );
  await page.screenshot({ path: "test-results/inspeksi.png", fullPage: true });
  const id = new URL(page.url()).searchParams.get("sesi");
  const r = await page.request.get(`/api/konfirmasi?sesiId=${id}&format=xlsx`);
  expect(r.ok()).toBeTruthy();
  const wb = XLSX.read(await r.body(), { type: "buffer" });
  expect(wb.SheetNames).toEqual([
    "Ringkasan Audit",
    "Audit Trail Transparansi",
    "Data Final Siap Pakai",
  ]);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets["Audit Trail Transparansi"],
  );
  expect(rows).toHaveLength(100);
  const finalRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets["Data Final Siap Pakai"],
  );
  expect(finalRows).toHaveLength(100);
  expect(Object.keys(finalRows[0])).toEqual([
    "Deskripsi Final",
    "Koordinat X Final",
    "Koordinat Y Final",
    "Status Akhir",
  ]);
  const ringkasan = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets["Ringkasan Audit"],
  );
  expect(ringkasan.find((r) => r.Keterangan === "Nama Sesi")?.Nilai).toBe(
    "Audit E2E Campuran",
  );
  expect(
    ringkasan.some((r) => String(r.Keterangan).startsWith("Akurat")),
  ).toBeTruthy();
  expect(
    rows.some(
      (r) =>
        r.Keputusan === "PAKAI_KOORDINAT_MASTER" &&
        r["Koordinat Hasil X"] === r["Koordinat A X"],
    ),
  ).toBeTruthy();
  expect(
    rows.some((r) => r.Keputusan === "TERIMA_DESKRIPSI_MASTER"),
  ).toBeTruthy();
  const csv = await page.request.get(`/api/konfirmasi?sesiId=${id}&format=csv`);
  expect(await csv.text()).toContain("Koordinat Hasil X");
  const kml = await page.request.get(`/api/konfirmasi?sesiId=${id}&format=kml`);
  expect(kml.ok()).toBeTruthy();
  const kmlText = await kml.text();
  expect(kmlText).toContain("<Placemark>");
  expect(kmlText).toContain("<coordinates>");
  const gj = await page.request.get(
    `/api/konfirmasi?sesiId=${id}&format=geojson`,
  );
  expect(gj.ok()).toBeTruthy();
  const fc = await gj.json();
  expect(fc.type).toBe("FeatureCollection");
  expect(fc.features).toHaveLength(100);
  expect(fc.features[0].geometry.type).toBe("Point");
  expect(
    (
      await page.request.get(`/api/konfirmasi?sesiId=${id}&format=shp`)
    ).status(),
  ).toBe(400);
  await page.goto("/riwayat");
  await expect(
    page.getByRole("heading", { name: "Audit E2E Campuran" }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("data B hanya koordinat dan tampilan seluler", async ({ page }) => {
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await expect(page.locator(".intro")).toHaveCount(0);
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Koordinat_Tanpa_Deskripsi.csv");
  await expect(
    page.getByRole("combobox", { name: "Deskripsi / kode unik" }),
  ).toHaveValue("");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "21");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/seluler.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/masuk/);
});
