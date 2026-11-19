import { readFileSync } from "node:fs";
import type { APIRequestContext, Page } from "@playwright/test";
const env = readFileSync(".env", "utf8");
export const envVar = (k: string) =>
  env.match(new RegExp(`^${k}="?([^"\\n]*)`, "m"))?.[1] ?? "";
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