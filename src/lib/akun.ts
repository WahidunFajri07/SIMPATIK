import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const acak = promisify(scrypt);
const PANJANG = 64;
/** scrypt dengan salt acak: `scrypt$<salt hex>$<hash hex>`. */
export async function hashSandi(sandi: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await acak(sandi, salt, PANJANG)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function cocokSandi(sandi: string, tersimpan: string) {
  const [jenis, salt, hash] = tersimpan.split("$");
  if (jenis !== "scrypt" || !salt || !hash) return false;
  // Buffer.from hex yang rusak jadi kosong; dua buffer kosong akan dianggap sama.
  if (!/^[0-9a-f]+$/.test(salt) || !/^[0-9a-f]{2,}$/.test(hash)) return false;
  const harap = Buffer.from(hash, "hex");
  if (!harap.length) return false;
  const uji = (await acak(sandi, salt, harap.length)) as Buffer;
  return harap.length === uji.length && timingSafeEqual(harap, uji);
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