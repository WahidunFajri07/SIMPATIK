import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "node:util";
import nextEnv from "@next/env";
import { amankanEnv } from "../scripts/lib/amankan-env";
import { cocokAdminEnv } from "../src/lib/admin-env";
import { cocokSandi } from "../src/lib/akun";

test("sandi polos dimigrasi; login memakai hash setelah env dibaca Node dan Next.js", async () => {
  const input =
    '# pengaturan lokal\nDATABASE_URL="postgresql://contoh:contoh@localhost/uji"\nADMIN_EMAIL=admin@example.test\nADMIN_PASSWORD="uji-$-aman-123"\nSESSION_SECRET=\n';
  const { teks, adminSiap } = await amankanEnv(input);
  const env = parseEnv(teks);
  assert.equal(adminSiap, true);
  assert.equal(env.DATABASE_URL, parseEnv(input).DATABASE_URL);
  assert.equal(env.ADMIN_PASSWORD, undefined);
  assert.ok(!teks.includes("uji-$-aman-123"));
  assert.ok((env.SESSION_SECRET?.length ?? 0) >= 32);
  assert.equal(
    await cocokAdminEnv("admin@example.test", "uji-$-aman-123", env),
    true,
  );
  assert.equal(await cocokAdminEnv("admin@example.test", "salah", env), false);
  assert.equal(
    await cocokAdminEnv("lain@example.test", "uji-$-aman-123", env),
    false,
  );

  // Pastikan ekspansi '$' milik Next.js tidak merusak hash di .env.
  const sebelumnya = { ...process.env };
  try {
    const [, parsed] = nextEnv.processEnv(
      [{ path: ".env", contents: teks, env: {} }],
      undefined,
      undefined,
      true,
    );
    assert.equal(parsed.ADMIN_PASSWORD_HASH, env.ADMIN_PASSWORD_HASH);
    assert.equal(
      await cocokSandi("uji-$-aman-123", parsed.ADMIN_PASSWORD_HASH!),
      true,
    );
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in sebelumnya)) delete process.env[key];
    Object.assign(process.env, sebelumnya);
  }
});

test("konfigurasi hash tetap stabil, dan sandi polos tanpa hash tidak diterima", async () => {
  const pertama = await amankanEnv("ADMIN_EMAIL=admin@example.test\n", {
    email: "baru@example.test",
    sandi: "sandi-baru-123",
  });
  const kedua = await amankanEnv(pertama.teks);
  assert.equal(kedua.teks, pertama.teks);
  assert.equal(
    await cocokAdminEnv(
      "baru@example.test",
      "sandi-baru-123",
      parseEnv(kedua.teks),
    ),
    true,
  );
  const lama = parseEnv(
    "ADMIN_EMAIL=admin@example.test\nADMIN_PASSWORD=sandi-polos-123",
  );
  assert.equal(
    await cocokAdminEnv("admin@example.test", "sandi-polos-123", lama),
    false,
  );
});

test("password kosong, lemah, hash rusak, dan konfigurasi admin kosong ditolak", async () => {
  assert.equal(
    await cocokAdminEnv("admin@example.test", "apa saja", {}),
    false,
  );
  assert.equal(
    await cocokAdminEnv("admin@example.test", "apa saja", {
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD_HASH: "rusak",
    }),
    false,
  );
  await assert.rejects(amankanEnv("ADMIN_PASSWORD=pendek\n"), /8–256/);
  await assert.rejects(
    amankanEnv("", { email: "bukan-email", sandi: "sandi-kuat-123" }),
    /email/,
  );
  const kosong = parseEnv((await amankanEnv("ADMIN_PASSWORD=\n")).teks);
  assert.equal(kosong.ADMIN_PASSWORD_HASH, "");
});

test("migrasi menghapus password multi-baris dan assignment duplikat", async () => {
  const { teks } = await amankanEnv(
    'ADMIN_PASSWORD="sandi\nlama-123"\nADMIN_PASSWORD="sandi-akhir-123"\n',
  );
  assert.ok(!teks.includes("sandi"));
  assert.equal(parseEnv(teks).ADMIN_PASSWORD, undefined);
  const hash = parseEnv(teks).ADMIN_PASSWORD_HASH;
  assert.ok(hash);
  assert.equal(await cocokSandi("sandi-akhir-123", hash), true);
});
