"use client";
import { useEffect, useState } from "react";
import { LayarMuat } from "./animasi/layar-muat";
import { DockMelayang } from "./navigasi/dock-melayang";
export function Cangkang({ children }: { children: React.ReactNode }) {
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    if (sessionStorage.getItem("simpatik-transition")) setIntro(false);
    sessionStorage.removeItem("simpatik-transition");
  }, []);
  return (
    <>
      {children}
      <DockMelayang />
      {intro && <LayarMuat />}
    </>
  );
}
