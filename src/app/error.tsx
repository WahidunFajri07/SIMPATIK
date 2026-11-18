"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      className="empty-state"
      style={{ minHeight: "100dvh", justifyContent: "center" }}
    >
      <h1>Ruang kerja belum dapat dibuka.</h1>
      <p>Periksa koneksi, lalu coba muat ulang.</p>
      <button className="btn btn-primary" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
