import { endpoint, json, uuid, ApiError } from "@/lib/api";
import { daftarSesi, bacaHasil } from "@/lib/repositori";
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
