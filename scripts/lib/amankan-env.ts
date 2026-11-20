import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { emailValid, hashSandi } from "../../src/lib/akun";

/** Memindahkan sandi polos ke hash tanpa mencetak rahasia atau mengubah URL database. */
export async function amankanEnv(
  teks: string,
  admin?: { email: string; sandi: string },
) {
  const env = parseEnv(teks);
  const sandi = admin?.sandi ?? env.ADMIN_PASSWORD;
  if (admin && !emailValid(admin.email))
    throw new Error("Format email tidak valid.");
  if (sandi && (sandi.length < 8 || sandi.length > 256))
    throw new Error("Kata sandi harus 8–256 karakter.");
  const hash = sandi ? await hashSandi(sandi) : (env.ADMIN_PASSWORD_HASH ?? "");
  if (admin) env.ADMIN_EMAIL = admin.email;
  env.ADMIN_PASSWORD_HASH = hash;
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    env.SESSION_SECRET = randomBytes(48).toString("hex");

  // Buang seluruh assignment lama, termasuk nilai multi-baris yang dikutip.
  teks = teks.replace(
    /^[ \t]*(?:export[ \t]+)?ADMIN_PASSWORD[ \t]*=[ \t]*(?:"[\s\S]*?"|'[\s\S]*?'|[^\r\n]*)[^\r\n]*(?:\r?\n|$)/gm,
    "",
  );
  for (const key of ["ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"]) {
    const pola = new RegExp(
      `^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[^\\r\\n]*`,
      "gm",
    );
    const baris = `${key}=${JSON.stringify(env[key] ?? "")}`;
    if (pola.test(teks)) teks = teks.replace(pola, () => baris);
    else teks = `${teks.trimEnd()}\n${baris}\n`;
  }
  return { teks, adminSiap: !!env.ADMIN_EMAIL && !!hash };
}
