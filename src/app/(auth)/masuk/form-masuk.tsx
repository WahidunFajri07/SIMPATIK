"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  LocateFixed,
  MoveUpRight,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LatarInteraktif } from "@/components/animasi/latar-interaktif";
import { LayarMuat } from "@/components/animasi/layar-muat";
import { Button } from "@/components/ui/button";
import { kirim } from "@/lib/klien";
export function FormMasuk({ demo }: { demo: boolean }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [transition, setTransition] = useState(false);
  async function masuk(isDemo: boolean) {
    setBusy(true);
    setError("");
    try {
      await kirim("/api/auth", { email, password, demo: isDemo });
      setTransition(true);
      sessionStorage.setItem("simpatik-transition", "1");
      setTimeout(() => window.location.assign("/ruang-kerja"), 1700);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <LatarInteraktif />
      <header className="login-header">
        <Logo />
        <span className="eyebrow">SPATIAL INTELLIGENCE WORKSPACE</span>
      </header>
      <div className="login-body">
        <section className="login-story">
          <span className="section-kicker">
            <span /> DARI KOORDINAT MENJADI KEPASTIAN
          </span>
          <h1>
            Setiap titik,
            <br />
            <em>lebih pasti.</em>
          </h1>
          <p>
            Satukan data lapangan dan sumber master dalam satu ruang kerja.
            Cocokkan, tinjau, dan petakan dengan presisi.
          </p>
          <div className="login-diagram" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <svg viewBox="0 0 440 180">
              <path
                d="M70 130 Q200 -20 350 70"
                fill="none"
                stroke="#0b8f81"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <circle cx="70" cy="130" r="7" fill="#0b8f81" />
              <circle cx="350" cy="70" r="7" fill="#d79c4a" />
            </svg>
            <div className="diagram-label label-a">
              <LocateFixed size={16} /> Master A <span>107.6098, −6.9147</span>
            </div>
            <div className="diagram-label label-b">
              <MoveUpRight size={16} /> Tinjauan B <span>Jarak: 2,4 m</span>
            </div>
          </div>
          <div className="login-footnote">
            01 / IMPOR <span>→</span> 02 / COCOKKAN <span>→</span> 03 /
            KONFIRMASI
          </div>
        </section>
        <section className="login-form">
          <span className="eyebrow">SELAMAT DATANG KEMBALI</span>
          <h2>Masuk ke ruang kerja</h2>
          <p>Data yang rapi dimulai dari titik yang tepat.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void masuk(false);
            }}
          >
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Kata sandi
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" disabled={busy}>
              Masuk ke SIMPATIK <ArrowUpRight size={17} />
            </Button>
          </form>
          {demo && (
            <>
              <div className="form-divider">
                <span>ingin menjelajah dahulu?</span>
              </div>
              <Button
                variant="secondary"
                className="demo-button"
                disabled={busy}
                onClick={() => void masuk(true)}
              >
                Buka ruang demo <ArrowUpRight size={17} />
              </Button>
              <p className="demo-note">
                Termasuk data simulasi Bandung. Perubahan tersimpan secara
                lokal.
              </p>
            </>
          )}
          <div className="secure-note">
            <ShieldCheck size={16} /> Sesi terlindungi · Akses khusus tim
          </div>
        </section>
      </div>
      <footer className="login-footer">
        <span>SIMPATIK / Sistem Pencocokan & Pemetaan Titik Koordinat</span>
        <span>
          DIRANCANG UNTUK KETELITIAN <span className="tiny-dot" />
        </span>
      </footer>
      <LayarMuat />
      {transition && <LayarMuat mode="masuk" />}
    </main>
  );
}
