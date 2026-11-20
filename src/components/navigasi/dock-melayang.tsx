"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map,
  Layers3,
  Plus,
  History,
  LogOut,
  Users,
  CheckCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { LayarMuat } from "../animasi/layar-muat";
import { api } from "@/lib/klien";
export function DockMelayang() {
  const path = usePathname(),
    [logout, setLogout] = useState(false),
    [error, setError] = useState("");
  async function keluar() {
    try {
      await api("/api/auth", { method: "DELETE" });
      setLogout(true);
      setTimeout(() => window.location.assign("/masuk"), 1800);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <nav className="dock" aria-label="Navigasi utama">
        {[
          { href: "/ruang-kerja", label: "Ruang kerja", icon: Map },
          { href: "/gudang-master", label: "Gudang master", icon: Layers3 },
          { href: "/ruang-kerja?baru=1", label: "Sesi baru", icon: Plus },
          { href: "/riwayat", label: "Riwayat sesi", icon: History },
          { href: "/validasi", label: "Validasi massal", icon: CheckCheck },
          { href: "/akun", label: "Akun", icon: Users },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            onClick={(e) => {
              if (href.includes("baru=1") && path === "/ruang-kerja") {
                e.preventDefault();
                window.dispatchEvent(new Event("simpatik:sesi-baru"));
              }
            }}
            className={`dock-item ${path === href ? "active" : ""}`}
            aria-label={label}
          >
            <motion.span whileHover={{ scale: 1.18 }}>
              <Icon size={21} />
            </motion.span>
            <span className="dock-tooltip">{label}</span>
          </Link>
        ))}
        <div className="dock-separator" />
        <button className="dock-item" aria-label="Keluar" onClick={keluar}>
          <LogOut size={20} />
          <span className="dock-tooltip">Keluar</span>
        </button>
      </nav>
      {logout && <LayarMuat mode="keluar" />}
      {error && (
        <div className="toast" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
