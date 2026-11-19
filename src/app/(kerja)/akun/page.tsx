"use client";
import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, UserRound } from "lucide-react";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { api, kirim, jumlah } from "@/lib/klien";
type Akun = { id: string; nama: string; email: string; dibuat: string };
const kosong = { nama: "", email: "", sandi: "" };
export default function Page() {
  const [akun, setAkun] = useState<Akun[]>([]),
    [form, setForm] = useState<{ id?: string; nama: string; email: string; sandi: string }>(kosong),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [toast, setToast] = useState("");
  async function load() {
    try {
      setAkun((await api<{ akun: Akun[] }>("/api/akun")).akun);
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
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.id)
        await api("/api/akun", {
          method: "PATCH",
          body: JSON.stringify({ id: form.id, nama: form.nama, sandi: form.sandi }),
        });
      else await kirim("/api/akun", { nama: form.nama, email: form.email, sandi: form.sandi });
      setToast(form.id ? "Akun diperbarui." : "Akun baru ditambahkan.");
      setOpen(false);
      setForm(kosong);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function hapus(a: Akun) {
    if (!confirm(`Hapus akun ${a.email}?`)) return;
    try {
      await api(`/api/akun?id=${a.id}`, { method: "DELETE" });
      setToast("Akun dihapus.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <main className="collection-page">
      <LatarInteraktif />
      <KepalaHalaman bagian="Akun" />
      <div className="collection-body">
        <div className="page-title-row">
          <div>
            <span className="section-kicker">
              <span /> AKSES TIM
            </span>
            <h1>Akun yang boleh masuk.</h1>
            <p>
              Kelola akun pengguna. Akun disimpan di database, kata sandi
              di-hash sebelum disimpan.
            </p>
          </div>
          <Button
            onClick={() => {
              setForm(kosong);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Tambah akun
          </Button>
        </div>
        <div className="collection-summary">
          <span>
            <UserRound size={16} />
            <b>{jumlah(akun.length)}</b> akun terdaftar
          </span>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="empty-state">Membuka daftar akun…</div>
        ) : !akun.length ? (
          <div className="empty-state">
            <UserRound size={30} />
            <h3>Belum ada akun di database</h3>
            <p>
              Login saat ini memakai ADMIN_EMAIL dari berkas .env. Tambahkan akun
              agar pengguna lain bisa masuk.
            </p>
          </div>
        ) : (
          <div className="account-list">
            {akun.map((a) => (
              <article key={a.id} className="account-row">
                <span className="account-avatar">{a.nama.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{a.nama}</strong>
                  <small>{a.email}</small>
                </div>
                <span className="account-date">
                  Dibuat{" "}
                  {new Date(a.dibuat).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <button
                  aria-label={`Ubah ${a.email}`}
                  className="account-action"
                  onClick={() => {
                    setForm({ id: a.id, nama: a.nama, email: a.email, sandi: "" });
                    setOpen(true);
                  }}
                >
                  <KeyRound size={15} />
                </button>
                <button
                  aria-label={`Hapus ${a.email}`}
                  className="account-action"
                  onClick={() => void hapus(a)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Ubah akun" : "Tambah akun"}
      >
        <form className="account-form" onSubmit={simpan}>
          <label>
            Nama
            <input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Nama pengguna"
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@perusahaan.com"
              disabled={!!form.id}
              required
            />
          </label>
          <label>
            {form.id ? "Kata sandi baru (kosongkan untuk tetap)" : "Kata sandi"}
            <input
              type="password"
              value={form.sandi}
              onChange={(e) => setForm({ ...form, sandi: e.target.value })}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              required={!form.id}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {form.id ? "Simpan perubahan" : "Tambah akun"}
          </Button>
        </form>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}