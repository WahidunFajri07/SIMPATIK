import { z } from "zod";
import { cookies } from "next/headers";
import { endpoint, json, body, ApiError } from "@/lib/api";
import { tokenBaru, sama, demoDiizinkan } from "@/lib/auth";
import { cocokSandi } from "@/lib/akun";
import { db, pakaiPostgis } from "@/lib/db";
const attempts = new Map<string, { n: number; until: number }>();
export const POST = endpoint(async (req) => {
  const input = await body(
    req,
    z.object({
      email: z.string().max(254).optional(),
      password: z.string().max(256).optional(),
      demo: z.boolean().optional(),
    }),
  );
  const key = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  const limit = attempts.get(key);
  if (limit && limit.n >= 10)
    throw new ApiError(
      "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
      429,
    );
  const demo = input.demo && demoDiizinkan();
  let email = process.env.ADMIN_EMAIL;
  if (!demo) {
    // Akun di database didahulukan; ADMIN_EMAIL/ADMIN_PASSWORD tetap jadi pintu darurat.
    const akun = pakaiPostgis
      ? await db().pengguna.findUnique({ where: { email: input.email ?? "" } })
      : null;
    const dbCocok = akun && (await cocokSandi(input.password ?? "", akun.sandi));
    const envCocok =
      !!process.env.ADMIN_EMAIL &&
      !!process.env.ADMIN_PASSWORD &&
      sama(input.email ?? "", process.env.ADMIN_EMAIL) &&
      sama(input.password ?? "", process.env.ADMIN_PASSWORD);
    if (!dbCocok && !envCocok) {
      if (attempts.size > 10000) attempts.clear();
      attempts.set(key, {
        n: (limit?.n ?? 0) + 1,
        until: limit?.until ?? now + 900000,
      });
      throw new ApiError("Email atau kata sandi tidak sesuai.", 401);
    }
    email = dbCocok ? akun!.email : process.env.ADMIN_EMAIL!;
  }
  (await cookies()).set(
    "simpatik-sesi",
    tokenBaru(demo ? "demo@simpatik.local" : email!),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 43200,
    },
  );
  attempts.delete(key);
  return json({ ok: true });
}, false);
export const DELETE = endpoint(async () => {
  (await cookies()).delete("simpatik-sesi");
  return json({ ok: true });
});