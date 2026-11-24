import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("riwayat menyediakan quick export per format dan status", async ({
  page,
}) => {
  await masuk(page);
  await page.goto("/riwayat");
  const quick = page.getByRole("button", { name: /Export Cepat/ }).first();
  await expect(quick).toBeVisible();
  await quick.click();
  const menu = page.locator(".quick-export-menu").first();
  await expect(menu).toContainText("Excel 3-Sheet");
  await expect(menu).toContainText("CSV");
  await expect(menu).toContainText("KML");
  await expect(menu).toContainText("GeoJSON");
  const filtered = menu.getByRole("link", { name: /CSV · Perlu koreksi/ });
  await expect(filtered).toBeVisible();
  expect(await filtered.getAttribute("href")).toContain("format=csv");
  expect(await filtered.getAttribute("href")).toContain(
    "status=PERLU_KOREKSI_JARAK",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
