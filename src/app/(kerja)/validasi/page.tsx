"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Map,
  ShieldCheck,
} from "lucide-react";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, jumlah, meter } from "@/lib/klien";
import {
  LABEL_STATUS,
  type Hasil,
  type Keputusan,
  type Sesi,
  type Status,
} from "@/lib/tipe";

const PAGE_SIZES = [25, 50, 100] as const;
const BATCH_LIMIT = 500;
type AksiMassal = Exclude<Keputusan, "BELUM_DITINJAU" | "PAKAI_KOORDINAT_BARU">;
const aksi: Array<{ keputusan: AksiMassal; label: string; icon: typeof Check }> = [
  { keputusan: "TERKONFIRMASI_VALID", label: "Konfirmasi valid", icon: Check },
  {
    keputusan: "PAKAI_KOORDINAT_MASTER",
    label: "Pakai koordinat master",
    icon: Map,
  },
  {
    keputusan: "TERIMA_DESKRIPSI_MASTER",
    label: "Terima deskripsi master",
    icon: CheckCheck,
  },
];

export default function Page() {
  const [sessions, setSessions] = useState<Sesi[]>([]),
    [sesi, setSesi] = useState<Sesi | null>(null),
    [hasil, setHasil] = useState<Hasil[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [filter, setFilter] = useState<Status | "SEMUA">("SEMUA"),
    [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25),
    [offset, setOffset] = useState(0),
    [pageInput, setPageInput] = useState("1"),
    [hasNext, setHasNext] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [pendingAction, setPendingAction] = useState<AksiMassal | null>(null),
    [saving, setSaving] = useState(false),
    [toast, setToast] = useState("");

  async function loadSessions() {
    const data = await api<{ sesi: Sesi[] }>("/api/sesi");
    setSessions(data.sesi);
    const current = data.sesi.find((s) => s.id === sesi?.id) ?? data.sesi[0] ?? null;
    setSesi(current);
    return current;
  }
  async function loadPending(id: string, pageOffset = 0, size = pageSize) {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ sesi: Sesi; hasil: Hasil[] }>(
        `/api/sesi?id=${id}&belum=1&offset=${pageOffset}&limit=${size}`,
      );
      setSesi(data.sesi);
      setHasil(data.hasil);
      setOffset(pageOffset);
      setPageInput(String(Math.floor(pageOffset / size) + 1));
      setSelected([]);
      setHasNext(data.hasil.length === size);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadSessions()
      .then((current) => current && loadPending(current.id))
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, []);
  const visible = useMemo(
    () =>
      filter === "SEMUA" ? hasil : hasil.filter((h) => h.status === filter),
    [hasil, filter],
  );
  const visibleIds = visible.map((h) => h.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const selectedRows = hasil.filter((h) => selected.includes(h.id));
  const allHaveMaster = selectedRows.every((h) => h.ax !== null && h.ay !== null);
  const allCandidates =
    selectedRows.length > 0 &&
    selectedRows.every((h) => h.status === "KANDIDAT_LOKASI_TERDEKAT");

  function pilihSemuaVisible() {
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])].slice(0, BATCH_LIMIT),
    );
  }
  async function simpanMassal() {
    if (!sesi || !pendingAction || !selected.length) return;
    setSaving(true);
    try {
      const result = await api<{ diperbarui: number; baruDikonfirmasi: number }>(
        "/api/konfirmasi",
        {
          method: "POST",
          body: JSON.stringify({
            sesiId: sesi.id,
            ids: selected,
            keputusan: pendingAction,
          }),
        },
      );
      setPendingAction(null);
      setToast(`${result.diperbarui} titik berhasil diperbarui.`);
      await loadPending(sesi.id, offset);
      await loadSessions();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const actionAllowed = (keputusan: AksiMassal) =>
    keputusan === "TERKONFIRMASI_VALID" ||
    (keputusan === "PAKAI_KOORDINAT_MASTER" && allHaveMaster) ||
    (keputusan === "TERIMA_DESKRIPSI_MASTER" && allCandidates);

  return (
    <main className="collection-page validation-page">
      <LatarInteraktif />
      <KepalaHalaman bagian="Validasi Massal" />
      <div className="collection-body">
        <div className="page-title-row">
          <div>
            <span className="section-kicker">
              <span /> KEPUTUSAN TERARAH
            </span>
            <h1>Validasi tanpa buka satu per satu.</h1>
            <p>
              Pilih hasil yang sudah jelas, terapkan keputusan yang sama, lalu
              buka ruang kerja untuk kasus yang perlu pemeriksaan detail.
            </p>
          </div>
          {sesi && (
            <Link href={`/ruang-kerja?sesi=${sesi.id}`} className="btn btn-secondary">
              <Map size={15} /> Tinjau di peta <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        <section className="validation-panel" aria-label="Validasi hasil pencocokan">
          <div className="validation-toolbar">
            <label>
              <span>Sesi aktif</span>
              <select
                aria-label="Pilih sesi validasi"
                value={sesi?.id ?? ""}
                onChange={(e) => {
                  const next = sessions.find((s) => s.id === e.target.value);
                  if (next) {
                    setSesi(next);
                    setOffset(0);
                    setPageInput("1");
                    void loadPending(next.id, 0, pageSize);
                  }
                }}
              >
                {!sessions.length && <option value="">Belum ada sesi</option>}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama}
                  </option>
                ))}
              </select>
            </label>
            <div className="validation-progress">
              <strong>{jumlah(sesi?.dikonfirmasi ?? 0)}</strong>
              <span>dari {jumlah(sesi?.total ?? 0)} keputusan tersimpan</span>
            </div>
          </div>

          <div className="validation-filters">
            <label className="bulk-select">
              <input
                type="checkbox"
                aria-label="Pilih semua hasil yang terlihat"
                checked={allVisibleSelected}
                onChange={pilihSemuaVisible}
              />
              Pilih semua terlihat
            </label>
            <span className="filter-label">
              <ListFilter size={13} /> Filter status
            </span>
            <select
              aria-label="Filter status validasi"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as Status | "SEMUA");
                setSelected([]);
              }}
            >
              <option value="SEMUA">Semua status</option>
              {Object.entries(LABEL_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="validation-page-size">
              <span>Tampilkan</span>
              <select
                aria-label="Jumlah baris"
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value) as (typeof PAGE_SIZES)[number];
                  setPageSize(size);
                  setPageInput("1");
                  if (sesi) void loadPending(sesi.id, 0, size);
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} baris</option>
                ))}
              </select>
            </label>
            <span className="validation-count">
              {jumlah(visible.length)} terlihat · maksimum {BATCH_LIMIT} per batch
            </span>
          </div>

          {error && <div className="error" role="alert">{error}</div>}
          <div className="validation-table-wrap">
            <table className="validation-table">
              <thead>
                <tr>
                  <th />
                  <th>Data tinjauan</th>
                  <th>Master kandidat</th>
                  <th>Status</th>
                  <th>Jarak</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Pilih titik ${h.deskripsiB || h.deskripsiA || h.id}`}
                        checked={selected.includes(h.id)}
                        onChange={(e) =>
                          setSelected((current) =>
                            e.target.checked
                              ? [...current, h.id]
                              : current.filter((id) => id !== h.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <strong>{h.deskripsiB || "Tanpa deskripsi"}</strong>
                      <small>{h.bx.toFixed(6)}, {h.by.toFixed(6)}</small>
                    </td>
                    <td>
                      <strong>{h.deskripsiA || "Tidak ditemukan"}</strong>
                      <small>{h.sumber || "Tidak ada sumber master"}</small>
                    </td>
                    <td><span className={`status-badge status-${h.status.toLowerCase()}`}><i />{LABEL_STATUS[h.status]}</span></td>
                    <td className="mono">{meter(h.jarak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div className="table-empty">
                {loading ? "Memuat titik belum ditinjau…" : "Semua titik pada filter ini sudah ditinjau."}
              </div>
            )}
          </div>

          <div className="validation-footer">
            <span>{selected.length ? `${selected.length} titik dipilih` : "Pilih titik untuk mulai validasi"}</span>
            <div className="validation-pagination">
              <button
                aria-label="Halaman sebelumnya"
                disabled={offset === 0 || loading}
                onClick={() => sesi && void loadPending(sesi.id, Math.max(0, offset - pageSize))}
              ><ChevronLeft size={15} /></button>
              <label className="validation-page-number">
                <span>Halaman</span>
                <input
                  aria-label="Nomor halaman"
                  type="number"
                  min="1"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && sesi) {
                      const page = Math.max(1, Number(pageInput) || 1);
                      void loadPending(sesi.id, (page - 1) * pageSize);
                    }
                  }}
                />
              </label>
              <button
                aria-label="Halaman berikutnya"
                disabled={!hasNext || loading}
                onClick={() => sesi && void loadPending(sesi.id, offset + pageSize)}
              ><ChevronRight size={15} /></button>
            </div>
          </div>
        </section>
      </div>

      {selected.length > 0 && (
        <div className="validation-action-bar" role="region" aria-label="Aksi validasi terpilih">
          <span><b>{selected.length}</b> titik dipilih</span>
          {aksi.map(({ keputusan, label, icon: Icon }) => (
            <Button
              key={keputusan}
              variant={keputusan === "TERKONFIRMASI_VALID" ? "primary" : "secondary"}
              disabled={!actionAllowed(keputusan)}
              title={
                keputusan === "PAKAI_KOORDINAT_MASTER" && !allHaveMaster
                  ? "Semua titik harus memiliki pasangan master"
                  : keputusan === "TERIMA_DESKRIPSI_MASTER" && !allCandidates
                    ? "Pilih kandidat lokasi terdekat saja"
                    : undefined
              }
              onClick={() => setPendingAction(keputusan)}
            ><Icon size={14} /> {label}</Button>
          ))}
          <button onClick={() => setSelected([])}>Batalkan</button>
        </div>
      )}

      <Modal
        open={!!pendingAction}
        onClose={() => !saving && setPendingAction(null)}
        title="Terapkan keputusan massal?"
        description={`${selected.length} titik akan diperbarui dengan keputusan yang sama.`}
      >
        <div className="validation-confirm-note">
          <ShieldCheck size={18} />
          <p>
            {pendingAction === "TERKONFIRMASI_VALID"
              ? "Koordinat tinjauan B akan dianggap valid."
              : pendingAction === "PAKAI_KOORDINAT_MASTER"
                ? "Koordinat hasil akan memakai koordinat master A."
                : "Deskripsi hasil akan memakai identitas master A."}
            <br />
            Anda masih dapat memeriksa kasus khusus di ruang kerja.
          </p>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" disabled={saving} onClick={() => setPendingAction(null)}>Batal</Button>
          <Button disabled={saving} onClick={() => void simpanMassal()}>
            {saving ? "Menyimpan…" : "Terapkan keputusan"}
          </Button>
        </div>
      </Modal>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
