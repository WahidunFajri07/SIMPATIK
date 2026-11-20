import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { APIRequestContext, Page } from "@playwright/test";
const env = parseEnv(readFileSync(".env", "utf8"));
export const envVar = (k: string) =>
  k === "ADMIN_PASSWORD"
    ? (process.env.E2E_ADMIN_PASSWORD ?? "")
    : (process.env[k] ?? env[k] ?? "");
/** Mode database mematikan akun demo, jadi tes masuk memakai ADMIN_EMAIL/.env. */
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
