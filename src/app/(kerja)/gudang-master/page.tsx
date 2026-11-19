"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Plus,
  Search,
  Layers3,
  ArrowUpRight,
  FileSpreadsheet,
  Database,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { DialogHapus, DialogUbahMaster } from "@/components/ui/dialog-aksi";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { PetakanKolom } from "@/components/modal/petakan-kolom";
import { Button } from "@/components/ui/button";
import { api, jumlah } from "@/lib/klien";
import type { Master } from "@/lib/tipe";
function KartuMaster({
  master,
  selected,
  pilih,
  onUbah,
  onHapus,
}: {
  master: Master;
  selected: boolean;
  pilih: () => void;
  onUbah: () => void;
  onHapus: () => void;
}) {
  const x = useMotionValue(0),
    y = useMotionValue(0),
    rx = useSpring(useTransform(y, [-0.5, 0.5], [5, -5])),
    ry = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]));
  return (
    <motion.article
      className={`master-card ${selected ? "selected" : ""}`}
      style={{
        rotateX: selected ? 0 : rx,
        rotateY: selected ? 0 : ry,
        transformPerspective: 900,
      }}
      onMouseMove={(e) => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div className="master-card-top">
        <span
          className={`master-icon category-${master.kategori.toLowerCase()}`}
        >
          <Layers3 size={23} />
        </span>
        <label className="select-master">
          <input
            type="checkbox"
            aria-label={`Pilih ${master.nama}`}
            checked={selected}
            onChange={pilih}
          />
        </label>
      </div>
      <span className="category-label">{master.kategori}</span>
      <h2>{master.nama}</h2>
      <p>
        <FileSpreadsheet size={12} />
        {master.file}
      </p>
      <div className="master-card-count">
        <strong>{jumlah(master.total)}</strong>
        <span>titik koordinat</span>
        <span className="data-health">
          <span /> Siap digunakan
        </span>
      </div>
      <div className="column-tags">
        <span>Deskripsi</span>
        <span>Longitude</span>
        <span>Latitude</span>
      </div>
      <footer>
        <span>
          {new Date(master.dibuat).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <div className="card-actions">
          <button
            className="card-action"
            onClick={(e) => {
              e.stopPropagation();
              onUbah();
            }}
            aria-label={`Ubah ${master.nama}`}
          >
            <Pencil size={14} />
          </button>
          <button
            className="card-action danger"
            onClick={(e) => {
              e.stopPropagation();
              onHapus();
            }}
            aria-label={`Hapus ${master.nama}`}
          >
            <Trash2 size={14} />
          </button>
          <button onClick={pilih} aria-label={`Gunakan ${master.nama}`}>
            <ArrowUpRight size={17} />
          </button>
        </div>
      </footer>
    </motion.article>
  );
}
export default function Page() {
  const [masters, setMasters] = useState<Master[]>([]),
    [mode, setMode] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("SEMUA"),
    [selected, setSelected] = useState<string[]>([]),
    [upload, setUpload] = useState(false),
    [match, setMatch] = useState(false),
    [ubah, setUbah] = useState<Master | null>(null),
    [hapus, setHapus] = useState<Master | null>(null),
    [toast, setToast] = useState("");
  async function load() {
    try {
      const d = await api<{ masters: Master[]; mode: string }>("/api/master");
      setMasters(d.masters);
      setMode(d.mode);
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
  const visible = masters.filter(
    (m) =>
      (category === "SEMUA" || m.kategori === category) &&
      `${m.nama} ${m.kategori} ${m.file}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <main className="collection-page">
      <LatarInteraktif />
      <KepalaHalaman bagian="Gudang Master" demo={mode === "demo"} />
      <div className="collection-body">
        <div className="page-title-row">
          <div>
            <span className="section-kicker">
              <span /> SUMBER DATA ACUAN
            </span>
            <h1>Data yang menjadi pegangan.</h1>
            <p>
              Kelola sumber master Anda. Pilih satu atau beberapa untuk mulai
              mencocokkan.
            </p>
          </div>
          <Button onClick={() => setUpload(true)}>
            <Plus size={16} /> Tambah master
          </Button>
        </div>
        <div className="collection-summary">
          <span>
            <Database size={16} />
            <b>{masters.length}</b> sumber master
          </span>
          <span className="small-divider" />
          <span>
            <b>{jumlah(masters.reduce((n, m) => n + m.total, 0))}</b> titik
            tersimpan
          </span>
          <span className="collection-meta">
            WGS84 <span>EPSG:4326</span>
          </span>
        </div>
        <div className="collection-toolbar">
          <div className="category-tabs">
            {["SEMUA", ...new Set(masters.map((m) => m.kategori))].map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c === "SEMUA" ? "Semua sumber" : c}
                <span>
                  {
                    masters.filter((m) => c === "SEMUA" || m.kategori === c)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="search-field">
            <Search size={15} />
            <input
              aria-label="Cari master"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari sumber master…"
            />
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="empty-state">Membuka gudang master…</div>
        ) : (
          <div className="master-grid">
            {visible.map((m) => (
              <KartuMaster
                key={m.id}
                master={m}
                selected={selected.includes(m.id)}
                pilih={() =>
                  setSelected(
                    selected.includes(m.id)
                      ? selected.filter((id) => id !== m.id)
                      : [...selected, m.id],
                  )
                }
                onUbah={() => setUbah(m)}
                onHapus={() => setHapus(m)}
              />
            ))}
            {!search && category === "SEMUA" && (
              <button
                className="add-master-card"
                onClick={() => setUpload(true)}
              >
                <span>
                  <Plus size={24} />
                </span>
                <strong>Sumber baru, kemungkinan baru.</strong>
                <p>
                  Tambahkan master Trafo, DIL,
                  <br />
                  atau data koordinat lainnya.
                </p>
                <span className="add-card-link">
                  Unggah Excel / CSV <ArrowUpRight size={15} />
                </span>
              </button>
            )}
          </div>
        )}
        {!loading && !visible.length && (
          <div className="empty-state">
            <FolderOpen size={30} />
            <h3>Belum ada sumber yang cocok</h3>
            <p>Ubah pencarian atau tambahkan master baru.</p>
          </div>
        )}
        <div className="collection-help">
          <span className="help-icon">i</span>
          <div>
            <strong>Satu tinjauan, banyak sumber acuan.</strong>
            <p>
              Centang beberapa master untuk pencocokan sekaligus. Kode yang sama
              akan dipasangkan dengan titik yang paling dekat.
            </p>
          </div>
          <a href="/contoh/Simulasi_Multi_Sheet.xlsx" download>
            Unduh data contoh <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="selection-bar">
          <span>
            <b>{selected.length}</b> master dipilih
          </span>
          <button onClick={() => setSelected([])}>Batalkan</button>
          <Button onClick={() => setMatch(true)}>
            Cocokkan data <ArrowUpRight size={16} />
          </Button>
        </div>
      )}
      <PetakanKolom
        open={upload}
        onClose={() => setUpload(false)}
        mode="master"
        onDone={(result, catatan) => {
          setToast(
            `Master “${result.nama}” berhasil disimpan. ${catatan ?? ""}`,
          );
          void load();
        }}
      />
      <PetakanKolom
        open={match}
        onClose={() => setMatch(false)}
        mode="tinjauan"
        masters={masters.filter((m) => selected.includes(m.id))}
        onDone={(s) => window.location.assign(`/ruang-kerja?sesi=${s.id}`)}
      />
      <DialogUbahMaster
        master={ubah}
        onClose={() => setUbah(null)}
        onSimpan={async (nama, kategori) => {
          if (!ubah) return;
          await api("/api/master", {
            method: "PATCH",
            body: JSON.stringify({ id: ubah.id, nama, kategori }),
          });
          setUbah(null);
          setToast(`Master diubah menjadi “${nama}”.`);
          void load();
        }}
      />
      <DialogHapus
        open={!!hapus}
        judul="Hapus sumber master"
        nama={hapus?.nama ?? ""}
        akibat={`${jumlah(hapus?.total ?? 0)} titik koordinat ikut terhapus dan tidak bisa dikembalikan.`}
        catatan="Tinjauan yang pernah memakai sumber ini tetap ada, tetapi pasangan titiknya hilang."
        onClose={() => setHapus(null)}
        onHapus={async () => {
          if (!hapus) return;
          const namaLama = hapus.nama;
          await api(`/api/master?id=${hapus.id}`, { method: "DELETE" });
          setSelected(selected.filter((id) => id !== hapus.id));
          setHapus(null);
          setToast(`Master “${namaLama}” dihapus.`);
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
