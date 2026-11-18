import { test, expect } from "@playwright/test";
test("kanvas peta memuat titik dan aset peta", async ({ page }) => {
  const failures: string[] = [];
  page.on("requestfailed", (r) => {
    if (r.url().includes("tile.openstreetmap.org"))
      failures.push(r.failure()?.errorText ?? r.url());
  });
  await page.request.post("/api/auth", { data: { demo: true } });
  await page.goto("/ruang-kerja?sesi=00000000-0000-4000-8000-000000000010");
  await expect(page.locator(".intro")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Peta koordinat interaktif" }),
  ).toHaveAttribute("data-ready", "true", { timeout: 30000 });
  await expect(page.locator(".legend-count")).toHaveText(
    /^[1-9]\d* titik dalam tampilan$/,
    { timeout: 30000 },
  );
  await expect(page.locator(".data-row").first()).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Peta koordinat interaktif" }),
  ).toHaveAttribute("data-tiles-ready", "true", { timeout: 30000 });
  await expect(page.locator(".intro")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/kanvas-final.png",
    fullPage: true,
  });
  console.log("Kegagalan tile:", failures);
});
