import { z } from "zod";
import { endpoint, json, body, titikSchema, uuid } from "@/lib/api";
import { cocokkan } from "@/lib/repositori";
export const POST = endpoint(async (req) =>
  json(
    await cocokkan(
      await body(
        req,
        z.object({
          sesiId: uuid.optional(),
          batchId: uuid,
          nama: z.string().trim().min(1).max(120),
          masterIds: z.array(uuid).min(1).max(50),
          toleransi: z.number().min(0).max(10000),
          titik: z.array(titikSchema).min(1).max(2500),
        }),
      ),
    ),
  ),
);
