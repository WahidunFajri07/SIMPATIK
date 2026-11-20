import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import * as XLSX from "xlsx";

test.use({ baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000" });

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 375, height: 667 },
]) {
  test(`koreksi latitude baris 429 dan modal tanpa overflow (${viewport.width}px)`, async ({
    page,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    // Sesi lokal khusus pengujian UI; semua endpoint data di bawah dimock.
    const secret =
      process.env.SESSION_SECRET ??
      parseEnv(readFileSync(".env", "utf8")).SESSION_SECRET;
    if (!secret)
      throw new Error(
        "SESSION_SECRET diperlukan untuk sesi pengujian UI lokal.",
      );
    const payload = Buffer.from(
      JSON.stringify({
        email: "uji-impor@simpatik.test",
        exp: Date.now() + 600000,
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");
    await page.context().addCookies([
      {
        name: "simpatik-sesi",
        value: `${payload}.${signature}`,
        url: baseURL!,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const sesi = {
      id: "00000000-0000-4000-8000-000000000001",
      nama: "Uji impor",
      masterIds: ["m1"],
      toleransi: 15,
      total: 5586,
      akurat: 0,
      tinjau: 5586,
      dikonfirmasi: 0,
      dibuat: new Date().toISOString(),
    };
    const batches: { titik: { x: number; y: number }[] }[] = [];
    await page.route("**/api/master", (route) =>
      route.fulfill({
        json: {
          mode: "postgis",
          masters: [
            {
              id: "m1",
              nama: "Trafo-Master",
              kategori: "TRAFO",
              file: "uji.xlsx",
              total: 5589,
              dibuat: sesi.dibuat,
            },
          ],
        },
      }),
    );
    await page.route("**/api/sesi*", (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has("id")
          ? { sesi, hasil: [] }
          : { sesi: [] },
      }),
    );
    await page.route("**/api/titik-peta*", (route) =>
      route.fulfill({ json: { points: [], terbatas: false } }),
    );
    await page.route("**/api/cocokkan", async (route) => {
      batches.push(route.request().postDataJSON());
      await route.fulfill({ json: sesi });
    });
    await page.goto("/ruang-kerja?baru=1");
    await expect(page.locator(".intro")).toHaveCount(0);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const wb = XLSX.utils.book_new();
    const rows = Array.from({ length: 5586 }, (_, i) => ({
      description: `T${i}`,
      longitudex: 108.545097,
      latitudey: i === 427 ? -6697219 : -6.697219,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows.slice(0, 3)),
      "data master",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      "data pembanding",
    );
    await page.getByLabel("Pilih file data").setInputFiles({
      name: "uji-koordinat-dengan-nama-file-yang-panjang.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
    });
    await dialog
      .getByRole("combobox", { name: "Sheet", exact: true })
      .selectOption("data pembanding");
    const masalah = dialog.getByRole("region", { name: "Pemeriksaan data" });
    await expect(masalah).toContainText("1 baris perlu diperbaiki");
    await expect(masalah.getByLabel("Latitude baris 429")).toHaveValue(
      "-6697219",
    );
    const proses = dialog.getByRole("button", {
      name: "Mulai pencocokan",
      exact: true,
    });
    await expect(proses).toBeInViewport();
    await proses.click();
    expect(batches).toHaveLength(0);
    await expect(dialog.getByRole("alert")).toContainText("Pemeriksaan data");
    await masalah.getByLabel("Latitude baris 429").fill("");
    await masalah
      .getByRole("button", { name: "Terapkan koreksi baris 429" })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Koordinat tidak valid",
    );
    await masalah.getByLabel("Latitude baris 429").fill("-6.697219");
    await expect(masalah).toBeVisible();
    await expect(proses).toBeInViewport();
    await page.screenshot({
      path: `test-results/koreksi-impor-${viewport.width}.png`,
    });
    for (const selector of [".modal-content", ".modal-body"]) {
      const elemen =
        selector === ".modal-content" ? dialog : dialog.locator(selector);
      const ukuran = await elemen.evaluate((el) => ({
        lebar: el.clientWidth,
        isi: el.scrollWidth,
        meluap: [...el.querySelectorAll("*")]
          .filter(
            (child) =>
              child.getBoundingClientRect().right >
              el.getBoundingClientRect().right + 1,
          )
          .slice(0, 10)
          .map((child) => ({
            tag: child.tagName,
            kelas: child.className,
            lebar: child.clientWidth,
          })),
      }));
      expect(
        ukuran.isi,
        `${selector}: ${JSON.stringify(ukuran)}`,
      ).toBeLessThanOrEqual(ukuran.lebar + 1);
    }
    await masalah
      .getByRole("button", { name: "Terapkan koreksi baris 429" })
      .click();
    await expect(masalah).toHaveCount(0);
    await expect(dialog.getByRole("status")).toContainText(
      "1 baris sudah dikoreksi",
    );
    await proses.click();
    await expect(dialog).toHaveCount(0);
    expect(batches.map((b) => b.titik.length)).toEqual([2500, 2500, 586]);
    const semua = batches.flatMap((b) => b.titik);
    expect(semua).toHaveLength(5586);
    expect(semua[427].y).toBe(-6.697219);
    expect(
      semua.every((t) => Math.abs(t.x) <= 180 && Math.abs(t.y) <= 90),
    ).toBe(true);
  });
}
