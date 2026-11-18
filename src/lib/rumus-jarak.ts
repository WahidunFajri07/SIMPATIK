import { bersihkanKode } from "./bersihkan-data";
import type { Hasil, Master, Titik, TitikMaster } from "./tipe";
export function haversine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const rad = Math.PI / 180,
    dLat = (by - ay) * rad,
    dLon = (bx - ax) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(ay * rad) * Math.cos(by * rad) * Math.sin(dLon / 2) ** 2;
  return (
    6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  );
}
// Index kode + grid spasial. Fallback lokal tidak melakukan N×M untuk data tanpa kode.
export function buatPencocok(
  points: TitikMaster[],
  masters: Master[],
  toleransi: number,
) {
  const codes = new Map<string, TitikMaster[]>(),
    grid = new Map<string, TitikMaster[]>();
  const cell = 0.002,
    key = (x: number, y: number) =>
      `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const names = new Map(masters.map((m) => [m.id, m.nama]));
  for (const p of points) {
    const code = p.bersih || bersihkanKode(p.deskripsi);
    if (code) {
      const bucket = codes.get(code);
      if (bucket) bucket.push(p);
      else codes.set(code, [p]);
    }
    const k = key(p.x, p.y);
    const bucket = grid.get(k);
    if (bucket) bucket.push(p);
    else grid.set(k, [p]);
  }
  return (b: Titik, id: string, sesiId: string): Hasil => {
    let candidates = codes.get(bersihkanKode(b.deskripsi)) ?? [];
    const byCode = candidates.length > 0;
    if (!byCode) {
      candidates = [];
      const dy = 100 / 110000,
        dx = dy / Math.max(0.001, Math.cos((b.y * Math.PI) / 180));
      // Near the poles, visit occupied cells instead of iterating millions of empty cells.
      if (dx / cell > 100) candidates = points;
      else
        for (
          let x = Math.floor((b.x - dx) / cell);
          x <= Math.floor((b.x + dx) / cell);
          x++
        )
          for (
            let y = Math.floor((b.y - dy) / cell);
            y <= Math.floor((b.y + dy) / cell);
            y++
          )
            candidates.push(...(grid.get(`${x},${y}`) ?? []));
      if (b.x - dx < -180 || b.x + dx > 180) candidates = points;
    }
    let nearest: TitikMaster | undefined,
      distance = Infinity;
    for (const a of candidates) {
      const d = haversine(a.x, a.y, b.x, b.y);
      if (d < distance && (byCode || d <= 100)) {
        nearest = a;
        distance = d;
      }
    }
    return {
      id,
      sesiId,
      masterId: nearest?.id ?? null,
      deskripsiA: nearest?.deskripsi ?? null,
      sumber: nearest ? (names.get(nearest.masterId) ?? "") : null,
      ax: nearest?.x ?? null,
      ay: nearest?.y ?? null,
      status: nearest
        ? byCode
          ? distance <= toleransi
            ? "AKURAT"
            : "PERLU_KOREKSI_JARAK"
          : "KANDIDAT_LOKASI_TERDEKAT"
        : "TIDAK_DITEMUKAN",
      jarak: nearest ? distance : null,
      deskripsiB: b.deskripsi,
      bx: b.x,
      by: b.y,
      keputusan: "BELUM_DITINJAU",
      hasilX: null,
      hasilY: null,
      hasilDeskripsi: null,
    };
  };
}
