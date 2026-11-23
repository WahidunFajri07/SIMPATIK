import { z } from "zod";
import { endpoint, json, uuid, ApiError } from "@/lib/api";
import { titikPeta } from "@/lib/repositori";
import { STATUS } from "@/lib/tipe";
export const GET = endpoint(async (req) => {
  const q = new URL(req.url).searchParams;
  const angka = (key: string, min: number, max: number) => {
    if (!q.has(key) || q.get(key) === "")
      throw new ApiError(`Parameter ${key} wajib diisi.`);
    return z.coerce.number().finite().min(min).max(max).parse(q.get(key));
  };
  const b = {
    minX: angka("minX", -180, 180),
    maxX: angka("maxX", -180, 180),
    minY: angka("minY", -90, 90),
    maxY: angka("maxY", -90, 90),
  };
  if (b.minX > b.maxX || b.minY > b.maxY)
    throw new ApiError("Batas peta tidak valid.");
  const sesiId = q.get("sesiId");
  if (sesiId) uuid.parse(sesiId);
  const status = q.get("status");
  if (status && !STATUS.includes(status as (typeof STATUS)[number]))
    throw new ApiError("Filter status peta tidak dikenal.");
  return json(
    await titikPeta(
      b,
      sesiId ?? undefined,
      (status as (typeof STATUS)[number] | null) ?? undefined,
    ),
  );
});
