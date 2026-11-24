import { test, expect } from "@playwright/test";
import { masuk } from "./masuk";

test("filter status mengendalikan tabel dan request peta", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "101");

  const filter = page.locator('select[aria-label="Filter status"]');
  await expect(filter).toBeVisible();
  const filteredRequest = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/titik-peta" &&
        url.searchParams.get("status") === "PERLU_KOREKSI_JARAK"
      );
    },
    { timeout: 15000 },
  );
  await filter.selectOption("PERLU_KOREKSI_JARAK");
  await filteredRequest;
  const rows = page.locator(".data-row");
  for (const row of await rows.all()) {
    await expect(row.locator(".status-badge")).toHaveText("Perlu koreksi");
  }
  await expect(
    page.getByRole("gridcell").filter({ hasText: "Akurat" }),
  ).toHaveCount(0);

  const unfilteredRequest = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return (
        url.pathname === "/api/titik-peta" && !url.searchParams.has("status")
      );
    },
    { timeout: 15000 },
  );
  await filter.selectOption("SEMUA");
  await unfilteredRequest;
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "101");
  expect(errors).toEqual([]);
});
