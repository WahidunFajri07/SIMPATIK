import { execSync } from "node:child_process";
const port = process.env.PORT ?? "3000";
let keluaran = "";
try {
  keluaran = execSync("netstat -ano -p tcp", { encoding: "utf8" });
} catch (e) {
  console.error("Gagal membaca daftar port:", e.message);
  process.exit(1);
}
// Baris netstat: proto, alamat lokal, alamat asing, status, pid.
const pid = [
  ...new Set(
    keluaran
      .split("\n")
      .map((l) => l.trim().split(/\s+/))
      .filter((c) => c[3] === "LISTENING" && c[1]?.endsWith(`:${port}`))
      .map((c) => c[4])
      .filter(Boolean),
  ),
];
if (!pid.length) {
  console.log(`Tidak ada server yang mendengarkan port ${port}.`);
  process.exit(0);
}
for (const p of pid) {
  try {
    execSync(`taskkill /PID ${p} /T /F`, { stdio: "pipe" });
    console.log(`Dihentikan: PID ${p} (port ${port}) beserta anak prosesnya.`);
  } catch {
    console.log(`PID ${p} sudah tidak berjalan.`);
  }
}