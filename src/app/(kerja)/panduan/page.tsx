import { KepalaHalaman } from "@/components/kepala-halaman";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { pakaiPostgis } from "@/lib/db";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
export default function Page() {
  return (
    <main className="collection-page">
      <LatarInteraktif />
      <KepalaHalaman bagian="Panduan" demo={!pakaiPostgis} />
      <div className="collection-body guide-body">
        <span className="section-kicker">
          <span /> MULAI DARI TITIK YANG TEPAT
        </span>
        <h1>Ruang kerja, tanpa tebak-tebakan.</h1>
        <p className="guide-intro">
          SIMPATIK mencocokkan kode dan lokasi, lalu memberikan ruang bagi Anda
          untuk memutuskan.
        </p>
        <div className="guide-steps">
          {[
            {
              n: "01",
              title: "Siapkan sumber master",
              text: "Buka Gudang Master dan unggah Excel atau CSV. Pilih sheet, lalu petakan kolom deskripsi, longitude (X), dan latitude (Y). Setiap titik master harus memiliki deskripsi.",
            },
            {
              n: "02",
              title: "Bawa data lapangan",
              text: "Pilih Sesi Baru. Unggah data tinjauan, centang sumber master, dan tentukan toleransi (default 15 meter). Kolom deskripsi B boleh dikosongkan.",
            },
            {
              n: "03",
              title: "Baca hasilnya",
              text: "Kode dicocokkan terlebih dahulu. Jika kode tidak ditemukan atau kosong, sistem mencari master terdekat dalam radius 100 meter. Kandidat lokasi selalu memerlukan tinjauan manusia.",
            },
            {
              n: "04",
              title: "Tinjau dan putuskan",
              text: "Klik baris tabel untuk mendekatkan kamera dan melihat jarak A–B. Konfirmasi data B valid, ambil koordinat master, terima identitas master, atau isi koordinat baru. Pilihan langsung tersimpan.",
            },
            {
              n: "05",
              title: "Bawa pulang hasil kerja",
              text: "Ekspor Excel atau CSV dari laci tabel atau Riwayat Sesi. File memuat data A dan B asli, sumber master, jarak, status, keputusan, dan koordinat hasil koreksi.",
            },
          ].map((s) => (
            <section key={s.n}>
              <span>{s.n}</span>
              <div>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </div>
            </section>
          ))}
        </div>
        <div className="notice">
          <strong>Tentang koordinat</strong>
          <br />
          Gunakan WGS84 (EPSG:4326), dalam derajat desimal. Format koma desimal
          diterima. Sistem memperbaiki X/Y yang terbalik bila keduanya berada
          pada rentang koordinat Indonesia. UTM perlu dikonversi sebelum
          diimpor.
        </div>
        <div className="guide-download">
          <a
            className="btn btn-secondary"
            href="/contoh/Simulasi_Multi_Sheet.xlsx"
            download
          >
            <ArrowDownToLine size={15} /> Contoh Excel multi-sheet
          </a>
          <a
            className="btn btn-secondary"
            href="/contoh/Koordinat_Tanpa_Deskripsi.csv"
            download
          >
            <ArrowDownToLine size={15} /> Contoh tanpa deskripsi
          </a>
          <a href="/ruang-kerja" className="btn btn-primary">
            Buka ruang kerja <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </main>
  );
}
