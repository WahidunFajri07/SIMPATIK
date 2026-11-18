import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./halaman.css";
export const metadata: Metadata = {
  title: "SIMPATIK — Setiap titik, lebih pasti.",
  description: "Ruang kerja pencocokan dan pemetaan titik koordinat.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
