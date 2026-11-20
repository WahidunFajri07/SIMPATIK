import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { amankanEnv } from "./lib/amankan-env";

async function bacaSandi(pesan: string): Promise<string> {
  stdout.write(pesan);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let sandi = "";
    const selesai = () => {
      stdin.off("keypress", tekan);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const tekan = (
      teks: string | undefined,
      key: { name?: string; ctrl?: boolean },
    ) => {
      if (key.ctrl && key.name === "c") {
        selesai();
        reject(new Error("Dibatalkan."));
      } else if (key.name === "return" || key.name === "enter") {
        selesai();
        resolve(sandi);
      } else if (key.name === "backspace")
        sandi = [...sandi].slice(0, -1).join("");
      else if (teks && !key.ctrl && !/[\x00-\x1f\x7f]/.test(teks))
        sandi += teks;
    };
    stdin.on("keypress", tekan);
  });
}

try {
  const teks = await readFile(".env", "utf8");
  let admin: { email: string; sandi: string } | undefined;
  if (process.argv.includes("--admin")) {
    if (!stdin.isTTY || !stdout.isTTY)
      throw new Error("Jalankan npm run env:admin di terminal interaktif.");
    const rl = createInterface({ input: stdin, output: stdout });
    let email: string;
    try {
      const sekarang = parseEnv(teks).ADMIN_EMAIL ?? "";
      email =
        (
          await rl.question(`Email admin${sekarang ? ` [${sekarang}]` : ""}: `)
        ).trim() || sekarang;
    } finally {
      rl.close();
    }
    const sandi = await bacaSandi("Kata sandi (8–256 karakter, tersembunyi): ");
    if (!sandi) throw new Error("Kata sandi tidak boleh kosong.");
    if (sandi !== (await bacaSandi("Ulangi kata sandi: ")))
      throw new Error("Kedua kata sandi tidak sama.");
    admin = { email, sandi };
  }
  const hasil = await amankanEnv(teks, admin);
  await writeFile(".env", hasil.teks, { mode: 0o600 });
  console.log(
    ".env diperbarui: SESSION_SECRET siap; ADMIN_PASSWORD polos dihapus.",
  );
  console.log(
    hasil.adminSiap
      ? "Hash admin siap. Mulai ulang server aplikasi."
      : "Admin belum diatur. Jalankan npm run env:admin.",
  );
} catch (e) {
  console.error(
    (e as NodeJS.ErrnoException).code === "ENOENT"
      ? "File .env belum ada. Salin .env.example ke .env lalu isi koneksi database."
      : (e as Error).message,
  );
  process.exitCode = 1;
}
