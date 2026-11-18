CREATE EXTENSION IF NOT EXISTS postgis;
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AKURAT', 'PERLU_KOREKSI_JARAK', 'KANDIDAT_LOKASI_TERDEKAT', 'TIDAK_DITEMUKAN');

-- CreateEnum
CREATE TYPE "Keputusan" AS ENUM ('BELUM_DITINJAU', 'TERKONFIRMASI_VALID', 'PAKAI_KOORDINAT_MASTER', 'PAKAI_KOORDINAT_BARU', 'TERIMA_DESKRIPSI_MASTER');

-- CreateTable
CREATE TABLE "gudang_master" (
    "id" UUID NOT NULL,
    "nama_master" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "nama_file_asli" TEXT NOT NULL,
    "total_baris" INTEGER NOT NULL DEFAULT 0,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gudang_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titik_master" (
    "id" BIGSERIAL NOT NULL,
    "master_id" UUID NOT NULL,
    "deskripsi_a_asli" TEXT NOT NULL,
    "deskripsi_a_bersih" TEXT NOT NULL,
    "koordinat_x" DOUBLE PRECISION NOT NULL,
    "koordinat_y" DOUBLE PRECISION NOT NULL,
    "geom" geometry(Point,4326),
    "info_tambahan" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "titik_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesi_pencocokan" (
    "id" UUID NOT NULL,
    "nama_sesi" TEXT NOT NULL,
    "daftar_master_id" UUID[],
    "toleransi_meter" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "total_data" INTEGER NOT NULL DEFAULT 0,
    "total_akurat" INTEGER NOT NULL DEFAULT 0,
    "total_tinjau" INTEGER NOT NULL DEFAULT 0,
    "dikonfirmasi" INTEGER NOT NULL DEFAULT 0,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesi_pencocokan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_pencocokan" (
    "id" BIGSERIAL NOT NULL,
    "sesi_id" UUID NOT NULL,
    "titik_master_id" BIGINT,
    "deskripsi_a" TEXT,
    "sumber_master" TEXT,
    "koordinat_a_x" DOUBLE PRECISION,
    "koordinat_a_y" DOUBLE PRECISION,
    "status_keterangan" "Status" NOT NULL,
    "jarak_meter" DOUBLE PRECISION,
    "deskripsi_b" TEXT NOT NULL DEFAULT '',
    "koordinat_b_x" DOUBLE PRECISION NOT NULL,
    "koordinat_b_y" DOUBLE PRECISION NOT NULL,
    "keputusan_konfirmasi" "Keputusan" NOT NULL DEFAULT 'BELUM_DITINJAU',
    "hasil_x" DOUBLE PRECISION,
    "hasil_y" DOUBLE PRECISION,
    "hasil_deskripsi" TEXT,
    "geom" geometry(Point,4326),

    CONSTRAINT "hasil_pencocokan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_impor" (
    "id" UUID NOT NULL,
    "pemilik" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,

    CONSTRAINT "batch_impor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "titik_master_master_id_deskripsi_a_bersih_idx" ON "titik_master"("master_id", "deskripsi_a_bersih");

-- CreateIndex
CREATE INDEX "hasil_pencocokan_sesi_id_status_keterangan_idx" ON "hasil_pencocokan"("sesi_id", "status_keterangan");

-- AddForeignKey
ALTER TABLE "titik_master" ADD CONSTRAINT "titik_master_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "gudang_master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pencocokan" ADD CONSTRAINT "hasil_pencocokan_sesi_id_fkey" FOREIGN KEY ("sesi_id") REFERENCES "sesi_pencocokan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_pencocokan" ADD CONSTRAINT "hasil_pencocokan_titik_master_id_fkey" FOREIGN KEY ("titik_master_id") REFERENCES "titik_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX titik_master_geom_gist ON titik_master USING GIST (geom);
CREATE INDEX titik_master_geography_gist ON titik_master USING GIST ((geom::geography));
CREATE INDEX hasil_geom_gist ON hasil_pencocokan USING GIST (geom);
ALTER TABLE titik_master ADD CONSTRAINT titik_koordinat_valid CHECK (koordinat_x BETWEEN -180 AND 180 AND koordinat_y BETWEEN -90 AND 90);
ALTER TABLE hasil_pencocokan ADD CONSTRAINT hasil_koordinat_valid CHECK (koordinat_b_x BETWEEN -180 AND 180 AND koordinat_b_y BETWEEN -90 AND 90);
CREATE FUNCTION isi_geom_master() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.geom := ST_SetSRID(ST_MakePoint(NEW.koordinat_x, NEW.koordinat_y),4326); RETURN NEW; END $$;
CREATE TRIGGER isi_geom_master BEFORE INSERT OR UPDATE OF koordinat_x, koordinat_y ON titik_master FOR EACH ROW EXECUTE FUNCTION isi_geom_master();
CREATE FUNCTION isi_geom_hasil() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.geom := ST_SetSRID(ST_MakePoint(NEW.koordinat_b_x, NEW.koordinat_b_y),4326); RETURN NEW; END $$;
CREATE TRIGGER isi_geom_hasil BEFORE INSERT OR UPDATE OF koordinat_b_x, koordinat_b_y ON hasil_pencocokan FOR EACH ROW EXECUTE FUNCTION isi_geom_hasil();