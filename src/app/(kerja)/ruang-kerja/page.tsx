"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Plus,
  ArrowUpRight,
  FolderClock,
  Layers3,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useKlikDiLuar } from "@/lib/use-klik-luar";
import { LaciTabel } from "@/components/tabel/laci-tabel";
import { KartuInspeksi } from "@/components/peta/kartu-inspeksi";
import { PetakanKolom } from "@/components/modal/petakan-kolom";
import { api } from "@/lib/klien";
import type { Hasil, Master, Sesi } from "@/lib/tipe";
const KanvasPeta = dynamic(
  () => import("@/components/peta/kanvas-peta").then((m) => m.KanvasPeta),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading">Menyiapkan kanvas koordinat…</div>
    ),
  },
);
export default function Page() {
  const [masters, setMasters] = useState<Master[]>([]),
    [sessions, setSessions] = useState<Sesi[]>([]),
    [sesi, setSesi] = useState<Sesi | null>(null),
    [hasil, setHasil] = useState<Hasil[]>([]),
    [selected, setSelected] = useState<Hasil | null>(null),
    [height, setHeight] = useState(45),
    [upload, setUpload] = useState(false),
    [menu, setMenu] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState(""),
    [refresh, setRefresh] = useState(0),
    [mapFilter, setMapFilter] = useState("SEMUA"),
    [toast, setToast] = useState("");
  const menuRef = useKlikDiLuar<HTMLDivElement>(menu, () => setMenu(false));
  const loadSession = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setSelected(null);
    setError("");
    setHasil([]);
    try {
      let all: Hasil[] = [];
      let offset = 0;
      let current: Sesi;
      do {
        const data = await api<{ sesi: Sesi; hasil: Hasil[] }>(
          `/api/sesi?id=${id}&offset=${offset}&limit=2500`,
          { signal },
        );
        current = data.sesi;
        all = all.concat(data.hasil);
        offset += data.hasil.length;
        setSesi(current);
        setHasil([...all]);
        if (!data.hasil.length) break;
      } while (offset < current.total);
      setRefresh((n) => n + 1);
      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("sesi", id);
      window.history.replaceState({}, "", url);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function init() {
      try {
        const [m, s] = await Promise.all([
          api<{ masters: Master[]; mode: string }>("/api/master", {
            signal: controller.signal,
          }),
          api<{ sesi: Sesi[] }>("/api/sesi", { signal: controller.signal }),
        ]);
        setMasters(m.masters);
        setMode(m.mode);
        setSessions(s.sesi);
        const q = new URLSearchParams(window.location.search);
        if (q.has("baru")) setUpload(true);
        const id = q.get("sesi") || s.sesi[0]?.id;
        if (id) await loadSession(id, controller.signal);
        else setLoading(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    }
    void init();
    return () => controller.abort();
  }, [loadSession]);
  useEffect(() => {
    const handle = () => {
      if (new URLSearchParams(location.search).has("baru")) setUpload(true);
    };
    window.addEventListener("popstate", handle);
    const baru = () => setUpload(true);
    window.addEventListener("simpatik:sesi-baru", baru);
    return () => {
      window.removeEventListener("popstate", handle);
      window.removeEventListener("simpatik:sesi-baru", baru);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  function update(h: Hasil) {
    setHasil((prev) => prev.map((r) => (r.id === h.id ? h : r)));
    setSelected(h);
    setSesi((prev) =>
      prev
        ? {
            ...prev,
            dikonfirmasi:
              prev.dikonfirmasi +
              (selected?.keputusan === "BELUM_DITINJAU" ? 1 : 0),
          }
        : prev,
    );
    setToast("Keputusan tersimpan. Hasil siap diekspor.");
    setRefresh((n) => n + 1);
  }
  return (
    <main className="workspace">
      <KanvasPeta
        sesiId={sesi?.id}
        selected={selected}
        onSelect={(id) => {
          const h = hasil.find((h) => h.id === id);
          if (h) setSelected(h);
        }}
        refresh={refresh}
        drawerHeight={height}
        statusFilter={mapFilter}
      />
      <header className="workspace-header">
        <div className="workspace-brand">
          <Logo />
          <span />
          <div>
            <strong>Ruang kerja</strong>
            <small>Spatial reconciliation workspace</small>
          </div>
        </div>
        <div className="workspace-actions">
          <span className="environment">
            <span />
            {mode === "demo"
              ? "Demo lokal"
              : mode
                ? "PostGIS aktif"
                : "Menghubungkan…"}
          </span>
          <a href="/panduan" className="guide-link">
            Panduan <ArrowUpRight size={12} />
          </a>
          <span className="avatar">SP</span>
        </div>
      </header>
      <div className="session-toolbar">
        <div className="session-switch" ref={menuRef}>
          <button onClick={() => setMenu(!menu)} aria-expanded={menu}>
            <FolderClock size={17} />
            <span>
              <small>SESI AKTIF</small>
              <strong>{sesi?.nama ?? "Pilih atau buat sesi baru"}</strong>
            </span>
            <ChevronDown size={13} />
          </button>
          {menu && (
            <div className="session-menu">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className={s.id === sesi?.id ? "active" : ""}
                  onClick={() => {
                    setMenu(false);
                    void loadSession(s.id);
                  }}
                >
                  {s.nama}
                  <span>{s.total} titik</span>
                </button>
              ))}
              <a href="/riwayat">
                Lihat semua riwayat <ArrowUpRight size={12} />
              </a>
            </div>
          )}
        </div>
        <span className="toolbar-divider" />
        <div className="master-indicator">
          <Layers3 size={15} />
          <span>
            <b>{sesi?.masterIds.length ?? 0}</b> sumber master
          </span>
          <span className="tolerance-chip">≤ {sesi?.toleransi ?? 15} m</span>
        </div>
        <Button onClick={() => setUpload(true)}>
          <Plus size={15} /> Sesi baru
        </Button>
      </div>
      {selected && height < 70 && (
        <KartuInspeksi
          hasil={selected}
          onClose={() => setSelected(null)}
          onUpdate={update}
        />
      )}
      <LaciTabel
        hasil={hasil}
        sesi={sesi}
        selectedId={selected?.id}
        onSelect={(h) => {
          setSelected(h);
          if (height > 70) setHeight(45);
        }}
        height={height}
        onHeight={setHeight}
        loading={loading}
        onFilter={setMapFilter}
      />
      <PetakanKolom
        open={upload}
        onClose={() => setUpload(false)}
        mode="tinjauan"
        masters={masters}
        onDone={(s, catatan) => {
          if (catatan) setToast(catatan);
          setSessions((prev) => [s as Sesi, ...prev]);
          setHeight(45);
          void loadSession(s.id);
        }}
      />
      {error && (
        <div className="workspace-error error" role="alert">
          {error}
          <button aria-label="Tutup pesan" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
