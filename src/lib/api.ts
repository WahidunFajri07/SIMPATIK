import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { pengguna } from "./auth";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const uuid = z.string().uuid();
export const titikSchema = z.object({
  deskripsi: z.string().max(300).default(""),
  x: z.number().finite().min(-180).max(180),
  y: z.number().finite().min(-90).max(90),
  info: z.record(z.string(), z.unknown()).optional(),
});
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function body<T>(req: Request, schema: z.ZodType<T>) {
  if (Number(req.headers.get("content-length")) > 12_000_000)
    throw new ApiError("Batch terlalu besar.", 413);
  const text = await req.text();
  if (Buffer.byteLength(text) > 12_000_000)
    throw new ApiError("Batch terlalu besar.", 413);
  try {
    return schema.parse(JSON.parse(text));
  } catch (e) {
    if (e instanceof SyntaxError) throw new ApiError("JSON tidak valid.");
    throw e;
  }
}
export function endpoint(
  handler: (req: Request) => Promise<Response>,
  auth = true,
) {
  return async (req: Request) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        const origin = req.headers.get("origin");
        if (
          origin &&
          new URL(origin).host !==
            (req.headers.get("host") ?? new URL(req.url).host)
        )
          throw new ApiError("Origin permintaan tidak diizinkan.", 403);
      }
      if (auth && !(await pengguna()))
        throw new ApiError("Silakan masuk terlebih dahulu.", 401);
      return await handler(req);
    } catch (e) {
      if (e instanceof ZodError)
        return json(
          {
            error: "Data tidak valid.",
            detail: e.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .slice(0, 10),
          },
          400,
        );
      if (e instanceof ApiError) return json({ error: e.message }, e.status);
      console.error("[SIMPATIK]", e);
      return json(
        { error: "Operasi gagal. Periksa koneksi database dan log server." },
        500,
      );
    }
  };
}
