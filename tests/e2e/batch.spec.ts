import { test, expect } from "@playwright/test";
test("impor 2.501 baris, tukar sumbu, dan lanjutkan batch gagal tanpa duplikasi", async ({
  page,
}) => {
  await page.request.post("/api/auth", { data: { demo: true } });
  await page.goto("/gudang-master");
  await expect(page.locator(".intro")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tambah master", exact: true })
    .click();
  const data =
    "Deskripsi,Longitude,Latitude\n" +
    Array.from(
      { length: 2501 },
      (_, i) =>
        `BATCH-${i}A,${i === 0 ? -6.9 : 107.6},${i === 0 ? 107.6 : -6.9}`,
    ).join("\n");
  await page
    .getByLabel("Pilih file data")
    .setInputFiles({
      name: "Uji_Batch_2501.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(data),
    });
  await expect(
    page.getByRole("combobox", { name: "X · Longitude" }),
  ).toHaveValue("Longitude");
  let failed = false;
  const sizes: number[] = [];
  await page.route("**/api/master", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const payload = route.request().postDataJSON();
    sizes.push(payload.titik.length);
    if (payload.id && !failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gangguan koneksi simulasi." }),
      });
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Simpan master", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Gangguan koneksi simulasi.",
  );
  await page
    .getByRole("button", { name: "Simpan master", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(sizes).toEqual([2500, 1, 1]);
  const m = (await (await page.request.get("/api/master")).json()).masters.find(
    (m: { nama: string }) => m.nama === "Uji Batch 2501",
  );
  expect(m.total).toBe(2501);
  await expect(page.getByRole("status")).toContainText(
    "1 koordinat X/Y tertukar",
  );
});
