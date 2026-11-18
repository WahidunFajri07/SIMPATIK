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
} from "lucide-react";
import { motion } from "framer-motion";
import { StatusBadge } from "../tabel/laci-tabel";
import { Button } from "../ui/button";
import { kirim, meter } from "@/lib/klien";
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [custom, setCustom] = useState(false),
    [x, setX] = useState(""),
    [y, setY] = useState("");
  useEffect(() => {
    setCustom(false);
    setError("");
    setX(String(h.hasilX ?? h.bx));
    setY(String(h.hasilY ?? h.by));
  }, [h.id]);
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
    <motion.aside
      className="inspection-card"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      aria-label="Inspeksi titik"
    >
      <header>
        <span className="eyebrow">INSPEKSI TITIK</span>
        <button
          className="icon-btn"
          onClick={onClose}
          aria-label="Tutup inspeksi"
        >
          <X size={16} />
        </button>
      </header>
      <h2>{h.deskripsiB || h.deskripsiA || "Titik tanpa deskripsi"}</h2>
      <StatusBadge status={h.status} />
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
  );
}
