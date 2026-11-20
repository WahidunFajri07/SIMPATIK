import { z } from "zod";
import { ApiError, endpoint, json, body, titikSchema, uuid } from "@/lib/api";
import {
  daftarMaster,
  imporMaster,
  ubahMaster,
  hapusMasterBanyak,
} from "@/lib/repositori";
import { pakaiPostgis } from "@/lib/db";
export const GET = endpoint(async () =>
  json({
    masters: await daftarMaster(),
    mode: pakaiPostgis ? "postgis" : "demo",
  }),
);
export const POST = endpoint(async (req) =>
  json(
    await imporMaster(
      await body(
        req,
        z.object({
          id: uuid.optional(),
          batchId: uuid,
          nama: z.string().trim().min(1).max(120),
          kategori: z.string().min(1).max(50),
          file: z.string().max(255),
          titik: z.array(titikSchema).min(1).max(2500),
        }),
      ),
    ),
  ),
);
export const PATCH = endpoint(async (req) => {
  const i = await body(
    req,
    z.object({
      id: uuid,
      nama: z.string().trim().min(1).max(120),
      kategori: z.string().trim().min(1).max(50).optional(),
    }),
  );
  return json(await ubahMaster(i.id, i));
});
export const DELETE = endpoint(async (req) => {
  const queryId = new URL(req.url).searchParams.get("id");
  const ids = queryId
    ? [uuid.parse(queryId)]
    : (await body(
        req,
        z.object({
          ids: z.array(uuid).min(1).max(100),
        }),
      )).ids;
  if (new Set(ids).size !== ids.length)
    throw new ApiError("ID master tidak boleh duplikat.");
  await hapusMasterBanyak(ids);
  return json({ ok: true });
});
