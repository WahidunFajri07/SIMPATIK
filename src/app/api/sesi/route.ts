import { endpoint, json, uuid, body, ApiError } from "@/lib/api";
import { z } from "zod";
import { daftarSesi, bacaHasil, ubahSesi, hapusSesi } from "@/lib/repositori";
export const GET = endpoint(async (req) => {
  const q = new URL(req.url).searchParams;
  const id = q.get("id");
  if (!id) return json({ sesi: await daftarSesi() });
  uuid.parse(id);
  const offset = Number(q.get("offset") ?? 0),
    limit = Number(q.get("limit") ?? 1000);
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 2500
  )
    throw new ApiError("Paginasi tidak valid.");
  const sesi = (await daftarSesi()).find((s) => s.id === id);
  if (!sesi) throw new ApiError("Sesi tidak ditemukan.", 404);
  return json({ sesi, hasil: await bacaHasil(id, offset, limit) });
});
export const PATCH = endpoint(async (req) => {
  const i = await body(
    req,
    z.object({ id: uuid, nama: z.string().trim().min(1).max(120) }),
  );
  return json(await ubahSesi(i.id, i.nama));
});
export const DELETE = endpoint(async (req) => {
  await hapusSesi(uuid.parse(new URL(req.url).searchParams.get("id") ?? ""));
  return json({ ok: true });
});
