import { test, expect } from "@playwright/test";
test("fase 1–2: status, intro dan login demo", async ({ page, request }) => {
  expect((await request.get("/api/status")).ok()).toBeTruthy();
  expect((await request.get("/api/master")).status()).toBe(401);
  await page.goto("/masuk");
  await expect(
    page.getByRole("heading", { name: "Masuk ke ruang kerja" }),
  ).toBeVisible();
  await expect(page.locator(".intro")).toHaveCount(0);
  await page.screenshot({ path: "test-results/masuk.png", fullPage: true });
  await page.getByRole("button", { name: "Buka ruang demo" }).click();
  await expect(page).toHaveURL(/ruang-kerja/);
  await expect(
    page.getByRole("navigation", { name: "Navigasi utama" }),
  ).toBeVisible();
});
