import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bersihkanKode,
  koordinat,
  petakanBaris,
} from "../src/lib/bersihkan-data";
import { buatPencocok, haversine } from "../src/lib/rumus-jarak";
import type { Master, TitikMaster } from "../src/lib/tipe";
const masters: Master[] = [
  {
    id: "m1",
    nama: "Trafo",
    kategori: "TRAFO",
    file: "a.csv",
    total: 3,
    dibuat: "",
  },
  {
    id: "m2",
    nama: "DIL",
    kategori: "DIL",
    file: "b.csv",
    total: 1,
    dibuat: "",
  },
];
const points: TitikMaster[] = [
  {
    id: "1",
    masterId: "m1",
    deskripsi: "TRF-001A",
    bersih: "TRF001A",
    x: 107.6,
    y: -6.9,
  },
  {
    id: "2",
    masterId: "m1",
    deskripsi: "TRF-001B",
    bersih: "TRF001B",
    x: 107.61,
    y: -6.9,
  },
  {
    id: "3",
    masterId: "m2",
    deskripsi: "TRF 001A",
    bersih: "TRF001A",
    x: 107.6003,
    y: -6.9,
  },
  {
    id: "4",
    masterId: "m1",
    deskripsi: "TRF-999Z",
    bersih: "TRF999Z",
    x: 107.60031,
    y: -6.9,
  },
];
const match = buatPencocok(points, masters, 15);
test("normalisasi mempertahankan sufiks huruf dan angka", () => {
  assert.equal(bersihkanKode(" trf-001 a "), "TRF001A");
  assert.notEqual(bersihkanKode("TRF-001A"), bersihkanKode("TRF-001B"));
});
test("koma desimal, sumbu tertukar, koordinat kosong dan tidak valid", () => {
  assert.deepEqual(koordinat("-6,712", "107,2"), {
    x: 107.2,
    y: -6.712,
    ditukar: true,
  });
  assert.throws(() => koordinat("", -6));
  assert.throws(() => koordinat(181, -6));
  assert.throws(() => koordinat(Infinity, 0));
});
test("deskripsi B opsional; master tetap wajib punya identitas", () => {
  const rows = [{ X: 107, Y: -6 }];
  assert.equal(
    petakanBaris(rows, { deskripsi: "", x: "X", y: "Y" }, false).titik.length,
    1,
  );
  assert.equal(
    petakanBaris(rows, { deskripsi: "", x: "X", y: "Y" }, true).errors.length,
    1,
  );
});
test("kode sama dari beberapa master memilih kode dengan jarak paling dekat", () => {
  const h = match({ deskripsi: "trf-001a", x: 107.600299, y: -6.9 }, "1", "s");
  assert.equal(h.masterId, "3");
  assert.equal(h.status, "AKURAT");
  assert.equal(h.sumber, "DIL");
});
test("kode diutamakan walau ada master dengan kode lain yang lebih dekat", () => {
  const h = match({ deskripsi: "TRF-001B", x: 107.60031, y: -6.9 }, "1", "s");
  assert.equal(h.masterId, "2");
  assert.equal(h.status, "PERLU_KOREKSI_JARAK");
});
test("kode kosong atau tidak ditemukan menjadi kandidat, bukan akurat", () => {
  for (const deskripsi of ["", "KODE-BARU"]) {
    const h = match({ deskripsi, x: 107.60031, y: -6.9 }, "1", "s");
    assert.equal(h.masterId, "4");
    assert.equal(h.status, "KANDIDAT_LOKASI_TERDEKAT");
    assert.equal(h.deskripsiA, "TRF-999Z");
  }
});
test("pencarian spasial berhenti di 100 meter", () => {
  assert.equal(
    match({ deskripsi: "", x: 108, y: -6.9 }, "1", "s").status,
    "TIDAK_DITEMUKAN",
  );
  const only = buatPencocok([points[0]], masters, 15);
  assert.equal(
    only({ deskripsi: "", x: 107.6, y: -6.9 + 99 / 111195 }, "1", "s").status,
    "KANDIDAT_LOKASI_TERDEKAT",
  );
  assert.equal(
    only({ deskripsi: "", x: 107.6, y: -6.9 + 101 / 111195 }, "1", "s").status,
    "TIDAK_DITEMUKAN",
  );
});
test("jarak Haversine dan toleransi nol", () => {
  assert.equal(haversine(107, -6, 107, -6), 0);
  assert.ok(Math.abs(haversine(0, 0, 0, 1) - 111195.08) < 1);
  const zero = buatPencocok([points[0]], masters, 0);
  assert.equal(
    zero({ deskripsi: "TRF001A", x: 107.6, y: -6.9 }, "1", "s").status,
    "AKURAT",
  );
});
test("grid spasial menangani batas sel dan 50.000 titik", () => {
  const many = Array.from({ length: 50000 }, (_, i) => ({
    ...points[0],
    id: String(i),
    bersih: `T${i}`,
    deskripsi: `T${i}`,
    x: 100 + (i % 1000) * 0.001,
    y: -8 + Math.floor(i / 1000) * 0.001,
  }));
  const engine = buatPencocok(many, masters, 15);
  const h = engine(
    { deskripsi: "", x: many[1999].x + 0.000001, y: many[1999].y },
    "1",
    "s",
  );
  assert.equal(h.masterId, "1999");
  assert.equal(h.status, "KANDIDAT_LOKASI_TERDEKAT");
});
