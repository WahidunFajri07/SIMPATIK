"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownToLine,
  History,
  Plus,
  Search,
} from "lucide-react";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { api, jumlah } from "@/lib/klien";
import type { Sesi } from "@/lib/tipe";
export default function Page() {
  const [sessions, setSessions] = useState<Sesi[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState("");
  useEffect(() => {
    Promise.all([
      api<{ sesi: Sesi[] }>("/api/sesi"),
      api<{ mode: string }>("/api/master"),
    ])
      .then(([s, m]) => {
        setSessions(s.sesi);
        setMode(m.mode);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="collection-page">
      <LatarInteraktif />
      <KepalaHalaman bagian="Riwayat Sesi" demo={mode === "demo"} />
      <div className="collection-body">
        <div className="page-title-row">
          <div>
            <span className="section-kicker">
              <span /> JEJAK PEKERJAAN ANDA
            </span>
            <h1>Setiap sesi, tercatat.</h1>
            <p>
              Lanjutkan tinjauan, periksa keputusan, atau unduh hasil pekerjaan
              sebelumnya.
            </p>
          </div>
          <Link href="/ruang-kerja?baru=1" className="btn btn-primary">
            <Plus size={16} /> Sesi baru
          </Link>
        </div>
        <div className="collection-summary">
          <span>
            <History size={16} />
            <b>{sessions.length}</b> sesi pencocokan
          </span>
          <span className="small-divider" />
          <span>
            <b>{jumlah(sessions.reduce((n, s) => n + s.total, 0))}</b> titik
            ditinjau
          </span>
        </div>
        <div className="search-field history-search">
          <Search size={15} />
          <input
            aria-label="Cari riwayat sesi"
            placeholder="Cari nama sesi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="history-list">
          {sessions
            .filter((s) => s.nama.toLowerCase().includes(search.toLowerCase()))
            .map((s, i) => (
              <article key={s.id} className="history-row">
                <span className="history-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="history-title">
                  <span>
                    {new Date(s.dibuat).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Jakarta",
                    })}{" "}
                    WIB
                  </span>
                  <Link href={`/ruang-kerja?sesi=${s.id}`}>
                    <h2>{s.nama}</h2>
                  </Link>
                  <p>
                    {s.masterIds.length} sumber master <i /> Toleransi{" "}
                    {s.toleransi} m <i /> {jumlah(s.total)} titik
                  </p>
                </div>
                <div className="history-progress">
                  <div>
                    <span
                      style={{
                        width: `${s.total ? (s.akurat / s.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p>
                    <span>{s.akurat} akurat</span>
                    <span>{s.tinjau} perlu ditinjau</span>
                  </p>
                  <small>{s.dikonfirmasi} keputusan tersimpan</small>
                </div>
                <a
                  href={`/api/konfirmasi?sesiId=${s.id}&format=xlsx`}
                  className="icon-btn"
                  aria-label={`Ekspor ${s.nama}`}
                >
                  <ArrowDownToLine size={16} />
                </a>
                <Link
                  href={`/ruang-kerja?sesi=${s.id}`}
                  className="history-open"
                >
                  Lanjutkan <ArrowUpRight size={15} />
                </Link>
              </article>
            ))}
        </div>
        {!sessions.length && !error && (
          <div className="empty-state">
            {loading
              ? "Membuka riwayat…"
              : "Belum ada sesi. Mulai pencocokan pertama Anda."}
          </div>
        )}
      </div>
    </main>
  );
}
