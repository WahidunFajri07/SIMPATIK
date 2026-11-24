import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import { masuk } from "./masuk";

async function bukaPeta(page: Page, request: APIRequestContext) {
  await masuk(request);
  await masuk(page);
  const master = await (
    await request.post("/api/master", {
      data: {
        batchId: randomUUID(),
        nama: `HUD Peta E2E ${Date.now()}`,
        kategori: "TRAFO",
        file: "hud-peta.csv",
        titik: [{ deskripsi: "HUD-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  const sesi = await (
    await request.post("/api/cocokkan", {
      data: {
        batchId: randomUUID(),
        nama: `HUD Peta E2E ${Date.now()}`,
        masterIds: [master.id],
        toleransi: 15,
        titik: [{ deskripsi: "HUD-1A", x: 107.6, y: -6.91 }],
      },
    })
  ).json();
  await page.goto(`/ruang-kerja?sesi=${sesi.id}`);
  await expect(page.locator(".intro")).toHaveCount(0);
  return page.getByRole("region", { name: "Peta koordinat interaktif" });
}

test("kanvas peta memiliki HUD cursor dan legenda ringkas", async ({
  page,
  request,
}) => {
  const peta = await bukaPeta(page, request);
  await expect(peta).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator(".workspace-caption")).toHaveCount(0);

  const hud = page.locator(".map-location");
  await expect(hud).toHaveClass(/map-cursor-hud/);
  const awal = await hud.innerText();
  const box = await peta.boundingBox();
  await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.4);
  await expect(hud).not.toHaveText(awal);
  await page.mouse.move(0, 0);
  await expect(hud).toContainText("WGS84");

  const legend = page.getByRole("button", { name: /Keterangan peta ·/ });
  await expect(legend).toBeVisible();
  await expect(page.getByText(/Legenda ·/)).toHaveCount(0);
  await expect(page.locator(".map-legend-details")).toHaveCount(0);
  await legend.click();
  await expect(page.locator(".map-legend-details")).toContainText("Master A");
  await expect(page.locator(".map-legend-details")).toContainText("Tinjauan B");
  await expect(page.locator(".map-legend-details")).toContainText(
    "Sudah dikonfirmasi",
  );

  await page.getByRole("button", { name: "Ubah peta dasar" }).click();
  await expect(peta).toHaveAttribute("data-map-mode", "satellite");
  await expect(page.locator(".map-readouts")).toHaveClass(/map-satellite/);
});
