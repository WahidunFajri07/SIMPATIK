import { test, expect } from "@playwright/test";
import { envVar } from "./masuk";
test("fase 1–2: status, halaman masuk, dan login admin", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/status")).ok()).toBeTruthy();
  expect((await request.get("/api/master")).status()).toBe(401);
  await page.goto("/masuk");
  await expect(
    page.getByRole("heading", { name: "Masuk ke ruang kerja" }),
  ).toBeVisible();
  await expect(page.locator(".intro")).toHaveCount(0);
  // Mode database: akun demo tidak boleh tersedia.
  await expect(
    page.getByRole("button", { name: "Buka ruang demo" }),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/masuk.png", fullPage: true });
  await page.getByLabel(/email/i).fill(envVar("ADMIN_EMAIL"));
  await page.getByLabel(/kata sandi/i).fill(envVar("ADMIN_PASSWORD"));
  await page.getByRole("button", { name: /masuk ke simpatik/i }).click();
  await expect(page).toHaveURL(/ruang-kerja/);
  await expect(
    page.getByRole("navigation", { name: "Navigasi utama" }),
  ).toBeVisible();
});
test("sandi salah ditolak", async ({ page }) => {
  await page.goto("/masuk");
  await page.getByLabel(/email/i).fill(envVar("ADMIN_EMAIL"));
  await page.getByLabel(/kata sandi/i).fill(["salah", "total", "123"].join("-"));
  await page.getByRole("button", { name: /masuk ke simpatik/i }).click();
  await expect(page.locator(".error")).toContainText(
    "Email atau kata sandi tidak sesuai.",
  );
  await expect(page).toHaveURL(/masuk/);
});