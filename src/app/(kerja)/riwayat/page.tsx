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
import {
  DialogHapus,
  DialogHapusBanyak,
  DialogUbahNama,
} from "@/components/ui/dialog-aksi";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { api, jumlah } from "@/lib/klien";
import { useKlikDiLuar } from "@/lib/use-klik-luar";
import { LABEL_STATUS } from "@/lib/tipe";
import type { Sesi } from "@/lib/tipe";

const FORMAT_LABEL: Record<string, string> = {
  xlsx: "Excel 3-Sheet",
  csv: "CSV",
  kml: "KML",
  geojson: "GeoJSON",
};

export default function Page() {
  const [sessions, setSessions] = useState<Sesi[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState(""),
    [ubah, setUbah] = useState<Sesi | null>(null),
    [hapus, setHapus] = useState<Sesi | null>(null),
    [hapusBanyak, setHapusBanyak] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [quickExport, setQuickExport] = useState<string | null>(null),
    [exportFormat, setExportFormat] = useState("xlsx"),
    [exportStatus, setExportStatus] = useState("SEMUA"),
    [autoFill, setAutoFill] = useState(false),
    [toast, setToast] = useState("");
  const quickExportRef = useKlikDiLuar<HTMLDivElement>(
    quickExport !== null,
    () => setQuickExport(null),
  );
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
  const visible = sessions.filter((s) =>
    s.nama.toLowerCase().includes(search.toLowerCase()),
  );
  const visibleIds = visible.map((s) => s.id),
    allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  function pilihSemuaVisible() {
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  }
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
        <div className="history-toolbar">
          <label className="bulk-select">
            <input
              type="checkbox"
              aria-label="Pilih semua sesi yang terlihat"
              checked={allVisibleSelected}
              onChange={pilihSemuaVisible}
            />
            Pilih semua
          </label>
          <div className="search-field history-search">
            <Search size={15} />
            <input
              aria-label="Cari riwayat sesi"
              placeholder="Cari nama sesi…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="history-list">
          <AnimatePresence initial={false}>
            {visible.map((s, i) => (
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
                <label className="history-select">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${s.nama}`}
                    checked={selected.includes(s.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, s.id]
                          : current.filter((id) => id !== s.id),
                      );
                    }}
                  />
                </label>
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
                <div
                  className="history-export-wrap"
                  ref={quickExport === s.id ? quickExportRef : undefined}
                >
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
                    <button
                      className="quick-export-btn"
                      onClick={() =>
                        setQuickExport(quickExport === s.id ? null : s.id)
                      }
                      aria-label={`Export Cepat ${s.nama}`}
                    >
                      <ArrowDownToLine size={15} /> Export Cepat
                    </button>
                  </div>
                  {quickExport === s.id && (
                    <div
                      className="quick-export-menu"
                      aria-label={`Export Cepat ${s.nama}`}
                    >
                      <label className="export-auto-fill">
                        <input
                          type="checkbox"
                          checked={autoFill}
                          onChange={(e) => setAutoFill(e.target.checked)}
                        />
                        Isi Keterangan kosong dengan Status Sistem
                      </label>
                      <label className="export-field">
                        Format
                        <select
                          aria-label="Format ekspor"
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value)}
                        >
                          {Object.entries(FORMAT_LABEL).map(([format, label]) => (
                            <option key={format} value={format}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="export-field">
                        Status
                        <select
                          aria-label="Status ekspor"
                          value={exportStatus}
                          onChange={(e) => setExportStatus(e.target.value)}
                        >
                          <option value="SEMUA">Semua status</option>
                          {Object.entries(LABEL_STATUS).map(([status, label]) => (
                            <option key={status} value={status}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <a
                        className="export-download"
                        href={`/api/konfirmasi?${new URLSearchParams({
                          sesiId: s.id,
                          format: exportFormat,
                          ...(exportStatus !== "SEMUA"
                            ? { status: exportStatus }
                            : {}),
                          ...(autoFill
                            ? { isiKeteranganOtomatis: "true" }
                            : {}),
                        })}`}
                        onClick={() => setQuickExport(null)}
                      >
                        Unduh {FORMAT_LABEL[exportFormat]} —{" "}
                        {exportStatus === "SEMUA"
                          ? "Semua status"
                          : LABEL_STATUS[exportStatus as keyof typeof LABEL_STATUS]}
                      </a>
                    </div>
                  )}
                </div>
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
      {selected.length > 0 && (
        <div className="selection-bar history-selection-bar">
          <span>
            <b>{selected.length}</b> sesi dipilih
          </span>
          <button onClick={() => setSelected([])}>Batalkan</button>
          <button
            className="btn btn-danger"
            onClick={() => setHapusBanyak(true)}
          >
            <Trash2 size={14} /> Hapus terpilih
          </button>
        </div>
      )}
      <DialogHapusBanyak
        open={hapusBanyak}
        judul="Hapus sesi terpilih"
        jumlah={selected.length}
        akibat="Hasil pencocokan dan keputusan dari sesi terpilih ikut terhapus permanen."
        catatan="Sumber master acuan tetap aman."
        onClose={() => setHapusBanyak(false)}
        onHapus={async () => {
          const ids = selected;
          await api("/api/sesi", {
            method: "DELETE",
            body: JSON.stringify({ ids }),
          });
          setSelected([]);
          setHapusBanyak(false);
          setToast(`${ids.length} sesi dihapus.`);
          void load();
        }}
      />
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
