import { test, expect } from "@playwright/test";
test("fase 3: impor multi-sheet dan pilih sumber", async ({ page }) => {
  await page.request.post("/api/auth", { data: { demo: true } });
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
    .fill("Master uji multi-sheet");
  await page
    .getByRole("combobox", { name: "Kategori", exact: true })
    .selectOption("DIL");
  await page.getByRole("button", { name: "Simpan master" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Master uji multi-sheet", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Pilih Master uji multi-sheet",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("button", { name: "Cocokkan data" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/gudang.png", fullPage: true });
});
