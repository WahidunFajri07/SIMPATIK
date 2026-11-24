import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { masuk } from "./masuk";

// Fokus: pergantian gaya peta dasar (OSM <-> citra Esri) tidak boleh
// membuat kanvas kosong ("Map data not available").
test("ganti gaya peta dasar tetap memuat tile", async ({ page, request }) => {
  await masuk(request);
  await masuk(page);
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Gaya Peta E2E ${Date.now()}`,
        kategori: "TRAFO",
        file: "gaya-peta.csv",
        titik: [{ deskripsi: "GAYA-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  const sesi = await (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `Gaya Peta E2E ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: [{ deskripsi: "GAYA-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  await page.goto(`/ruang-kerja?sesi=${sesi.id}`);
  await expect(page.locator(".intro")).toHaveCount(0);
  const peta = page.getByRole("region", { name: "Peta koordinat interaktif" });
  await expect(peta).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(peta).toHaveAttribute("data-tiles-ready", "true", {
    timeout: 30000,
  });

  const esriResponses: { status: number; contentType: string }[] = [];
  page.on("response", (response) => {
    if (response.url().includes("arcgisonline.com"))
      esriResponses.push({
        status: response.status(),
        contentType: response.headers()["content-type"] ?? "",
      });
  });
  const esriFailed: string[] = [];
  page.on("requestfailed", (r) => {
    if (r.url().includes("arcgisonline.com"))
      esriFailed.push(r.failure()?.errorText ?? r.url());
  });

  await page.getByRole("button", { name: "Ubah peta dasar" }).click();
  await expect(page.locator(".map-attribution")).toContainText("Esri");
  await expect
    .poll(() => esriResponses.length, { timeout: 30000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(2500);
  await expect(peta).toHaveAttribute("data-tiles-ready", "true");
  expect(await page.locator(".map-attribution").innerText()).toContain("Esri");
  expect(esriResponses.every((tile) => tile.status === 200)).toBeTruthy();
  expect(
    esriResponses.every((tile) => tile.contentType.includes("image")),
  ).toBeTruthy();
  expect(esriFailed).toEqual([]);
  await page.screenshot({
    path: "test-results/peta-gaya-esri.png",
    fullPage: true,
  });
});

test("osm gagal lalu peta otomatis beralih ke citra Esri", async ({
  page,
  request,
}) => {
  await masuk(request);
  await masuk(page);
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `Fallback Peta E2E ${Date.now()}`,
        kategori: "TRAFO",
        file: "fallback-peta.csv",
        titik: [{ deskripsi: "FALLBACK-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  const sesi = await (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `Fallback Peta E2E ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: [{ deskripsi: "FALLBACK-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort("failed"),
  );
  await page.goto(`/ruang-kerja?sesi=${sesi.id}`);
  await expect(page.locator(".intro")).toHaveCount(0);
  const peta = page.getByRole("region", { name: "Peta koordinat interaktif" });
  await expect(peta).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator(".map-attribution")).toContainText("Esri", {
    timeout: 30000,
  });
  await expect(peta).toHaveAttribute("data-tiles-ready", "true", {
    timeout: 30000,
  });
});
