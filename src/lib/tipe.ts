export const STATUS = [
  "AKURAT",
  "PERLU_KOREKSI_JARAK",
  "KANDIDAT_LOKASI_TERDEKAT",
  "TIDAK_DITEMUKAN",
] as const;
export type Status = (typeof STATUS)[number];
export const KEPUTUSAN = [
  "BELUM_DITINJAU",
  "TERKONFIRMASI_VALID",
  "PAKAI_KOORDINAT_MASTER",
  "PAKAI_KOORDINAT_BARU",
  "TERIMA_DESKRIPSI_MASTER",
] as const;
export type Keputusan = (typeof KEPUTUSAN)[number];
export type Titik = {
  deskripsi: string;
  x: number;
  y: number;
  info?: Record<string, unknown>;
};
export type Master = {
  id: string;
  nama: string;
  kategori: string;
  file: string;
  total: number;
  dibuat: string;
};
export type TitikMaster = Titik & {
  id: string;
  masterId: string;
  bersih: string;
};
export type Hasil = {
  id: string;
  sesiId: string;
  masterId: string | null;
  deskripsiA: string | null;
  sumber: string | null;
  ax: number | null;
  ay: number | null;
  status: Status;
  jarak: number | null;
  deskripsiB: string;
  bx: number;
  by: number;
  keputusan: Keputusan;
  hasilX: number | null;
  hasilY: number | null;
  hasilDeskripsi: string | null;
  catatanManual: string | null;
};
export type Sesi = {
  id: string;
  nama: string;
  masterIds: string[];
  toleransi: number;
  total: number;
  akurat: number;
  tinjau: number;
  dikonfirmasi: number;
  dibuat: string;
};
export type Gudang = {
  masters: Master[];
  titik: TitikMaster[];
  sesi: Sesi[];
  hasil: Hasil[];
  batches: string[];
};
export const LABEL_STATUS: Record<Status, string> = {
  AKURAT: "Akurat",
  PERLU_KOREKSI_JARAK: "Perlu koreksi",
  KANDIDAT_LOKASI_TERDEKAT: "Kandidat terdekat",
  TIDAK_DITEMUKAN: "Tidak ditemukan",
};
export const LABEL_KEPUTUSAN: Record<Keputusan, string> = {
  BELUM_DITINJAU: "Belum ditinjau",
  TERKONFIRMASI_VALID: "Terkonfirmasi valid",
  PAKAI_KOORDINAT_MASTER: "Pakai koordinat master",
  PAKAI_KOORDINAT_BARU: "Pakai koordinat baru",
  TERIMA_DESKRIPSI_MASTER: "Terima deskripsi master",
};
