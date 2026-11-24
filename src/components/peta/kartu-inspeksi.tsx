"use client";
import { useEffect, useState } from "react";
import {
  X,
  ArrowDown,
  Check,
  CheckCheck,
  MapPin,
  MoveUpRight,
  LoaderCircle,
  PencilLine,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { StatusBadge } from "../tabel/laci-tabel";
import { Button } from "../ui/button";
import { api, kirim, meter } from "@/lib/klien";
import { LABEL_KEPUTUSAN, type Hasil, type Keputusan } from "@/lib/tipe";
export function KartuInspeksi({
  hasil: h,
  onClose,
  onUpdate,
}: {
  hasil: Hasil;
  onClose: () => void;
  onUpdate: (h: Hasil) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detail, setDetail] = useState(false),
    [custom, setCustom] = useState(false),
    [x, setX] = useState(""),
    [y, setY] = useState(""),
    [catatan, setCatatan] = useState(""),
    [savingNote, setSavingNote] = useState(false);
  useEffect(() => {
    setDetail(false);
    setCustom(false);
    setError("");
    setX(String(h.hasilX ?? h.bx));
    setY(String(h.hasilY ?? h.by));
    setCatatan(h.catatanManual ?? "");
  }, [h.id]);
  async function simpanCatatan() {
    setError("");
    setSavingNote(true);
    try {
      const updated = await api<Hasil>("/api/konfirmasi", {
        method: "PATCH",
        body: JSON.stringify({
          id: h.id,
          sesiId: h.sesiId,
          catatanManual: catatan.trim() || null,
        }),
      });
      onUpdate(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }
  async function confirm(keputusan: Keputusan) {
    setError("");
    if (
      keputusan === "PAKAI_KOORDINAT_BARU" &&
      (!x.trim() ||
        !y.trim() ||
        !Number.isFinite(Number(x)) ||
        !Number.isFinite(Number(y)))
    ) {
      setError("Isi koordinat baru yang valid.");
      return;
    }
    setBusy(true);
    try {
      const updated = await kirim<Hasil>("/api/konfirmasi", {
        id: h.id,
        sesiId: h.sesiId,
        keputusan,
        catatanManual: catatan.trim() || null,
        ...(keputusan === "PAKAI_KOORDINAT_BARU"
          ? { x: Number(x), y: Number(y) }
          : {}),
      });
      onUpdate(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {detail && <div className="inspection-backdrop" aria-hidden="true" />}
      <motion.aside
        className={`inspection-card ${detail ? "inspection-card-detail" : ""}`}
        initial={{ opacity: 0, x: 15 }}
        animate={{
          opacity: 1,
          x: 0,
          scale: detail || reduceMotion ? 1 : 0.985,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 280, damping: 28 }
        }
        aria-label="Inspeksi titik"
      >
        <header>
          <span className="eyebrow">INSPEKSI TITIK</span>
          <div className="inspection-header-actions">
            <button
              className="inspection-detail-toggle"
              onClick={() => setDetail(!detail)}
              aria-label={detail ? "Kembalikan kartu" : "Lihat detail"}
            >
              {detail ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{detail ? "Kembalikan kartu" : "Lihat detail"}</span>
            </button>
            <button
              className="icon-btn"
              onClick={onClose}
              aria-label="Tutup inspeksi"
            >
              <X size={16} />
            </button>
          </div>
        </header>
        <h2>{h.deskripsiB || h.deskripsiA || "Titik tanpa deskripsi"}</h2>
        <StatusBadge status={h.status} />
        {detail && (
          <div className="inspection-detail-intro">
            <span>PERBANDINGAN KOORDINAT</span>
            <p>
              Periksa sumber master, data tinjauan, jarak, dan keputusan sebelum
              menyimpan.
            </p>
          </div>
        )}
        <div className="compare-point">
          <span className="point-letter master-letter">A</span>
          <div>
            <small>DATA MASTER</small>
            <strong>{h.deskripsiA || "Tidak ditemukan"}</strong>
            <span>{h.sumber || "Tidak ada sumber yang cocok"}</span>
            <div className="coordinate-pair">
              <span>
                <i>X</i>
                {h.ax?.toFixed(6) ?? "—"}
              </span>
              <span>
                <i>Y</i>
                {h.ay?.toFixed(6) ?? "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="distance-line">
          <span />
          <ArrowDown size={13} />
          <b>
            {meter(h.jarak)} <small>meter</small>
          </b>
          <span />
        </div>
        <div className="compare-point">
          <span className="point-letter review-letter">B</span>
          <div>
            <small>DATA TINJAUAN</small>
            <strong>{h.deskripsiB || "Tanpa deskripsi"}</strong>
            <span>
              {h.deskripsiB
                ? "Data lapangan asli"
                : "Identitas dapat diambil dari master"}
            </span>
            <div className="coordinate-pair">
              <span>
                <i>X</i>
                {h.bx.toFixed(6)}
              </span>
              <span>
                <i>Y</i>
                {h.by.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
        <div className="manual-note-editor">
          <label htmlFor="catatan-manual">
            Keterangan (Opsional — untuk Export)
          </label>
          <textarea
            id="catatan-manual"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tambahkan catatan untuk hasil export…"
            rows={2}
            disabled={savingNote || busy}
          />
          <Button
            variant="secondary"
            disabled={savingNote || busy}
            onClick={() => void simpanCatatan()}
          >
            {savingNote ? "Menyimpan…" : "Simpan keterangan"}
          </Button>
        </div>
        {h.catatanManual && (
          <div className="confirmation-saved">
            <CheckCheck size={15} />
            <div>
              <strong>Keterangan manual</strong>
              <span>{h.catatanManual}</span>
            </div>
          </div>
        )}
        {h.keputusan !== "BELUM_DITINJAU" && (
          <div className="confirmation-saved">
            <CheckCheck size={15} />
            <div>
              <strong>{LABEL_KEPUTUSAN[h.keputusan]}</strong>
              <span>
                {h.hasilDeskripsi} · {h.hasilX?.toFixed(6)},{" "}
                {h.hasilY?.toFixed(6)}
              </span>
            </div>
          </div>
        )}
        <div className="inspection-actions">
          {h.status === "KANDIDAT_LOKASI_TERDEKAT" && (
            <Button
              disabled={busy}
              onClick={() => void confirm("TERIMA_DESKRIPSI_MASTER")}
            >
              <Check size={15} /> Terima deskripsi master
            </Button>
          )}
          {h.ax !== null && (
            <Button
              variant={
                h.status === "PERLU_KOREKSI_JARAK" ? "primary" : "secondary"
              }
              disabled={busy}
              onClick={() => void confirm("PAKAI_KOORDINAT_MASTER")}
            >
              <MapPin size={14} /> Pakai koordinat master
            </Button>
          )}
          <Button
            variant={h.status === "AKURAT" ? "primary" : "secondary"}
            disabled={busy}
            onClick={() => void confirm("TERKONFIRMASI_VALID")}
          >
            <Check size={14} /> Konfirmasi titik B valid
          </Button>
          <button
            className="custom-coordinate-toggle"
            onClick={() => setCustom(!custom)}
            disabled={busy}
          >
            <PencilLine size={12} /> Gunakan koordinat baru{" "}
            <MoveUpRight size={12} />
          </button>
          {custom && (
            <div className="custom-coordinates">
              <div className="form-grid">
                <label>
                  Longitude baru
                  <input
                    aria-label="Longitude baru"
                    value={x}
                    onChange={(e) => setX(e.target.value)}
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                  />
                </label>
                <label>
                  Latitude baru
                  <input
                    aria-label="Latitude baru"
                    value={y}
                    onChange={(e) => setY(e.target.value)}
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                  />
                </label>
              </div>
              <Button
                disabled={busy}
                onClick={() => void confirm("PAKAI_KOORDINAT_BARU")}
              >
                Simpan koordinat baru
              </Button>
            </div>
          )}
          {busy && (
            <span className="saving">
              <LoaderCircle size={13} className="spin" /> Menyimpan keputusan…
            </span>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer>
          Koordinat sumber A dan B tetap tersimpan.
          <br />
          Keputusan Anda disertakan dalam ekspor.
        </footer>
      </motion.aside>
    </>
  );
}
