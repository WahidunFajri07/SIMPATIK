"use client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
export function LayarMuat({
  mode = "awal",
  selesai,
}: {
  mode?: "awal" | "masuk" | "keluar";
  selesai?: () => void;
}) {
  const [show, setShow] = useState(true);
  const reduced = useReducedMotion();
  useEffect(() => {
    const t = setTimeout(
      () => {
        setShow(false);
        selesai?.();
      },
      reduced ? 250 : mode === "awal" ? 2200 : 1500,
    );
    return () => clearTimeout(t);
  }, [mode, reduced, selesai]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`intro intro-${mode}`}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: mode === "masuk" ? 1.4 : mode === "keluar" ? 0.85 : 1,
            filter: "blur(8px)",
          }}
          transition={{ duration: 0.4 }}
          role="status"
          aria-label="Menyiapkan SIMPATIK"
        >
          <div className="intro-grid" />
          <div className="intro-center">
            <svg
              width="100"
              height="80"
              viewBox="0 0 100 80"
              aria-hidden="true"
            >
              <motion.circle
                cx="50"
                cy="40"
                r="28"
                fill="none"
                stroke="#73c5b8"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.5, 1.3, 1], opacity: [0, 0.8, 0.2] }}
                transition={{ duration: 1.5 }}
              />
              <motion.path
                d="M18 40 L82 40"
                stroke="#0a8278"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7 }}
              />
              <motion.circle
                cy="40"
                r="7"
                fill="#09877d"
                initial={{ cx: 18 }}
                animate={{ cx: 45 }}
                transition={{ duration: 1, type: "spring" }}
              />
              <motion.circle
                cy="40"
                r="7"
                fill="#dcaa5d"
                initial={{ cx: 82 }}
                animate={{ cx: 55 }}
                transition={{ duration: 1, type: "spring" }}
              />
            </svg>
            <div className="intro-word">
              {"SIMPATIK".split("").map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06, type: "spring" }}
                >
                  {c}
                </motion.span>
              ))}
            </div>
            <p>
              {mode === "keluar"
                ? "Menyimpan sesi kerja…"
                : "Sistem Pencocokan & Pemetaan Titik Koordinat"}
            </p>
            <span className="eyebrow">SETIAP TITIK, LEBIH PASTI.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
