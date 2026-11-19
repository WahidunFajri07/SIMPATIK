"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownToLine,
  History,
  Plus,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DialogHapus, DialogUbahNama } from "@/components/ui/dialog-aksi";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { api, jumlah } from "@/lib/klien";
import type { Sesi } from "@/lib/tipe";
export default function Page() {
  const [sessions, setSessions] = useState<Sesi[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState(""),
    [ubah, setUbah] = useState<Sesi | null>(null),
    [hapus, setHapus] = useState<Sesi | null>(null),
    [toast, setToast] = useState("");
  async function load() {
    try {
      const [s, m] = await Promise.all([
        api<{ sesi: Sesi[] }>("/api/sesi"),
        api<{ mode: string }>("/api/master"),
      ]);
      setSessions(s.sesi);
      setMode(m.mode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
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
          <AnimatePresence initial={false}>
            {sessions
              .filter((s) =>
                s.nama.toLowerCase().includes(search.toLowerCase()),
              )
              .map((s, i) => (
                <motion.article
                  key={s.id}
                  layout
                  exit={{
                    opacity: 0,
                    x: 24,
                    transition: { duration: 0.25 },
                  }}
                  className="history-row"
                >
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
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      onClick={() => setUbah(s)}
                      aria-label={`Ubah nama ${s.nama}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => setHapus(s)}
                      aria-label={`Hapus ${s.nama}`}
                    >
                      <Trash2 size={15} />
                    </button>
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
                </motion.article>
              ))}
          </AnimatePresence>
        </div>
        {!sessions.length && !error && (
          <div className="empty-state">
            {loading
              ? "Membuka riwayat…"
              : "Belum ada sesi. Mulai pencocokan pertama Anda."}
          </div>
        )}
      </div>
      <DialogUbahNama
        open={!!ubah}
        judul="Ubah nama sesi"
        label="Nama sesi"
        nilai={ubah?.nama ?? ""}
        onClose={() => setUbah(null)}
        onSimpan={async (nama) => {
          if (!ubah) return;
          await api("/api/sesi", {
            method: "PATCH",
            body: JSON.stringify({ id: ubah.id, nama }),
          });
          setUbah(null);
          setToast("Nama sesi diperbarui.");
          void load();
        }}
      />
      <DialogHapus
        open={!!hapus}
        judul="Hapus sesi pencocokan"
        nama={hapus?.nama ?? ""}
        akibat={`${jumlah(hapus?.total ?? 0)} hasil pencocokan dan ${hapus?.dikonfirmasi ?? 0} keputusan ikut terhapus. Tidak bisa dikembalikan.`}
        catatan="Sumber master acuan tetap aman — yang hilang hanya catatan tinjauan ini."
        onClose={() => setHapus(null)}
        onHapus={async () => {
          if (!hapus) return;
          const namaLama = hapus.nama;
          await api(`/api/sesi?id=${hapus.id}`, { method: "DELETE" });
          setHapus(null);
          setToast(`Sesi “${namaLama}” dihapus.`);
          void load();
        }}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
