import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { APIRequestContext, Page } from "@playwright/test";
const env = parseEnv(readFileSync(".env", "utf8"));
/** Akun khusus Playwright; .env tidak lagi menyimpan sandi polos. */
const e2e = existsSync(".env.e2e")
  ? parseEnv(readFileSync(".env.e2e", "utf8"))
  : {};
export const envVar = (k: string) => {
  if (k === "ADMIN_PASSWORD")
    return process.env.E2E_ADMIN_PASSWORD ?? e2e.E2E_ADMIN_PASSWORD ?? "";
  // Server tes memakai akun E2E sebagai ADMIN_EMAIL
  // (lihat playwright.config.ts → webServer.env).
  if (k === "ADMIN_EMAIL")
    return (
      process.env.E2E_ADMIN_EMAIL ??
      e2e.E2E_ADMIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      e2e.ADMIN_EMAIL ??
      ""
    );
  return process.env[k] ?? e2e[k] ?? env[k] ?? "";
};
/** Mode database mematikan akun demo, jadi tes masuk memakai akun E2E. */
export async function masuk(target: APIRequestContext | Page) {
  const ctx =
    typeof (target as Page).goto === "function"
      ? (target as Page).context().request
      : (target as APIRequestContext);
  const res = await ctx.post("/api/auth", {
    data: {
      email: envVar("ADMIN_EMAIL"),
      password: envVar("ADMIN_PASSWORD"),
    },
  });
  if (!res.ok())
    throw new Error(`Login tes gagal (${res.status()}): ${await res.text()}`);
}
