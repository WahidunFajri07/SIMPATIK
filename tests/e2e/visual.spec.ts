import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { masuk } from "./masuk";
test("kanvas peta memuat titik dan aset peta", async ({ page, request }) => {
  const failures: string[] = [];
  page.on("requestfailed", (r) => {
    if (r.url().includes("tile.openstreetmap.org"))
      failures.push(r.failure()?.errorText ?? r.url());
  });
  await masuk(request);
  await masuk(page);
  // Sesi deterministik: 5 titik master dan 5 titik tinjauan di koordinat sama.
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Peta E2E ${Date.now()}`,
        kategori: "TRAFO",
        file: "peta-e2e.csv",
        titik: Array.from({ length: 5 }, (_, i) => ({
          deskripsi: `PETA-${i + 1}A`,
          x: 107.6 + i * 0.001,
          y: -6.91,
        })),
      },
    })
  ).json();
  const sesi = await (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `Peta E2E ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: Array.from({ length: 5 }, (_, i) => ({
          deskripsi: `PETA-${i + 1}A`,
          x: 107.6 + i * 0.001,
          y: -6.91,
        })),
      },
    })
  ).json();
  await page.goto(`/ruang-kerja?sesi=${sesi.id}`);
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Peta koordinat interaktif" }),
  ).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator(".legend-count")).toHaveText(
    /^[1-9]\d* titik dalam tampilan$/,
    { timeout: 30000 },
  );
  await expect(page.locator(".data-row").first()).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Peta koordinat interaktif" }),
  ).toHaveAttribute("data-tiles-ready", "true", { timeout: 30000 });
  // Chip koordinat dan legenda tidak boleh bertumpuk.
  const chip = await page.locator(".map-location").boundingBox();
  const legend = await page.locator(".map-legend").boundingBox();
  expect(chip && legend && legend.y >= chip.y + chip.height).toBeTruthy();
  await page.screenshot({
    path: "test-results/kanvas-final.png",
    fullPage: true,
  });
  expect(failures).toEqual([]);
});