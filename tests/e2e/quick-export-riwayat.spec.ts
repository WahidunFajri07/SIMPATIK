import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("riwayat memakai satu quick export dinamis", async ({ page }) => {
  await masuk(page);
  await page.goto("/riwayat");
  const quick = page.getByRole("button", { name: /Export Cepat/ }).first();
  await expect(quick).toBeVisible();
  await quick.click();
  const menu = page.locator(".quick-export-menu").first();
  await expect(menu).toBeVisible();
  await expect(menu.getByLabel("Format ekspor")).toBeVisible();
  await expect(menu.getByLabel("Status ekspor")).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(1);

  await menu.getByLabel("Format ekspor").selectOption("csv");
  await menu
    .getByLabel("Status ekspor")
    .selectOption("PERLU_KOREKSI_JARAK");
  const filtered = menu.getByRole("link", { name: /Unduh CSV/ });
  await expect(filtered).toBeVisible();
  expect(await filtered.getAttribute("href")).toContain("format=csv");
  expect(await filtered.getAttribute("href")).toContain(
    "status=PERLU_KOREKSI_JARAK",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const box = await menu.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);

  await menu.getByLabel("Status ekspor").click();
  await expect(menu).toBeVisible();
  await page.locator(".collection-body").click({ position: { x: 5, y: 5 } });
  await expect(menu).toHaveCount(0);
});
