import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, pakaiPostgis, serial } from "./db";
import { lokal } from "./penyimpanan";
import { bersihkanKode } from "./bersihkan-data";
import { buatPencocok } from "./rumus-jarak";
import { ApiError } from "./api";
import type { Hasil, Keputusan, Master, Sesi, Status, Titik } from "./tipe";
export async function daftarMaster(): Promise<Master[]> {
  return pakaiPostgis
    ? serial(await db().gudangMaster.findMany({ orderBy: { dibuat: "desc" } }))
    : lokal((s) => s.masters);
}
export async function ubahMaster(
  id: string,
  input: { nama: string; kategori?: string },
): Promise<Master> {
  if (!pakaiPostgis) throw new ApiError("Ubah master butuh database.");
  if (await db().gudangMaster.findUnique({ where: { id } }))
    return serial<Master>(
      await db().gudangMaster.update({
        where: { id },
        data: {
          nama: input.nama.trim(),
          ...(input.kategori ? { kategori: input.kategori.trim() } : {}),
        },
      }),
    );
  throw new ApiError("Master tidak ditemukan.", 404);
}
export async function hapusMasterBanyak(ids: string[]): Promise<void> {
  if (!pakaiPostgis) throw new ApiError("Hapus master butuh database.");
  const unik = [...new Set(ids)];
  if (!unik.length) throw new ApiError("Pilih minimal satu master.");
  await db().$transaction(async (tx) => {
    const found = await tx.gudangMaster.findMany({
      where: { id: { in: unik } },
      select: { id: true },
    });
    if (found.length !== unik.length)
      throw new ApiError("Salah satu master tidak ditemukan.", 404);
    // Batch ikut dibuang agar batchId lama dapat dipakai ulang setelah penghapusan.
    await tx.batchImpor.deleteMany({
      where: { pemilik: { in: unik }, jenis: "master" },
    });
    // Titik master ikut terhapus lewat onDelete: Cascade.
    await tx.gudangMaster.deleteMany({ where: { id: { in: unik } } });
  });
}
export async function hapusMaster(id: string): Promise<void> {
  return hapusMasterBanyak([id]);
}
export async function ubahSesi(id: string, nama: string): Promise<Sesi> {
  if (!pakaiPostgis) throw new ApiError("Ubah sesi butuh database.");
  if (await db().sesiPencocokan.findUnique({ where: { id } }))
    return serial<Sesi>(
      await db().sesiPencocokan.update({
        where: { id },
        data: { nama: nama.trim() },
      }),
    );
  throw new ApiError("Sesi tidak ditemukan.", 404);
}
export async function hapusSesiBanyak(ids: string[]): Promise<void> {
  if (!pakaiPostgis) throw new ApiError("Hapus sesi butuh database.");
  const unik = [...new Set(ids)];
  if (!unik.length) throw new ApiError("Pilih minimal satu sesi.");
  await db().$transaction(async (tx) => {
    const found = await tx.sesiPencocokan.findMany({
      where: { id: { in: unik } },
      select: { id: true },
    });
    if (found.length !== unik.length)
      throw new ApiError("Salah satu sesi tidak ditemukan.", 404);
    await tx.batchImpor.deleteMany({
      where: { pemilik: { in: unik }, jenis: "sesi" },
    });
    // Hasil pencocokan ikut terhapus lewat onDelete: Cascade.
    await tx.sesiPencocokan.deleteMany({ where: { id: { in: unik } } });
  });
}
export async function hapusSesi(id: string): Promise<void> {
  return hapusSesiBanyak([id]);
}
export async function daftarSesi(): Promise<Sesi[]> {
  return pakaiPostgis
    ? serial(
        await db().sesiPencocokan.findMany({ orderBy: { dibuat: "desc" } }),
      )
    : lokal((s) => [...s.sesi].reverse());
}
type Impor = {
  id?: string;
  nama: string;
  kategori: string;
  file: string;
  titik: Titik[];
  batchId: string;
};
export async function imporMaster(input: Impor): Promise<Master> {
  if (input.titik.some((t) => !bersihkanKode(t.deskripsi)))
    throw new ApiError("Setiap titik master harus memiliki deskripsi.");
  if (!pakaiPostgis)
    return lokal((s) => {
      const batch = s.batches.find((b) =>
        b.startsWith(input.batchId + ":master:"),
      );
      if (batch) return s.masters.find((m) => m.id === batch.split(":")[2])!;
      let m = s.masters.find((m) => m.id === input.id);
      if (input.id && !m) throw new ApiError("Master tidak ditemukan.", 404);
      if (!m) {
        m = {
          id: randomUUID(),
          nama: input.nama,
          kategori: input.kategori,
          file: input.file,
          total: 0,
          dibuat: new Date().toISOString(),
        };
        s.masters.push(m);
      }
      let next = s.titik.reduce((a, p) => Math.max(a, Number(p.id)), 0);
      for (const t of input.titik)
        s.titik.push({
          ...t,
          id: String(++next),
          masterId: m.id,
          bersih: bersihkanKode(t.deskripsi),
        });
      m.total += input.titik.length;
      s.batches.push(`${input.batchId}:master:${m.id}`);
      return m;
    }, true);
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.batchId}))::text`;
      const previous = await tx.batchImpor.findUnique({
        where: { id: input.batchId },
      });
      if (previous) {
        if (previous.jenis !== "master")
          throw new ApiError("Batch sudah digunakan.");
        return serial<Master>(
          await tx.gudangMaster.findUniqueOrThrow({
            where: { id: previous.pemilik },
          }),
        );
      }
      let master = input.id
        ? await tx.gudangMaster.findUnique({ where: { id: input.id } })
        : await tx.gudangMaster.create({
            data: {
              nama: input.nama,
              kategori: input.kategori,
              file: input.file,
            },
          });
      if (!master) throw new ApiError("Master tidak ditemukan.", 404);
      await tx.titikMaster.createMany({
        data: input.titik.map((t) => ({
          masterId: master!.id,
          deskripsi: t.deskripsi,
          bersih: bersihkanKode(t.deskripsi),
          x: t.x,
          y: t.y,
          info: (t.info ?? {}) as Prisma.InputJsonValue,
        })),
      });
      master = await tx.gudangMaster.update({
        where: { id: master.id },
        data: { total: { increment: input.titik.length } },
      });
      await tx.batchImpor.create({
        data: { id: input.batchId, pemilik: master.id, jenis: "master" },
      });
      return serial<Master>(master);
    },
    { timeout: 60000 },
  );
}
type Cocok = {
  sesiId?: string;
  nama: string;
  masterIds: string[];
  toleransi: number;
  titik: Titik[];
  batchId: string;
};
export async function cocokkan(input: Cocok): Promise<Sesi> {
  const masters = await daftarMaster();
  if (
    input.masterIds.some(
      (id) => !masters.some((m) => m.id === id && m.total > 0),
    )
  )
    throw new ApiError("Master acuan tidak ditemukan atau masih kosong.");
  if (!pakaiPostgis)
    return lokal((s) => {
      const batch = s.batches.find((b) =>
        b.startsWith(input.batchId + ":sesi:"),
      );
      if (batch) return s.sesi.find((a) => a.id === batch.split(":")[2])!;
      let sesi = s.sesi.find((a) => a.id === input.sesiId);
      if (input.sesiId && !sesi)
        throw new ApiError("Sesi tidak ditemukan.", 404);
      if (!sesi) {
        sesi = {
          id: randomUUID(),
          nama: input.nama,
          masterIds: input.masterIds,
          toleransi: input.toleransi,
          total: 0,
          akurat: 0,
          tinjau: 0,
          dikonfirmasi: 0,
          dibuat: new Date().toISOString(),
        };
        s.sesi.push(sesi);
      }
      if (sesi.total + input.titik.length > 100000)
        throw new ApiError("Batas sesi adalah 100.000 titik.");
      const engine = buatPencocok(
        s.titik.filter((t) => sesi!.masterIds.includes(t.masterId)),
        masters,
        sesi.toleransi,
      );
      let next = s.hasil.reduce((a, p) => Math.max(a, Number(p.id)), 0);
      const hasil = input.titik.map((t) => engine(t, String(++next), sesi!.id));
      s.hasil.push(...hasil);
      sesi.total += hasil.length;
      sesi.akurat += hasil.filter((h) => h.status === "AKURAT").length;
      sesi.tinjau = sesi.total - sesi.akurat;
      s.batches.push(`${input.batchId}:sesi:${sesi.id}`);
      return sesi;
    }, true);
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.batchId}))::text`;
      const previous = await tx.batchImpor.findUnique({
        where: { id: input.batchId },
      });
      if (previous) {
        if (previous.jenis !== "sesi")
          throw new ApiError("Batch sudah digunakan.");
        return serial<Sesi>(
          await tx.sesiPencocokan.findUniqueOrThrow({
            where: { id: previous.pemilik },
          }),
        );
      }
      const sesi = input.sesiId
        ? await tx.sesiPencocokan.findUnique({ where: { id: input.sesiId } })
        : await tx.sesiPencocokan.create({
            data: {
              nama: input.nama,
              masterIds: input.masterIds,
              toleransi: input.toleransi,
            },
          });
      if (!sesi) throw new ApiError("Sesi tidak ditemukan.", 404);
      // Serialize batches belonging to the same session, including the 100k guard.
      await tx.$queryRaw`SELECT id FROM sesi_pencocokan WHERE id = ${sesi.id}::uuid FOR UPDATE`;
      const latest = await tx.sesiPencocokan.findUniqueOrThrow({
        where: { id: sesi.id },
      });
      if (latest.total + input.titik.length > 100000)
        throw new ApiError("Batas sesi adalah 100.000 titik.");
      const payload = JSON.stringify(
        input.titik.map((t) => ({ ...t, bersih: bersihkanKode(t.deskripsi) })),
      );
      await tx.$executeRaw`
      WITH b AS (
        SELECT *, ST_SetSRID(ST_MakePoint(x,y),4326) AS geom
        FROM jsonb_to_recordset(${payload}::jsonb) AS t(deskripsi text, bersih text, x float8, y float8)
      ), pasangan AS (
        SELECT b.*, COALESCE(k.id,n.id) AS aid, COALESCE(k.deskripsi_a_asli,n.deskripsi_a_asli) AS kode,
          COALESCE(k.master_id,n.master_id) AS mid, COALESCE(k.koordinat_x,n.koordinat_x) AS ax,
          COALESCE(k.koordinat_y,n.koordinat_y) AS ay, COALESCE(k.jarak,n.jarak) AS jarak, k.id IS NOT NULL AS kode_cocok
        FROM b
        LEFT JOIN LATERAL (
          SELECT a.*, ST_DistanceSphere(b.geom,a.geom) AS jarak FROM titik_master a
          WHERE a.master_id IN (${Prisma.join(sesi.masterIds.map((id) => Prisma.sql`${id}::uuid`))})
            AND b.bersih <> '' AND a.deskripsi_a_bersih = b.bersih
          ORDER BY ST_DistanceSphere(b.geom,a.geom), a.id LIMIT 1
        ) k ON true
        LEFT JOIN LATERAL (
          SELECT a.*, ST_DistanceSphere(b.geom,a.geom) AS jarak FROM titik_master a
          WHERE k.id IS NULL AND a.master_id IN (${Prisma.join(sesi.masterIds.map((id) => Prisma.sql`${id}::uuid`))})
            AND ST_DWithin(a.geom::geography,b.geom::geography,100,false)
          ORDER BY a.geom::geography <-> b.geom::geography, a.id LIMIT 1
        ) n ON true
      )
      INSERT INTO hasil_pencocokan(sesi_id,titik_master_id,deskripsi_a,sumber_master,koordinat_a_x,koordinat_a_y,status_keterangan,jarak_meter,deskripsi_b,koordinat_b_x,koordinat_b_y)
      SELECT ${sesi.id}::uuid, p.aid,p.kode,m.nama_master,p.ax,p.ay,
        (CASE WHEN p.aid IS NULL THEN 'TIDAK_DITEMUKAN' WHEN NOT p.kode_cocok THEN 'KANDIDAT_LOKASI_TERDEKAT' WHEN p.jarak <= ${sesi.toleransi} THEN 'AKURAT' ELSE 'PERLU_KOREKSI_JARAK' END)::"Status",
        p.jarak,p.deskripsi,p.x,p.y FROM pasangan p LEFT JOIN gudang_master m ON m.id = p.mid`;
      const total = await tx.hasilPencocokan.count({
        where: { sesiId: sesi.id },
      });
      const akurat = await tx.hasilPencocokan.count({
        where: { sesiId: sesi.id, status: "AKURAT" },
      });
      const updated = await tx.sesiPencocokan.update({
        where: { id: sesi.id },
        data: { total, akurat, tinjau: total - akurat },
      });
      await tx.batchImpor.create({
        data: { id: input.batchId, pemilik: sesi.id, jenis: "sesi" },
      });
      return serial<Sesi>(updated);
    },
    { timeout: 120000 },
  );
}
export async function bacaHasil(
  sesiId: string,
  offset = 0,
  limit = 1000,
  belum = false,
): Promise<Hasil[]> {
  return pakaiPostgis
    ? serial(
        await db().hasilPencocokan.findMany({
          where: { sesiId, ...(belum ? { keputusan: "BELUM_DITINJAU" } : {}) },
          skip: offset,
          take: limit,
          orderBy: { id: "asc" },
        }),
      )
    : lokal((s) =>
        s.hasil
          .filter(
            (h) =>
              h.sesiId === sesiId &&
              (!belum || h.keputusan === "BELUM_DITINJAU"),
          )
          .slice(offset, offset + limit),
      );
}
type Konfirmasi = {
  id: string;
  sesiId: string;
  keputusan: Exclude<Keputusan, "BELUM_DITINJAU">;
  x?: number;
  y?: number;
};
export type KonfirmasiBanyak = {
  sesiId: string;
  ids: string[];
  keputusan: Exclude<Keputusan, "BELUM_DITINJAU" | "PAKAI_KOORDINAT_BARU">;
};
const BATAS_KONFIRMASI_MASSAL = 500;
export function rencanakanKonfirmasiBanyak(
  hasil: Hasil[],
  input: KonfirmasiBanyak,
) {
  if (!input.ids.length) throw new ApiError("Pilih minimal satu titik.");
  if (input.ids.length > BATAS_KONFIRMASI_MASSAL)
    throw new ApiError(
      `Maksimal ${BATAS_KONFIRMASI_MASSAL} titik per permintaan.`,
      413,
    );
  if (new Set(input.ids).size !== input.ids.length)
    throw new ApiError("ID titik tidak boleh duplikat.");
  if ((input.keputusan as string) === "PAKAI_KOORDINAT_BARU")
    throw new ApiError("Koordinat baru tidak bisa diterapkan massal.");
  const byId = new Map(hasil.map((h) => [h.id, h]));
  const target = input.ids.map((id) => byId.get(id));
  if (target.some((h) => !h))
    throw new ApiError("Sebagian titik tidak ditemukan pada sesi ini.", 404);
  const validTarget = target as Hasil[];
  const perubahan = validTarget.map((h) => ({
    h,
    data: terapkanKeputusan(h, {
      id: h.id,
      sesiId: input.sesiId,
      keputusan: input.keputusan,
    }),
  }));
  return {
    perubahan,
    diperbarui: perubahan.length,
    baruDikonfirmasi: perubahan.filter(
      ({ h }) => h.keputusan === "BELUM_DITINJAU",
    ).length,
  };
}
export function terapkanKeputusan(h: Hasil, input: Konfirmasi) {
  const perluMaster = [
    "PAKAI_KOORDINAT_MASTER",
    "TERIMA_DESKRIPSI_MASTER",
  ].includes(input.keputusan);
  if (perluMaster && (h.ax === null || h.ay === null || !h.deskripsiA))
    throw new ApiError("Hasil ini tidak memiliki pasangan master.");
  if (
    input.keputusan === "TERIMA_DESKRIPSI_MASTER" &&
    h.status !== "KANDIDAT_LOKASI_TERDEKAT"
  )
    throw new ApiError("Aksi ini hanya untuk kandidat lokasi terdekat.");
  if (
    input.keputusan === "PAKAI_KOORDINAT_BARU" &&
    (input.x === undefined || input.y === undefined)
  )
    throw new ApiError("Isi kedua koordinat baru.");
  return {
    keputusan: input.keputusan,
    hasilX:
      input.keputusan === "PAKAI_KOORDINAT_MASTER"
        ? h.ax
        : input.keputusan === "PAKAI_KOORDINAT_BARU"
          ? input.x!
          : h.bx,
    hasilY:
      input.keputusan === "PAKAI_KOORDINAT_MASTER"
        ? h.ay
        : input.keputusan === "PAKAI_KOORDINAT_BARU"
          ? input.y!
          : h.by,
    hasilDeskripsi:
      input.keputusan === "TERIMA_DESKRIPSI_MASTER"
        ? h.deskripsiA
        : h.deskripsiB || h.deskripsiA,
  };
}
export async function konfirmasiBanyak(input: KonfirmasiBanyak) {
  if (!pakaiPostgis)
    return lokal((s) => {
      const target = s.hasil.filter(
        (h) => h.sesiId === input.sesiId && input.ids.includes(h.id),
      );
      const rencana = rencanakanKonfirmasiBanyak(target, input);
      for (const { h, data } of rencana.perubahan) Object.assign(h, data);
      const sesi = s.sesi.find((a) => a.id === input.sesiId);
      if (sesi) sesi.dikonfirmasi += rencana.baruDikonfirmasi;
      return {
        diperbarui: rencana.diperbarui,
        baruDikonfirmasi: rencana.baruDikonfirmasi,
      };
    }, true);
  return db().$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM hasil_pencocokan
        WHERE sesi_id = ${input.sesiId}::uuid
          AND id IN (${Prisma.join(input.ids.map((id) => Prisma.sql`${BigInt(id)}`))})
        FOR UPDATE`;
      const rows = serial<Hasil[]>(
        await tx.hasilPencocokan.findMany({
          where: {
            sesiId: input.sesiId,
            id: { in: input.ids.map((id) => BigInt(id)) },
          },
          orderBy: { id: "asc" },
        }),
      );
      const rencana = rencanakanKonfirmasiBanyak(rows, input);
      for (const { h, data } of rencana.perubahan)
        await tx.hasilPencocokan.update({
          where: { id: BigInt(h.id) },
          data,
        });
      if (rencana.baruDikonfirmasi)
        await tx.sesiPencocokan.update({
          where: { id: input.sesiId },
          data: { dikonfirmasi: { increment: rencana.baruDikonfirmasi } },
        });
      return {
        diperbarui: rencana.diperbarui,
        baruDikonfirmasi: rencana.baruDikonfirmasi,
      };
    },
    { timeout: 120000 },
  );
}
export async function konfirmasi(input: Konfirmasi): Promise<Hasil> {
  if (!pakaiPostgis)
    return lokal((s) => {
      const h = s.hasil.find(
        (h) => h.id === input.id && h.sesiId === input.sesiId,
      );
      if (!h) throw new ApiError("Hasil tidak ditemukan.", 404);
      const pertama = h.keputusan === "BELUM_DITINJAU";
      Object.assign(h, terapkanKeputusan(h, input));
      if (pertama) s.sesi.find((a) => a.id === h.sesiId)!.dikonfirmasi++;
      return h;
    }, true);
  return db().$transaction(async (tx) => {
    const found = await tx.$queryRaw<
      Array<{ id: bigint }>
    >`SELECT id FROM hasil_pencocokan WHERE id = ${BigInt(input.id)} AND sesi_id = ${input.sesiId}::uuid FOR UPDATE`;
    if (!found.length) throw new ApiError("Hasil tidak ditemukan.", 404);
    const h = serial<Hasil>(
      await tx.hasilPencocokan.findUniqueOrThrow({
        where: { id: BigInt(input.id) },
      }),
    );
    const updated = await tx.hasilPencocokan.update({
      where: { id: BigInt(input.id) },
      data: terapkanKeputusan(h, input),
    });
    if (h.keputusan === "BELUM_DITINJAU")
      await tx.sesiPencocokan.update({
        where: { id: h.sesiId },
        data: { dikonfirmasi: { increment: 1 } },
      });
    return serial<Hasil>(updated);
  });
}
export type Batas = { minX: number; minY: number; maxX: number; maxY: number };
/** Anomali tampil lebih dulu agar tidak tertimbun titik AKURAT saat dipotong 8.000. */
export const PRIORITAS_PETA: Status[] = [
  "PERLU_KOREKSI_JARAK",
  "KANDIDAT_LOKASI_TERDEKAT",
  "TIDAK_DITEMUKAN",
  "AKURAT",
];
export const posisiEfektif = (h: Hasil) => ({
  x: h.hasilX ?? h.bx,
  y: h.hasilY ?? h.by,
});
export const deskripsiEfektif = (h: Hasil) =>
  h.hasilDeskripsi || h.deskripsiB || h.deskripsiA || "Tanpa deskripsi";
export async function titikPeta(b: Batas, sesiId?: string, status?: Status) {
  const limit = 8000;
  if (!pakaiPostgis)
    return lokal((s) => {
      const sesi = s.sesi.find((a) => a.id === sesiId);
      const inside = (x: number, y: number) =>
        x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
      const a = s.titik
        .filter(
          (p) =>
            (!sesi || sesi.masterIds.includes(p.masterId)) && inside(p.x, p.y),
        )
        .slice(0, limit + 1)
        .map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          deskripsi: p.deskripsi,
          jenis: "master",
          status: "MASTER",
          keputusan: "BELUM_DITINJAU",
        }));
      const review = sesi
        ? s.hasil
            .filter((p) => {
              const e = posisiEfektif(p);
              return (
                p.sesiId === sesiId &&
                (!status || p.status === status) &&
                inside(e.x, e.y)
              );
            })
            .sort(
              (p, q) =>
                PRIORITAS_PETA.indexOf(p.status) -
                  PRIORITAS_PETA.indexOf(q.status) ||
                Number(p.id) - Number(q.id),
            )
            .slice(0, limit + 1)
            .map((p) => {
              const e = posisiEfektif(p);
              return {
                id: p.id,
                x: e.x,
                y: e.y,
                deskripsi: deskripsiEfektif(p),
                jenis: "tinjauan",
                status: p.status,
                keputusan: p.keputusan,
              };
            })
        : [];
      return {
        points: [...a.slice(0, limit), ...review.slice(0, limit)],
        terbatas: a.length > limit || review.length > limit,
      };
    });
  const envelope = Prisma.sql`ST_MakeEnvelope(${b.minX},${b.minY},${b.maxX},${b.maxY},4326)`;
  const sesi = sesiId
    ? await db().sesiPencocokan.findUnique({ where: { id: sesiId } })
    : null;
  const masterFilter = sesi
    ? Prisma.sql`AND master_id IN (${Prisma.join(sesi.masterIds.map((id) => Prisma.sql`${id}::uuid`))})`
    : Prisma.empty;
  const a = await db().$queryRaw<
    Array<Record<string, unknown>>
  >`SELECT id::text,koordinat_x AS x,koordinat_y AS y,deskripsi_a_asli AS deskripsi,'master' AS jenis,'MASTER' AS status,'BELUM_DITINJAU' AS keputusan FROM titik_master WHERE geom && ${envelope} ${masterFilter} ORDER BY id LIMIT ${limit + 1}`;
  // Koordinat efektif = hasil koreksi bila sudah dikonfirmasi, jika tidak koordinat B.
  // Anomali diurutkan lebih dulu supaya tidak terpotong limit 8.000.
  const statusFilter = status
    ? Prisma.sql`AND status_keterangan = ${status}::"Status"`
    : Prisma.empty;
  // Cabang pertama memakai index GIST pada geom; cabang kedua menangkap titik
  // yang sudah dikoreksi keluar dari kotak aslinya.
  const dalamKotak = Prisma.sql`(geom && ${envelope}
      OR (COALESCE(hasil_x, koordinat_b_x) BETWEEN ${b.minX} AND ${b.maxX}
        AND COALESCE(hasil_y, koordinat_b_y) BETWEEN ${b.minY} AND ${b.maxY}))`;
  const review = sesiId
    ? await db().$queryRaw<Array<Record<string, unknown>>>`
        SELECT id::text,
               COALESCE(hasil_x, koordinat_b_x) AS x,
               COALESCE(hasil_y, koordinat_b_y) AS y,
               COALESCE(NULLIF(hasil_deskripsi,''), NULLIF(deskripsi_b,''), deskripsi_a, 'Tanpa deskripsi') AS deskripsi,
               'tinjauan' AS jenis,
               status_keterangan AS status,
               keputusan_konfirmasi AS keputusan
        FROM hasil_pencocokan
        WHERE sesi_id = ${sesiId}::uuid AND ${dalamKotak} ${statusFilter}
        ORDER BY array_position(ARRAY['PERLU_KOREKSI_JARAK','KANDIDAT_LOKASI_TERDEKAT','TIDAK_DITEMUKAN','AKURAT']::"Status"[], status_keterangan),
                 id
        LIMIT ${limit + 1}`
    : [];
  return {
    points: [...a.slice(0, limit), ...review.slice(0, limit)],
    terbatas: a.length > limit || review.length > limit,
  };
}
