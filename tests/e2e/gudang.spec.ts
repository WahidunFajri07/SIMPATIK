import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";
test("fase 3: impor multi-sheet dan pilih sumber", async ({ page }) => {
  await masuk(page);
  // Nama unik: database menyimpan data antar run, nama tetap akan menumpuk.
  const nama = `Master uji ${Date.now()}`;
  await page.goto("/gudang-master");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(page.locator(".master-card").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Tambah master", exact: true })
    .click();
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Simulasi_Multi_Sheet.xlsx");
  await expect(
    page.getByRole("combobox", { name: "Sheet", exact: true }),
  ).toHaveValue("TRAFO");
  await page
    .getByRole("combobox", { name: "Sheet", exact: true })
    .selectOption("DIL");
  await expect(
    page.getByText("120 baris · 4 kolom", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nama master", { exact: true })
    .fill(nama);
  await page
    .getByRole("combobox", { name: "Kategori", exact: true })
    .selectOption("DIL");
  await page.getByRole("button", { name: "Simpan master" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: nama, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: `Pilih ${nama}`,
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("button", { name: "Cocokkan data" }),
  ).toBeVisible();
  // CRUD kartu: ubah nama, lalu hapus.
  await page.getByRole("button", { name: `Ubah ${nama}` }).click();
  const ubah = page.getByRole("dialog");
  await expect(ubah).toBeVisible();
  await ubah.getByLabel("Nama master").fill(`${nama} revisi`);
  await ubah.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(ubah).toHaveCount(0);
  const namaBaru = `${nama} revisi`;
  await expect(
    page.getByRole("heading", { name: namaBaru, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Hapus ${namaBaru}` }).click();
  const konfirmasi = page.getByRole("dialog");
  await expect(konfirmasi.getByText(/titik koordinat ikut terhapus/)).toBeVisible();
  await konfirmasi.getByRole("button", { name: /Hapus permanen/ }).click();
  await expect(konfirmasi).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: namaBaru, exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/gudang.png", fullPage: true });
});
