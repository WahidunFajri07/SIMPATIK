"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./dialog";
import { Button } from "./button";
import type { Master } from "@/lib/tipe";

/** Dialog hapus: wajib sebut akibatnya, bukan sekadar "yakin?". */
export function DialogHapus({
  open,
  judul,
  nama,
  akibat,
  catatan,
  onClose,
  onHapus,
}: {
  open: boolean;
  judul: string;
  nama: string;
  akibat: string;
  catatan?: string;
  onClose: () => void;
  onHapus: () => Promise<void>;
}) {
  const [hapus, setHapus] = useState(false);
  useEffect(() => {
    if (open) setHapus(false);
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={judul} description={akibat}>
      <div className="danger-note">
        <AlertTriangle size={15} />
        <div>
          <strong>{nama}</strong>
          {catatan && <p>{catatan}</p>}
        </div>
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button
          className="btn-danger"
          disabled={hapus}
          onClick={async () => {
            setHapus(true);
            try {
              await onHapus();
            } finally {
              setHapus(false);
            }
          }}
        >
          <Trash2 size={15} /> {hapus ? "Menghapus…" : "Hapus permanen"}
        </Button>
      </div>
    </Modal>
  );
}

/** Dialog ubah master: nama + kategori. */
export function DialogUbahMaster({
  master,
  onClose,
  onSimpan,
}: {
  master: Master | null;
  onClose: () => void;
  onSimpan: (nama: string, kategori: string) => Promise<void>;
}) {
  const [nama, setNama] = useState(""),
    [kategori, setKategori] = useState(""),
    [simpan, setSimpan] = useState(false);
  useEffect(() => {
    if (master) {
      setNama(master.nama);
      setKategori(master.kategori);
    }
  }, [master]);
  const sah = nama.trim().length >= 2 && kategori.trim().length >= 1;
  return (
    <Modal
      open={!!master}
      onClose={onClose}
      title="Ubah sumber master"
      description="Perubahan nama langsung terlihat di semua tinjauan yang memakai sumber ini."
    >
      <form
        className="form-aksi"
        onSubmit={async (e) => {
          e.preventDefault();
          setSimpan(true);
          try {
            await onSimpan(nama.trim(), kategori.trim());
          } finally {
            setSimpan(false);
          }
        }}
      >
        <label htmlFor="ubah-nama">Nama master</label>
        <input
          id="ubah-nama"
          value={nama}
          autoFocus
          maxLength={120}
          required
          onChange={(e) => setNama(e.target.value)}
        />
        <label htmlFor="ubah-kategori">Kategori</label>
        <input
          id="ubah-kategori"
          value={kategori}
          maxLength={50}
          required
          onChange={(e) => setKategori(e.target.value)}
        />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={simpan || !sah}>
            {simpan ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Dialog ubah sesi: hanya nama. */
export function DialogUbahNama({
  open,
  judul,
  label,
  nilai,
  onClose,
  onSimpan,
}: {
  open: boolean;
  judul: string;
  label: string;
  nilai: string;
  onClose: () => void;
  onSimpan: (nilai: string) => Promise<void>;
}) {
  const [teks, setTeks] = useState(nilai),
    [simpan, setSimpan] = useState(false);
  useEffect(() => {
    if (open) setTeks(nilai);
  }, [open, nilai]);
  return (
    <Modal open={open} onClose={onClose} title={judul} description={label}>
      <form
        className="form-aksi"
        onSubmit={async (e) => {
          e.preventDefault();
          setSimpan(true);
          try {
            await onSimpan(teks.trim());
          } finally {
            setSimpan(false);
          }
        }}
      >
        <label htmlFor="nama-baru">{label}</label>
        <input
          id="nama-baru"
          value={teks}
          autoFocus
          maxLength={120}
          required
          onChange={(e) => setTeks(e.target.value)}
        />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={simpan || teks.trim().length < 2}>
            {simpan ? "Menyimpan…" : "Simpan perubahan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
