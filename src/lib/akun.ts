import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const PANJANG = 64;
const BIAYA = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function acak(sandi: string, salt: string, biaya: Partial<typeof BIAYA>) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(sandi, salt, PANJANG, biaya, (error, hash) => {
      if (error) reject(error);
      else resolve(hash);
    });
  });
}
/** Parameter tersimpan; pemisah ':' aman dari ekspansi variabel .env Next.js. */
export async function hashSandi(sandi: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await acak(sandi, salt, BIAYA);
  return `scrypt:32768:8:3:${salt}:${hash.toString("hex")}`;
}
export async function cocokSandi(sandi: string, tersimpan: string) {
  const baru = /^scrypt:32768:8:3:([0-9a-f]{32}):([0-9a-f]{128})$/.exec(
    tersimpan,
  );
  // Tetap terima hash akun database lama dengan parameter bawaan Node.js.
  const lama = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(tersimpan);
  const bagian = baru ?? lama;
  if (!bagian) return false;
  const [, salt, hash] = bagian;
  const harap = Buffer.from(hash, "hex");
  const uji = await acak(sandi, salt, baru ? BIAYA : {});
  return timingSafeEqual(harap, uji);
}
export const emailValid = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
/** Dipakai login dan pengelolaan akun; dipisah agar mudah diuji. */
export function validasiAkun(email: string, nama: string, sandi: string) {
  if (!emailValid(email)) return "Format email tidak valid.";
  if (nama.trim().length < 2) return "Nama minimal 2 karakter.";
  if (sandi.length < 8) return "Kata sandi minimal 8 karakter.";
  return "";
}
