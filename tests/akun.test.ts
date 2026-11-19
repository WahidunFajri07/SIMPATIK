import { test } from "node:test";
import assert from "node:assert/strict";
import { cocokSandi, hashSandi, validasiAkun } from "../src/lib/akun";

test("kata sandi di-hash dengan salt berbeda setiap kali", async () => {
  const a = await hashSandi("rahasia123"),
    b = await hashSandi("rahasia123");
  assert.notEqual(a, b);
  assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.ok(!a.includes("rahasia123"));
});

test("hanya kata sandi benar yang cocok", async () => {
  const hash = await hashSandi("rahasia123");
  assert.equal(await cocokSandi("rahasia123", hash), true);
  assert.equal(await cocokSandi("rahasia124", hash), false);
  assert.equal(await cocokSandi("", hash), false);
});

test("hash rusak atau bukan skema scrypt ditolak tanpa melempar", async () => {
  assert.equal(await cocokSandi("apa saja", ""), false);
  assert.equal(await cocokSandi("apa saja", "bcrypt$xx$yy"), false);
  assert.equal(await cocokSandi("apa saja", "scrypt$bukanhex$bukanhex"), false);
  assert.equal(await cocokSandi("apa saja", "scrypt$aa$bb$cc"), false);
});

test("validasi akun menolak email, nama, dan sandi lemah", () => {
  assert.equal(validasiAkun("a@b.co", "Ani", "12345678"), "");
  assert.match(validasiAkun("bukan-email", "Ani", "12345678"), /email/i);
  assert.match(validasiAkun("a@b.co", "A", "12345678"), /nama/i);
  assert.match(validasiAkun("a@b.co", "Ani", "1234567"), /sandi/i);
  assert.match(validasiAkun(`${"a".repeat(250)}@b.co`, "Ani", "12345678"), /email/i);
});