import Link from "next/link";
export default function NotFound() {
  return (
    <main
      className="empty-state"
      style={{ minHeight: "100dvh", justifyContent: "center" }}
    >
      <span className="eyebrow">SIMPATIK / 404</span>
      <h1>Titik ini belum terpetakan.</h1>
      <p>Halaman yang Anda cari tidak ditemukan.</p>
      <Link className="btn btn-primary" href="/ruang-kerja">
        Kembali ke ruang kerja
      </Link>
    </main>
  );
}
