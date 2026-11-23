import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRIORITAS_PETA,
  posisiEfektif,
  deskripsiEfektif,
} from "../src/lib/repositori";
import type { Hasil } from "../src/lib/tipe";

const dasar: Hasil = {
  id: "1",
  sesiId: "s",
  masterId: null,
  deskripsiA: "TRAFO A",
  sumber: "master.csv",
  ax: 107.7,
  ay: -6.8,
  status: "PERLU_KOREKSI_JARAK",
  jarak: 40,
  deskripsiB: "TRAFO B",
  bx: 107.71,
  by: -6.81,
  keputusan: "BELUM_DITINJAU",
  hasilX: null,
  hasilY: null,
  hasilDeskripsi: null,
};

test("posisi peta memakai koordinat B sebelum konfirmasi", () => {
  assert.deepEqual(posisiEfektif(dasar), { x: 107.71, y: -6.81 });
});

test("posisi peta pindah ke hasil koreksi setelah konfirmasi", () => {
  const h = {
    ...dasar,
    keputusan: "PAKAI_KOORDINAT_MASTER" as const,
    hasilX: 107.7,
    hasilY: -6.8,
  };
  assert.deepEqual(posisiEfektif(h), { x: 107.7, y: -6.8 });
  // posisi B asli tetap tersimpan untuk audit trail
  assert.equal(h.bx, 107.71);
});

test("deskripsi peta mendahulukan hasil, lalu B, lalu A", () => {
  assert.equal(deskripsiEfektif(dasar), "TRAFO B");
  assert.equal(
    deskripsiEfektif({ ...dasar, hasilDeskripsi: "FINAL" }),
    "FINAL",
  );
  assert.equal(
    deskripsiEfektif({ ...dasar, deskripsiB: "", deskripsiA: null }),
    "Tanpa deskripsi",
  );
});

test("urutan prioritas peta menaruh anomali sebelum AKURAT", () => {
  assert.deepEqual(PRIORITAS_PETA, [
    "PERLU_KOREKSI_JARAK",
    "KANDIDAT_LOKASI_TERDEKAT",
    "TIDAK_DITEMUKAN",
    "AKURAT",
  ]);
  const acak = ["AKURAT", "TIDAK_DITEMUKAN", "PERLU_KOREKSI_JARAK"] as const;
  const urut = [...acak].sort(
    (a, b) => PRIORITAS_PETA.indexOf(a) - PRIORITAS_PETA.indexOf(b),
  );
  assert.deepEqual(urut, ["PERLU_KOREKSI_JARAK", "TIDAK_DITEMUKAN", "AKURAT"]);
});
