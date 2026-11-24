import { test, expect, type Page } from "@playwright/test";
import { masuk } from "./masuk";

async function bukaDetail(page: Page) {
  const detail = page.getByRole("button", {
    name: "Lihat detail",
    exact: true,
  });
  await expect(detail).toBeVisible();
  await detail.click();
  await expect(
    page.getByRole("button", { name: "Kembalikan kartu", exact: true }),
  ).toBeVisible();
}

test("detail inspeksi menutup sebagian kecil dengan backdrop blur", async ({
  page,
}) => {
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Data_Tinjauan_Campuran.csv");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "101");
  await page.locator(".data-row").first().click();
  await bukaDetail(page);

  const viewport = page.viewportSize()!;
  const panel = page.locator(".inspection-card-detail");
  const backdrop = page.locator(".inspection-backdrop");
  await expect(panel).toBeVisible();
  await expect(backdrop).toBeVisible();

  const panelBox = await panel.boundingBox();
  const backdropBox = await backdrop.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(backdropBox).not.toBeNull();
  // Panel bounded, not fullscreen: narrower than viewport on desktop.
  expect(panelBox!.width).toBeLessThan(viewport.width);
  expect(panelBox!.height).toBeGreaterThan(0);
  // Backdrop covers viewport and is semi-transparent.
  expect(backdropBox!.width).toBeGreaterThanOrEqual(viewport.width);
  expect(backdropBox!.height).toBeGreaterThanOrEqual(viewport.height);
  const backdropStyle = await backdrop.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      className: el.className,
      background: s.backgroundColor,
    };
  });
  expect(backdropStyle.className).toBe("inspection-backdrop");
  expect(backdropStyle.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(backdropStyle.background).not.toBe("rgba(0, 0, 0, 1)");

  await expect(
    page.getByRole("button", { name: "Tutup inspeksi", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Kembalikan kartu", exact: true })
    .click();
  await expect(page.locator(".inspection-backdrop")).toHaveCount(0);
  await expect(page.locator(".inspection-card-detail")).toHaveCount(0);
});

test("detail inspeksi tetap layak di layar kecil", async ({ page }) => {
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Data_Tinjauan_Campuran.csv");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".data-row").first().click();
  await bukaDetail(page);

  const panel = page.locator(".inspection-card-detail");
  const backdrop = page.locator(".inspection-backdrop");
  await expect(panel).toBeVisible();
  await expect(backdrop).toBeVisible();

  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize()!;
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport.width);
  await expect(
    page.getByRole("button", { name: "Tutup inspeksi", exact: true }),
  ).toBeVisible();
});

test("detail inspeksi tidak berikan animasi bermakna saat reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await masuk(page);
  await page.goto("/ruang-kerja?baru=1");
  await page
    .getByLabel("Pilih file data")
    .setInputFiles("public/contoh/Data_Tinjauan_Campuran.csv");
  await page
    .getByRole("button", { name: "Mulai pencocokan", exact: true })
    .click();
  await page.locator(".data-row").first().click();
  await bukaDetail(page);

  const detail = page.locator(".inspection-card-detail");
  const duration = await detail.evaluate((el) => {
    const s = getComputedStyle(el);
    return s.transitionDuration || "0s";
  });
  expect(duration).toBe("0s");
  await expect(
    page.getByRole("button", { name: "Kembalikan kartu", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Tutup inspeksi", exact: true })
    .click();
  await expect(page.locator(".inspection-card-detail")).toHaveCount(0);
});
