"use client";
import { useEffect, useRef, useState } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  ArrowRight,
  Check,
  LoaderCircle,
  Download,
} from "lucide-react";
import { Modal } from "../ui/dialog";
import { Button } from "../ui/button";
import { petakanBaris } from "@/lib/bersihkan-data";
import { kirim, jumlah } from "@/lib/klien";
import type { Master, Sesi } from "@/lib/tipe";
type Buku = {
  sheets: string[];
  sheet: string;
  headers: string[];
  rows: Record<string, unknown>[];
};
export function PetakanKolom({
  open,
  onClose,
  mode,
  masters = [],
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  mode: "master" | "tinjauan";
  masters?: Master[];
  onDone: (result: Master | Sesi, catatan?: string) => void;
}) {
  const worker = useRef<Worker | null>(null),
    inputRef = useRef<HTMLInputElement>(null);
  const lanjut = useRef<{
    fingerprint: string;
    offset: number;
    id?: string;
    batchId: string;
  } | null>(null);
  const [buku, setBuku] = useState<Buku | null>(null),
    [file, setFile] = useState(""),
    [nama, setNama] = useState(""),
    [kategori, setKategori] = useState("TRAFO"),
    [masterIds, setMasterIds] = useState<string[]>([]),
    [toleransi, setToleransi] = useState("15");
  const [mapping, setMapping] = useState({ deskripsi: "", x: "", y: "" }),
    [busy, setBusy] = useState(false),
    [parsing, setParsing] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!open) return;
    lanjut.current = null;
    setBuku(null);
    setFile("");
    setNama("");
    setError("");
    setNotice("");
    setProgress(0);
    setBusy(false);
    setParsing(false);
    setMasterIds(masters.map((m) => m.id));
    const w = new Worker("/pekerja-excel.js");
    worker.current = w;
    w.onmessage = ({ data }) => {
      setParsing(false);
      if (data.error) {
        setError(data.error);
        return;
      }
      setBuku(data);
      const guess = (regex: RegExp) =>
        data.headers.find((h: string) => regex.test(h)) ?? "";
      setMapping({
        deskripsi: guess(/deskripsi|kode|nama|^id$|description/i),
        x: guess(/longitude|bujur|^x$|koordinat.?x|^lon$|^lng$/i),
        y: guess(/latitude|lintang|^y$|koordinat.?y|^lat$/i),
      });
    };
    w.onerror = () => {
      setParsing(false);
      setError("Parser gagal dimuat. Muat ulang halaman dan coba kembali.");
    };
    return () => {
      w.terminate();
      worker.current = null;
    };
    // A snapshot of master choices is taken each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  function pilihFile(f: File | undefined) {
    if (!f) return;
    if (lanjut.current) {
      setError(
        "Impor sudah dimulai. Lanjutkan batch yang gagal atau tutup dialog sebelum mengganti berkas.",
      );
      return;
    }
    setError("");
    setNotice("");
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      setError("Pilih file .csv, .xlsx, atau .xls.");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }
    setBuku(null);
    setFile(f.name);
    setNama(f.name.replace(/\.[^.]+$/, "").replace(/_/g, " "));
    setParsing(true);
    worker.current?.postMessage({ file: f });
  }
  async function simpan() {
    if (!buku) return;
    setError("");
    setNotice("");
    if (!nama.trim()) {
      setError("Isi nama data terlebih dahulu.");
      return;
    }
    if (
      !mapping.x ||
      !mapping.y ||
      mapping.x === mapping.y ||
      [mapping.x, mapping.y].includes(mapping.deskripsi)
    ) {
      setError("Pilih kolom X dan Y yang berbeda dari kolom deskripsi.");
      return;
    }
    if (mode === "master" && !mapping.deskripsi) {
      setError("Master memerlukan kolom deskripsi.");
      return;
    }
    const t = Number(toleransi);
    if (
      mode === "tinjauan" &&
      (!masterIds.length ||
        !toleransi.trim() ||
        !Number.isFinite(t) ||
        t < 0 ||
        t > 10000)
    ) {
      setError("Pilih master dan toleransi antara 0–10.000 meter.");
      return;
    }
    const mapped = petakanBaris(buku.rows, mapping, mode === "master");
    if (mapped.errors.length) {
      setError(
        `${mapped.errors.length} baris perlu diperbaiki. ${mapped.errors.slice(0, 3).join(" ")}`,
      );
      return;
    }
    if (!mapped.titik.length) {
      setError("Tidak ada data untuk diproses.");
      return;
    }
    if (mapped.ditukar)
      setNotice(
        `${jumlah(mapped.ditukar)} koordinat X/Y tertukar dan sudah diperbaiki otomatis.`,
      );
    setBusy(true);
    const fingerprint = JSON.stringify({
      file,
      sheet: buku.sheet,
      nama,
      kategori,
      masterIds,
      toleransi,
      mapping,
    });
    if (lanjut.current && lanjut.current.fingerprint !== fingerprint) {
      setBusy(false);
      setError(
        "Pengaturan berubah setelah impor dimulai. Tutup dialog dan periksa data parsial sebelum memulai impor baru.",
      );
      return;
    }
    const state = (lanjut.current ??= {
      fingerprint,
      offset: 0,
      batchId: crypto.randomUUID(),
    });
    setProgress(Math.round((state.offset / mapped.titik.length) * 100));
    let id: string | undefined = state.id;
    let result: Master | Sesi | undefined;
    try {
      for (let i = state.offset; i < mapped.titik.length; i += 2500) {
        const titik = mapped.titik.slice(i, i + 2500),
          batchId = state.batchId;
        const payload =
          mode === "master"
            ? { id, nama: nama.trim(), kategori, file, titik, batchId }
            : {
                sesiId: id,
                nama: nama.trim(),
                masterIds,
                toleransi: t,
                titik,
                batchId,
              };
        // A retry reuses its idempotency key, so a lost response cannot duplicate rows.
        try {
          result = await kirim<Master | Sesi>(
            mode === "master" ? "/api/master" : "/api/cocokkan",
            payload,
          );
        } catch (e) {
          if ((e as Error).message === "Failed to fetch")
            result = await kirim<Master | Sesi>(
              mode === "master" ? "/api/master" : "/api/cocokkan",
              payload,
            );
          else throw e;
        }
        id = result.id;
        state.id = id;
        state.offset = Math.min(i + 2500, mapped.titik.length);
        state.batchId = crypto.randomUUID();
        setProgress(
          Math.round(
            (Math.min(i + 2500, mapped.titik.length) / mapped.titik.length) *
              100,
          ),
        );
      }
      if (result) {
        onDone(
          result,
          mapped.ditukar
            ? `${jumlah(mapped.ditukar)} koordinat X/Y tertukar dan sudah diperbaiki otomatis.`
            : undefined,
        );
        onClose();
      }
    } catch (e) {
      setError(
        `${(e as Error).message} Klik tombol proses kembali untuk melanjutkan batch yang sama tanpa menduplikasi data.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy && !parsing) onClose();
      }}
      title={
        mode === "master" ? "Tambahkan sumber master" : "Mulai pencocokan baru"
      }
      description={
        mode === "master"
          ? "Unggah sumber acuan, lalu tentukan kolom koordinatnya."
          : "Cocokkan data lapangan dengan satu atau beberapa sumber master."
      }
    >
      <div className="import-steps">
        <span className="done">
          01 <b>Unggah file</b>
        </span>
        <i />
        <span className={buku ? "done" : ""}>
          02 <b>Petakan kolom</b>
        </span>
        <i />
        <span>
          03 <b>{mode === "master" ? "Simpan" : "Cocokkan"}</b>
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        aria-label="Pilih file data"
        disabled={busy || parsing}
        onChange={(e) => pilihFile(e.target.files?.[0])}
      />
      <button
        className={`upload-area ${file ? "has-file" : ""}`}
        disabled={busy || parsing}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy && !parsing) pilihFile(e.dataTransfer.files[0]);
        }}
      >
        {parsing ? (
          <LoaderCircle className="spin" size={28} />
        ) : file ? (
          <FileSpreadsheet size={28} />
        ) : (
          <UploadCloud size={30} />
        )}
        <strong>
          {parsing
            ? "Membaca sheet…"
            : file || "Tarik file ke sini, atau pilih file"}
        </strong>
        <span>
          {buku
            ? `${jumlah(buku.rows.length)} baris · ${buku.headers.length} kolom`
            : "Excel / CSV · Maks. 50 MB · 100.000 baris"}
        </span>
      </button>
      {!buku && !parsing && (
        <a
          href={
            mode === "master"
              ? "/contoh/Simulasi_Multi_Sheet.xlsx"
              : "/contoh/Data_Tinjauan_Campuran.csv"
          }
          download
          className="sample-link"
        >
          <Download size={13} /> Unduh data contoh{" "}
          {mode === "master" ? "multi-sheet" : "tinjauan"}
        </a>
      )}
      {buku && (
        <div className="mapping-form">
          <div className="form-grid">
            <label>
              Nama {mode === "master" ? "master" : "sesi"}
              <input
                value={nama}
                maxLength={120}
                disabled={busy}
                onChange={(e) => setNama(e.target.value)}
              />
            </label>
            <label>
              Sheet
              <select
                value={buku.sheet}
                disabled={busy || parsing}
                onChange={(e) => {
                  setParsing(true);
                  worker.current?.postMessage({ sheet: e.target.value });
                }}
              >
                {buku.sheets.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {mode === "master" ? (
            <label>
              Kategori
              <select
                value={kategori}
                disabled={busy}
                onChange={(e) => setKategori(e.target.value)}
              >
                {["TRAFO", "DIL", "PRABAYAR", "PASCABAYAR", "LAINNYA"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
          ) : (
            <>
              <div className="master-checkboxes">
                <span className="field-label">Sumber master acuan</span>
                {masters.length ? (
                  masters.map((m) => (
                    <label key={m.id}>
                      <input
                        type="checkbox"
                        checked={masterIds.includes(m.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setMasterIds(
                            e.target.checked
                              ? [...masterIds, m.id]
                              : masterIds.filter((id) => id !== m.id),
                          )
                        }
                      />
                      <span>
                        {m.nama}
                        <small>{jumlah(m.total)} titik</small>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="error">
                    Belum ada master. Tambahkan di Gudang Master.
                  </div>
                )}
              </div>
              <label>
                Toleransi jarak (meter)
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="0.1"
                  value={toleransi}
                  disabled={busy}
                  onChange={(e) => setToleransi(e.target.value)}
                />
              </label>
            </>
          )}
          <div className="mapping-label">
            PEMETAAN KOLOM <span>Koordinat menggunakan WGS84 / EPSG:4326</span>
          </div>
          <div className="form-grid three">
            {[
              { key: "deskripsi", label: "Deskripsi / kode unik" },
              { key: "x", label: "X · Longitude" },
              { key: "y", label: "Y · Latitude" },
            ].map((c) => (
              <label key={c.key}>
                {c.label}
                <select
                  aria-label={c.label}
                  value={mapping[c.key as keyof typeof mapping]}
                  disabled={busy}
                  onChange={(e) =>
                    setMapping({ ...mapping, [c.key]: e.target.value })
                  }
                >
                  <option value="">
                    {c.key === "deskripsi" && mode === "tinjauan"
                      ? "Tanpa deskripsi"
                      : "Pilih kolom"}
                  </option>
                  {buku.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="sample-preview">
            <span>SAMPEL DATA · {buku.sheet}</span>
            <div>
              <table>
                <thead>
                  <tr>
                    {buku.headers.slice(0, 5).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buku.rows.slice(0, 3).map((r, i) => (
                    <tr key={i}>
                      {buku.headers.slice(0, 5).map((h) => (
                        <td key={h}>{String(r[h]) || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {mode === "tinjauan" && (
            <p className="mapping-hint">
              Tanpa deskripsi? Sistem merekomendasikan identitas master terdekat
              dalam radius 100 meter.
            </p>
          )}
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {busy && (
        <div
          className="import-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${progress}%` }} />
          <span>{progress}% · Memproses batch 2.500 baris…</span>
        </div>
      )}
      <div className="modal-actions">
        <Button
          variant="secondary"
          disabled={busy || parsing}
          onClick={onClose}
        >
          Batal
        </Button>
        <Button
          disabled={!buku || busy || parsing}
          onClick={() => void simpan()}
        >
          {busy ? (
            <LoaderCircle className="spin" size={15} />
          ) : progress === 100 ? (
            <Check size={15} />
          ) : null}
          {mode === "master" ? "Simpan master" : "Mulai pencocokan"}
          <ArrowRight size={15} />
        </Button>
      </div>
    </Modal>
  );
}
