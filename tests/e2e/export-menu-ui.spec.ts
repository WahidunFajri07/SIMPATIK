import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("ruang kerja menata menu ekspor dan urutan kolom", async ({ page }) => {
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await expect(page.locator(".intro")).toHaveCount(0);
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Data_Tinjauan_Campuran.csv");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const headers = page.getByRole("columnheader");
  await expect(headers.nth(3)).toHaveText("Status");
  await expect(headers.nth(4)).toHaveText("Keterangan");
  await expect(headers.nth(5)).toHaveText("Jarak (m)");
  await expect(page.getByRole("columnheader", { name: "Keterangan status" })).toHaveCount(0);

  await page.getByRole("button", { name: /Ekspor hasil/ }).click();
  const menu = page.locator(".export-menu");
  await expect(menu.getByLabel("Format ekspor")).toBeVisible();
  await expect(menu.getByLabel("Status ekspor")).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(1);
  await expect(menu).toHaveCSS("overflow-y", "auto");
  await expect(menu.getByLabel("Format ekspor")).toHaveValue("xlsx");
  await menu.getByLabel("Format ekspor").click();
  await expect(menu).toBeVisible();
  await page.locator(".table-toolbar").click({ position: { x: 5, y: 5 } });
  await expect(menu).toHaveCount(0);

  const sessionButton = page.getByRole("button", { name: /SESI AKTIF/ });
  await sessionButton.click();
  await expect(page.locator(".session-menu")).toBeVisible();
  await page.getByRole("region", { name: "Peta koordinat interaktif" }).click({
    position: { x: 10, y: 10 },
  });
  await expect(page.locator(".session-menu")).toHaveCount(0);
});
