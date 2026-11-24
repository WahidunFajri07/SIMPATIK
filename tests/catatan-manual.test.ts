import { test } from "node:test";
import assert from "node:assert/strict";
import { terapkanKeputusan } from "../src/lib/repositori";
import type { Hasil } from "../src/lib/tipe";

const hasil: Hasil = {
  id: "1",
  sesiId: "sesi",
  masterId: null,
  deskripsiA: "MASTER-1",
  sumber: "master.csv",
  ax: 107.6,
  ay: -6.9,
  status: "PERLU_KOREKSI_JARAK",
  jarak: 30,
  deskripsiB: "LAPANGAN-1",
  bx: 107.61,
  by: -6.91,
  keputusan: "BELUM_DITINJAU",
  hasilX: null,
  hasilY: null,
  hasilDeskripsi: null,
  catatanManual: null,
};

test("keputusan menyimpan catatan manual tanpa mengubah alur keputusan", () => {
  const updated = terapkanKeputusan(hasil, {
    id: hasil.id,
    sesiId: hasil.sesiId,
    keputusan: "PAKAI_KOORDINAT_MASTER",
    catatanManual: "Perlu cek lapangan",
  });
  assert.equal(updated.catatanManual, "Perlu cek lapangan");
  assert.equal(updated.keputusan, "PAKAI_KOORDINAT_MASTER");
});

test("catatan manual kosong dinormalisasi menjadi null", () => {
  assert.equal(
    terapkanKeputusan(hasil, {
      id: hasil.id,
      sesiId: hasil.sesiId,
      keputusan: "TERKONFIRMASI_VALID",
      catatanManual: "   ",
    }).catatanManual,
    null,
  );
});
