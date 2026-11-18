import { bersihkanKode } from "./bersihkan-data";
import type { Gudang, Master, Titik, TitikMaster } from "./tipe";
import { buatPencocok } from "./rumus-jarak";
export function dataContoh() {
  const masters: Master[] = [
    "Trafo Jawa Barat",
    "DIL Bandung",
    "Prabayar Bandung",
  ].map((nama, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    nama: `Master ${nama}`,
    kategori: ["TRAFO", "DIL", "PRABAYAR"][i],
    file: ["Master_Trafo_Jabar.csv", "Master_DIL.csv", "Master_Prabayar.csv"][
      i
    ],
    total: 120,
    dibuat: new Date().toISOString(),
  }));
  const titik: TitikMaster[] = [];
  masters.forEach((m, j) => {
    for (let i = 0; i < 120; i++)
      titik.push({
        id: String(j * 120 + i + 1),
        masterId: m.id,
        deskripsi: `${["TRF", "DIL", "PRA"][j]}-${String(Math.floor(i / 2) + 1).padStart(3, "0")}${i % 2 ? "B" : "A"}`,
        bersih: "",
        x: 107.586 + (i % 12) * 0.0031 + j * 0.0008,
        y: -6.897 - Math.floor(i / 12) * 0.0026 - j * 0.0005,
        info: { wilayah: "Bandung", daya: `${[100, 160, 250][i % 3]} kVA` },
      });
  });
  titik.forEach((t) => (t.bersih = bersihkanKode(t.deskripsi)));
  const tinjauan: Titik[] = titik.slice(0, 96).map((p, i) => ({
    deskripsi: i % 7 === 0 ? "" : i % 13 === 0 ? `LAP-${i}` : p.deskripsi,
    x: p.x + (i % 5 === 0 ? 0.00041 : 0.000018),
    y: p.y + 0.000008,
  }));
  tinjauan.push(
    ...Array.from({ length: 4 }, (_, i) => ({
      deskripsi: `BARU-${i + 1}`,
      x: 107.64 + i * 0.001,
      y: -6.93,
    })),
  );
  return { masters, titik, tinjauan };
}
export function gudangContoh(): Gudang {
  const { masters, titik, tinjauan } = dataContoh();
  const id = "00000000-0000-4000-8000-000000000010";
  const cocok = buatPencocok(titik, masters, 15);
  const hasil = tinjauan.map((b, i) => cocok(b, String(i + 1), id));
  return {
    masters,
    titik,
    hasil,
    batches: [],
    sesi: [
      {
        id,
        nama: "Audit titik trafo · Bandung",
        masterIds: masters.map((m) => m.id),
        toleransi: 15,
        total: hasil.length,
        akurat: hasil.filter((h) => h.status === "AKURAT").length,
        tinjau: hasil.filter((h) => h.status !== "AKURAT").length,
        dikonfirmasi: 0,
        dibuat: new Date().toISOString(),
      },
    ],
  };
}
