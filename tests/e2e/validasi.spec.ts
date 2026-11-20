import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("halaman validasi menampilkan hanya titik belum ditinjau dan aksi massal", async ({
  page,
}) => {
  await masuk(page);
  await page.goto("/validasi");
  await expect(page.getByRole("heading", { name: "Validasi tanpa buka satu per satu." })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Pilih sesi validasi" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Pilih semua hasil yang terlihat" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Jumlah baris" })).toHaveValue("25");
  await expect(page.getByRole("spinbutton", { name: "Nomor halaman" })).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Konfirmasi valid" })).toHaveCount(0);
});
