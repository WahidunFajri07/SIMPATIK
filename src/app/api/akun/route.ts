import { z } from "zod";
import { endpoint, json, body, ApiError } from "@/lib/api";
import { adminUtama } from "@/lib/auth";
import { cocokSandi, hashSandi, validasiAkun } from "@/lib/akun";
import { db, pakaiPostgis } from "@/lib/db";
const bentuk = {
  nama: z.string().max(80),
  email: z.string().max(254),
  sandi: z.string().max(200),
};
const ringkas = { id: true, nama: true, email: true, dibuat: true } as const;
export const GET = endpoint(async () => {
  if (!(await adminUtama()))
    throw new ApiError("Hanya admin utama yang bisa mengelola akun.", 403);
  return json({
    akun: pakaiPostgis
      ? await db().pengguna.findMany({
          orderBy: { dibuat: "asc" },
          select: ringkas,
        })
      : [],
  });
});
export const POST = endpoint(async (req) => {
  if (!(await adminUtama()))
    throw new ApiError("Hanya admin utama yang bisa mengelola akun.", 403);
  if (!pakaiPostgis)
    throw new ApiError("Akun tersimpan di database. Isi DATABASE_URL dulu.");
  const i = await body(req, z.object(bentuk));
  const salah = validasiAkun(i.email, i.nama, i.sandi);
  if (salah) throw new ApiError(salah);
  if (await db().pengguna.findUnique({ where: { email: i.email } }))
    throw new ApiError("Email sudah terdaftar.", 409);
  return json(
    await db().pengguna.create({
      data: {
        nama: i.nama.trim(),
        email: i.email,
        sandi: await hashSandi(i.sandi),
      },
      select: ringkas,
    }),
    201,
  );
});
export const PATCH = endpoint(async (req) => {
  const me = await adminUtama();
  if (!me) throw new ApiError("Hanya admin utama yang bisa mengelola akun.", 403);
  if (!pakaiPostgis)
    throw new ApiError("Akun tersimpan di database. Isi DATABASE_URL dulu.");
  const i = await body(
    req,
    z.object({ id: z.string().uuid(), nama: bentuk.nama, sandi: bentuk.sandi }),
  );
  const akun = await db().pengguna.findUnique({ where: { id: i.id } });
  if (!akun) throw new ApiError("Akun tidak ditemukan.", 404);
  const salah = i.sandi
    ? validasiAkun(akun.email, i.nama, i.sandi)
    : i.nama.trim().length < 2
      ? "Nama minimal 2 karakter."
      : "";
  if (salah) throw new ApiError(salah);
  return json(
    await db().pengguna.update({
      where: { id: i.id },
      data: {
        nama: i.nama.trim(),
        ...(i.sandi
          ? { sandi: await hashSandi(i.sandi) }
          : {}),
      },
      select: ringkas,
    }),
  );
});
export const DELETE = endpoint(async (req) => {
  const me = await adminUtama();
  if (!me) throw new ApiError("Hanya admin utama yang bisa mengelola akun.", 403);
  if (!pakaiPostgis)
    throw new ApiError("Akun tersimpan di database. Isi DATABASE_URL dulu.");
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(id).success)
    throw new ApiError("Id akun tidak valid.");
  const diri = await db().pengguna.findUnique({ where: { email: me.email } });
  if (id === diri?.id) throw new ApiError("Akun sendiri tidak bisa dihapus.");
  if (!(await db().pengguna.findUnique({ where: { id } })))
    throw new ApiError("Akun tidak ditemukan.", 404);
  await db().pengguna.delete({ where: { id } });
  return json({ ok: true });
});