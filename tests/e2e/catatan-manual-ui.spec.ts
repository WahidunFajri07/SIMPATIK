import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("catatan manual tersedia di kartu inspeksi dan tabel", async ({
  page,
}) => {
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
  await page.locator(".data-row").first().click();

  const note = page.getByLabel("Keterangan (Opsional — untuk Export)");
  await expect(note).toBeVisible();
  await note.fill("Catatan mentor");
  await page.getByRole("button", { name: "Simpan keterangan" }).click();
  await expect(page.locator(".confirmation-saved")).toContainText(
    "Catatan mentor",
  );

  await expect(
    page.getByRole("columnheader", { name: "Keterangan", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".data-row").first()).toContainText(
    "Catatan mentor",
  );

  await page.getByRole("button", { name: /Ekspor hasil/ }).click();
  const autoFill = page.getByLabel(
    "Isi Keterangan kosong dengan Status Sistem",
  );
  await expect(autoFill).not.toBeChecked();
  await autoFill.check();
  expect(
    await page
      .getByRole("link", { name: /Export Sesuai Filter/ })
      .first()
      .getAttribute("href"),
  ).toContain("isiKeteranganOtomatis=true");
});
