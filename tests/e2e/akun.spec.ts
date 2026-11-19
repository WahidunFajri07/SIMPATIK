import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const env = readFileSync(".env", "utf8");
const ambil = (k: string) =>
  env.match(new RegExp(`^${k}="?([^"\\n]*)`, "m"))?.[1] ?? "";
const sandiBaru = ["sandi", "baru", "5678"].join("-");
const masa = Date.now();

async function masukAdmin(request: import("@playwright/test").APIRequestContext) {
  await request.delete("/api/auth");
  expect(
    (
      await request.post("/api/auth", {
        data: {
          email: ambil("ADMIN_EMAIL"),
          password: ambil("ADMIN_PASSWORD"),
        },
      })
    ).ok(),
  ).toBeTruthy();
}

test("kelola akun: tambah, login, ubah, hapus", async ({ page, request }) => {
  await masukAdmin(request);
  const baru = {
    nama: "Uji Akun",
    email: `uji-${masa}@simpatik.test`,
    sandi: ["sandi", "uji", "1234"].join("-"),
  };
  const dibuat = await request.post("/api/akun", { data: baru });
  expect(dibuat.status()).toBe(201);
  const akun = (await dibuat.json()) as { id: string; email: string };

  // Email ganda ditolak
  expect((await request.post("/api/akun", { data: baru })).status()).toBe(409);
  // Sandi lemah dan email salah ditolak
  expect(
    (
      await request.post("/api/akun", {
        data: { nama: "Lemah", email: `l${masa}@s.test`, sandi: "1234" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/akun", {
        data: { nama: "Salah", email: "bukan-email", sandi: "cukuppanjang" },
      })
    ).status(),
  ).toBe(400);

  // Akun baru bisa login
  await request.delete("/api/auth");
  expect(
    (
      await request.post("/api/auth", {
        data: { email: baru.email, password: baru.sandi },
      })
    ).ok(),
  ).toBeTruthy();
  // Sandi salah ditolak
  expect(
    (
      await request.post("/api/auth", {
        data: { email: baru.email, password: ["salah", "sekali"].join("-") },
      })
    ).status(),
  ).toBe(401);

  // Admin .env mengubah nama dan sandi
  await masukAdmin(request);
  expect(
    (
      await request.patch("/api/akun", {
        data: { id: akun.id, nama: "Uji Akun Baru", sandi: sandiBaru },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await request.get("/api/akun")).ok(),
  ).toBeTruthy();

  // Sandi lama mati, sandi baru berlaku
  await request.delete("/api/auth");
  expect(
    (
      await request.post("/api/auth", {
        data: { email: baru.email, password: baru.sandi },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/auth", {
        data: { email: baru.email, password: sandiBaru },
      })
    ).ok(),
  ).toBeTruthy();

  // Akun kedua (bukan akun tertua) tidak boleh mengelola akun
  await masukAdmin(request);
  const kedua = {
    nama: "Akun Kedua",
    email: `dua-${masa}@simpatik.test`,
    sandi: ["sandi", "dua", "1234"].join("-"),
  };
  expect((await request.post("/api/akun", { data: kedua })).status()).toBe(201);
  await request.delete("/api/auth");
  await request.post("/api/auth", {
    data: { email: kedua.email, password: kedua.sandi },
  });
  expect((await request.get("/api/akun")).status()).toBe(403);
  expect((await request.post("/api/akun", { data: kedua })).status()).toBe(403);

  // Hapus akun, lalu login harus gagal
  await masukAdmin(request);
  expect((await request.delete(`/api/akun?id=${akun.id}`)).ok()).toBeTruthy();
  expect(
    (
      await request.post("/api/auth", {
        data: { email: baru.email, password: sandiBaru },
      })
    ).status(),
  ).toBe(401);
  // Id acak: 404, id bukan uuid: 400
  expect(
    (
      await request.delete(
        "/api/akun?id=00000000-0000-4000-8000-000000000099",
      )
    ).status(),
  ).toBe(404);
  expect((await request.delete("/api/akun?id=bukan-uuid")).status()).toBe(400);

  // Halaman akun tampil untuk admin
  await page.goto("/masuk");
  await page.getByLabel(/email/i).fill(ambil("ADMIN_EMAIL"));
  await page.getByLabel(/kata sandi/i).fill(ambil("ADMIN_PASSWORD"));
  await page.getByRole("button", { name: /masuk ke simpatik/i }).click();
  await page.waitForURL(/ruang-kerja/, { timeout: 30000 });
  await page.goto("/akun");
  await expect(
    page.getByRole("heading", { name: "Akun yang boleh masuk." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tambah akun" })).toBeVisible();
  await expect(page.getByText(kedua.email)).toBeVisible();

  // Bersihkan akun kedua
  await masukAdmin(request);
  const daftar = await (await request.get("/api/akun")).json();
  for (const a of daftar.akun as { id: string; email: string }[])
    if (a.email === kedua.email)
      await request.delete(`/api/akun?id=${a.id}`);
});

test("halaman akun menolak tamu", async ({ page }) => {
  await page.goto("/akun");
  await expect(page).toHaveURL(/masuk/);
});