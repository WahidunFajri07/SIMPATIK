import { cookies } from "next/headers";
import { db, pakaiPostgis } from "./db";
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
const state = globalThis as unknown as { sessionKey?: string };
function secret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new Error("SESSION_SECRET wajib minimal 32 karakter untuk produksi.");
  return (state.sessionKey ??= randomBytes(32).toString("hex"));
}
export const demoDiizinkan = () =>
  process.env.NODE_ENV !== "production" &&
  !process.env.ADMIN_EMAIL &&
  !process.env.DATABASE_URL;
export function sama(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function tokenBaru(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 12 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export async function pengguna() {
  const token = (await cookies()).get("simpatik-sesi")?.value;
  if (!token) return null;
  try {
    const [payload, sig] = token.split(".");
    if (
      !sig ||
      !sama(
        sig,
        createHmac("sha256", secret()).update(payload).digest("base64url"),
      )
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.exp > Date.now()
      ? (data as { email: string; exp: number })
      : null;
  } catch {
    return null;
  }
}
/** Hanya untuk rute akun: ADMIN_EMAIL dari .env, atau akun pertama di database. */
export async function adminUtama() {
  const me = await pengguna();
  if (!me) return null;
  if (me.email === process.env.ADMIN_EMAIL) return me;
  if (!pakaiPostgis) return null;
  const pertama = await db().pengguna.findFirst({
    orderBy: { dibuat: "asc" },
    select: { email: true },
  });
  return pertama?.email === me.email ? me : null;
}
