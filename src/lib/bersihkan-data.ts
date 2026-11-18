import type { Titik } from "./tipe";
export function bersihkanKode(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function angka(value: unknown): number {
  if (typeof value === "number") return value;
  const s = String(value ?? "").trim();
  if (!s) return NaN;
  return Number(s.replace(/\s/g, "").replace(",", "."));
}
export function koordinat(xRaw: unknown, yRaw: unknown) {
  let x = angka(xRaw),
    y = angka(yRaw),
    ditukar = false;
  if (x >= -11 && x <= 6 && y >= 95 && y <= 141) {
    [x, y] = [y, x];
    ditukar = true;
  }
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 180 ||
    Math.abs(y) > 90
  )
    throw new Error("Koordinat tidak valid. X harus -180–180 dan Y -90–90.");
  return { x, y, ditukar };
}
export function petakanBaris(
  rows: Record<string, unknown>[],
  mapping: { deskripsi: string; x: string; y: string },
  wajibDeskripsi: boolean,
) {
  const titik: Titik[] = [],
    errors: string[] = [];
  let ditukar = 0;
  rows.forEach((row, i) => {
    try {
      const deskripsi = String(row[mapping.deskripsi] ?? "").trim();
      if (wajibDeskripsi && !bersihkanKode(deskripsi))
        throw new Error("Deskripsi master wajib diisi.");
      const k = koordinat(row[mapping.x], row[mapping.y]);
      if (k.ditukar) ditukar++;
      titik.push({ deskripsi, x: k.x, y: k.y, info: row });
    } catch (e) {
      errors.push(`Baris ${i + 2}: ${(e as Error).message}`);
    }
  });
  return { titik, errors, ditukar };
}
