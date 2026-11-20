import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rencanakanKonfirmasiBanyak,
  type KonfirmasiBanyak,
} from "../src/lib/repositori";
import type { Hasil } from "../src/lib/tipe";

function hasil(overrides: Partial<Hasil> = {}): Hasil {
  return {
    id: "1",
    sesiId: "sesi-1",
    masterId: "master-1",
    deskripsiA: "TRF-001",
    sumber: "Master Trafo",
    ax: 107.6,
    ay: -6.9,
    status: "AKURAT",
    jarak: 2,
    deskripsiB: "TRF-001",
    bx: 107.60001,
    by: -6.90001,
    keputusan: "BELUM_DITINJAU",
    hasilX: null,
    hasilY: null,
    hasilDeskripsi: null,
    ...overrides,
  };
}

function input(
  keputusan: KonfirmasiBanyak["keputusan"],
  ids = ["1"],
): KonfirmasiBanyak {
  return { sesiId: "sesi-1", ids, keputusan };
}

test("bulk valid menyiapkan semua titik dan menghitung keputusan baru", () => {
  const rencana = rencanakanKonfirmasiBanyak(
    [hasil({ id: "1" }), hasil({ id: "2", bx: 107.7 })],
    input("TERKONFIRMASI_VALID", ["1", "2"]),
  );

  assert.equal(rencana.diperbarui, 2);
  assert.equal(rencana.baruDikonfirmasi, 2);
  assert.equal(rencana.perubahan[0].data.hasilX, 107.60001);
  assert.equal(rencana.perubahan[1].data.hasilX, 107.7);
});

test("bulk pakai master mengambil koordinat A", () => {
  const rencana = rencanakanKonfirmasiBanyak(
    [hasil({ id: "1" })],
    input("PAKAI_KOORDINAT_MASTER"),
  );

  assert.equal(rencana.perubahan[0].data.hasilX, 107.6);
  assert.equal(rencana.perubahan[0].data.hasilY, -6.9);
});

test("terima deskripsi master hanya menerima kandidat terdekat", () => {
  const kandidat = hasil({
    status: "KANDIDAT_LOKASI_TERDEKAT",
    deskripsiA: "TRF-001",
  });
  const rencana = rencanakanKonfirmasiBanyak(
    [kandidat],
    input("TERIMA_DESKRIPSI_MASTER"),
  );

  assert.equal(rencana.perubahan[0].data.hasilDeskripsi, "TRF-001");
});

test("batch campuran kandidat dan akurat ditolak sebelum perubahan", () => {
  assert.throws(
    () =>
      rencanakanKonfirmasiBanyak(
        [
          hasil({ id: "1", status: "KANDIDAT_LOKASI_TERDEKAT" }),
          hasil({ id: "2", status: "AKURAT" }),
        ],
        input("TERIMA_DESKRIPSI_MASTER", ["1", "2"]),
      ),
    /hanya untuk kandidat lokasi terdekat/i,
  );
});

test("bulk menolak daftar kosong dan lebih dari 500 titik", () => {
  assert.throws(
    () => rencanakanKonfirmasiBanyak([], input("TERKONFIRMASI_VALID", [])),
    /minimal satu titik/i,
  );
  assert.throws(
    () =>
      rencanakanKonfirmasiBanyak(
        [],
        input(
          "TERKONFIRMASI_VALID",
          Array.from({ length: 501 }, (_, i) => String(i)),
        ),
      ),
    /maksimal 500/i,
  );
});

test("bulk menolak koordinat baru dan daftar duplikat", () => {
  assert.throws(
    () =>
      rencanakanKonfirmasiBanyak(
        [hasil()],
        input("PAKAI_KOORDINAT_BARU" as never),
      ),
    /tidak bisa diterapkan massal/i,
  );
  assert.throws(
    () =>
      rencanakanKonfirmasiBanyak(
        [hasil()],
        input("TERKONFIRMASI_VALID", ["1", "1"]),
      ),
    /duplikat/i,
  );
});

test("konfirmasi ulang tidak menambah hitungan keputusan baru", () => {
  const rencana = rencanakanKonfirmasiBanyak(
    [hasil({ keputusan: "TERKONFIRMASI_VALID" })],
    input("TERKONFIRMASI_VALID"),
  );

  assert.equal(rencana.baruDikonfirmasi, 0);
});
