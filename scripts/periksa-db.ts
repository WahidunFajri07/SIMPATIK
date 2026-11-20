import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({ log: [] });
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");
  await db.$queryRaw`SELECT 1`;
  console.log("Koneksi PostgreSQL berhasil.");
  const postgis = await db.$queryRaw<{ ada: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ada
  `;
  if (!postgis[0].ada)
    throw new Error(
      "PostGIS belum aktif. Pasang PostGIS lalu jalankan npm run db:migrate.",
    );
  await db.pengguna.count();
  await db.gudangMaster.count();
  await db.titikMaster.count();
  await db.sesiPencocokan.count();
  await db.hasilPencocokan.count();
  await db.batchImpor.count();
  console.log("PostGIS dan tabel aplikasi siap.");
} catch (e) {
  // Jangan cetak pesan Prisma mentah yang bisa memuat URL/kredensial koneksi.
  const kode =
    (e as { code?: string; errorCode?: string }).code ??
    (e as { errorCode?: string }).errorCode;
  const pesan: Record<string, string> = {
    P1000: "Autentikasi database gagal. Periksa kredensial di .env.",
    P1001: "Server database tidak terjangkau.",
    P1003: "Database tujuan belum ada.",
    P2021: "Tabel belum tersedia. Jalankan npm run db:migrate.",
  };
  console.error(
    kode
      ? (pesan[kode] ?? `Pemeriksaan database gagal (${kode}).`)
      : e instanceof Error && e.constructor === Error
        ? e.message
        : "Pemeriksaan database gagal. Periksa konfigurasi server.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
