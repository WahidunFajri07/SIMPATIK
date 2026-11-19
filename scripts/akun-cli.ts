import { PrismaClient } from "@prisma/client";
import { hashSandi, emailValid } from "../src/lib/akun";
const db = new PrismaClient();
const ringkas = { id: true, nama: true, email: true, dibuat: true } as const;
function keluar(bantuan: string): never {
  console.log(bantuan.trim());
  process.exit(1);
}
const BANTUAN = `
Kelola akun SIMPATIK dari terminal.

  npm run akun                        daftar semua akun
  npm run akun -- tambah <email> <sandi> [nama]
  npm run akun -- sandi <email> <sandi-baru>
  npm run akun -- hapus <email>
`;
const [perintah, ...sisa] = process.argv.slice(2);
try {
  if (!perintah || perintah === "daftar") {
    const akun = await db.pengguna.findMany({
      orderBy: { dibuat: "asc" },
      select: ringkas,
    });
    if (!akun.length) {
      console.log("Belum ada akun. Tambah: npm run akun -- tambah <email> <sandi>");
    } else {
      console.log(`${akun.length} akun:`);
      akun.forEach((a) =>
        console.log(
          `  ${a.email}  |  ${a.nama}  |  dibuat ${a.dibuat.toISOString().slice(0, 10)}  |  ${a.id}`,
        ),
      );
      console.log(`\nAkun tertua (${akun[0].email}) adalah admin pengelola akun.`);
    }
  } else if (perintah === "tambah") {
    const [email, sandi, nama] = sisa;
    if (!email || !sandi) keluar(BANTUAN);
    if (!emailValid(email)) keluar("Gagal: Format email tidak valid.");
    if (sandi.length < 8) keluar("Gagal: Kata sandi minimal 8 karakter.");
    if (nama !== undefined && nama.trim().length < 2)
      keluar("Gagal: Nama minimal 2 karakter.");
    const namaAkhir = nama?.trim() || email.split("@")[0];
    if (await db.pengguna.findUnique({ where: { email } }))
      keluar(`Gagal: ${email} sudah terdaftar.`);
    const baru = await db.pengguna.create({
      data: { nama: namaAkhir, email, sandi: await hashSandi(sandi) },
      select: ringkas,
    });
    console.log(`Akun dibuat: ${baru.email} (${baru.nama})`);
  } else if (perintah === "sandi") {
    const [email, sandi] = sisa;
    if (!email || !sandi) keluar(BANTUAN);
    const akun = await db.pengguna.findUnique({ where: { email } });
    if (!akun) keluar(`Gagal: ${email} tidak ditemukan.`);
    if (sandi.length < 8) keluar("Gagal: Kata sandi minimal 8 karakter.");
    await db.pengguna.update({
      where: { email },
      data: { sandi: await hashSandi(sandi) },
    });
    console.log(`Sandi ${email} diperbarui.`);
  } else if (perintah === "hapus") {
    const [email] = sisa;
    if (!email) keluar(BANTUAN);
    const akun = await db.pengguna.findUnique({ where: { email } });
    if (!akun) keluar(`Gagal: ${email} tidak ditemukan.`);
    const total = await db.pengguna.count();
    // Tanpa ADMIN_EMAIL di .env, menghapus akun terakhir mengunci semua orang.
    if (total === 1 && !process.env.ADMIN_EMAIL)
      keluar(
        "Gagal: ini akun terakhir dan ADMIN_EMAIL di .env kosong. Isi ADMIN_EMAIL dulu agar tidak terkunci.",
      );
    await db.pengguna.delete({ where: { email } });
    console.log(`Akun dihapus: ${email}`);
  } else {
    keluar(BANTUAN);
  }
} catch (e) {
  console.error("Kesalahan:", (e as Error).message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}