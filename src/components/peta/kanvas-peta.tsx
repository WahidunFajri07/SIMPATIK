"use client";
import { useEffect, useRef, useState } from "react";
import { useKlikDiLuar } from "@/lib/use-klik-luar";
import { motion, useReducedMotion } from "framer-motion";
import maplibregl, { type Map as Peta } from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, ArcLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import {
  Plus,
  Minus,
  LocateFixed,
  Compass,
  Layers2,
  Mountain,
} from "lucide-react";
import type { Hasil } from "@/lib/tipe";
import { meter } from "@/lib/klien";
type Point = {
  id: string;
  x: number;
  y: number;
  deskripsi: string;
  jenis: string;
  status: string;
  keputusan?: string;
};
const colors: Record<string, [number, number, number, number]> = {
  MASTER: [37, 99, 235, 220],
  AKURAT: [20, 150, 126, 220],
  PERLU_KOREKSI_JARAK: [245, 158, 11, 235],
  KANDIDAT_LOKASI_TERDEKAT: [37, 99, 235, 235],
  TIDAK_DITEMUKAN: [157, 163, 171, 230],
};
/** Titik yang sudah diputuskan berubah hijau agar terlihat selesai di peta. */
const TERKONFIRMASI: [number, number, number, number] = [16, 185, 129, 255];
const sudahDitinjau = (p: Point) =>
  p.jenis === "tinjauan" && !!p.keputusan && p.keputusan !== "BELUM_DITINJAU";
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ESRI_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const jalanTiles = process.env.NEXT_PUBLIC_MAP_TILE_URL || OSM_TILES;
export function KanvasPeta({
  sesiId,
  selected,
  onSelect,
  refresh,
  drawerHeight,
  statusFilter,
}: {
  sesiId?: string;
  selected: Hasil | null;
  onSelect: (id: string) => void;
  refresh: number;
  drawerHeight: number;
  statusFilter?: string;
}) {
  const reduceMotion = useReducedMotion();
  const container = useRef<HTMLDivElement>(null),
    map = useRef<Peta | null>(null),
    overlay = useRef<MapboxOverlay | null>(null),
    select = useRef(onSelect);
  const [points, setPoints] = useState<Point[]>([]),
    [ready, setReady] = useState(false),
    [tilesReady, setTilesReady] = useState(false),
    [notice, setNotice] = useState(""),
    [pitch, setPitch] = useState(true),
    [satellite, setSatellite] = useState(false),
    [legendOpen, setLegendOpen] = useState(false),
    [cursor, setCursor] = useState<{ x: number; y: number } | null>(null),
    [position, setPosition] = useState({ x: 107.607, y: -6.91 });
  const legendRef = useKlikDiLuar<HTMLDivElement>(legendOpen, () =>
    setLegendOpen(false),
  );
  select.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    let m: Peta;
    try {
      m = new maplibregl.Map({
        container: container.current,
        center: [107.605, -6.91],
        zoom: 13.8,
        pitch: 45,
        bearing: -12,
        maxPitch: 60,
        maxZoom: 20,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            basemap: {
              type: "raster",
              tiles: [jalanTiles],
              tileSize: 256,
              maxzoom: 19,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#eaf0eb" },
            },
            {
              id: "basemap",
              type: "raster",
              source: "basemap",
              paint: { "raster-opacity": 0.88, "raster-saturation": -0.65 },
            },
          ],
        },
      });
    } catch {
      setNotice(
        "WebGL tidak tersedia. Aktifkan akselerasi grafis untuk melihat peta.",
      );
      return;
    }
    map.current = m;
    const o = new MapboxOverlay({ interleaved: false, layers: [] });
    overlay.current = o;
    m.addControl(o);
    // style.load does not wait for remote tiles: data layers work even offline.
    m.on("style.load", () => setReady(true));
    m.on("idle", () => {
      if (m.areTilesLoaded()) setTilesReady(true);
    });
    m.on("error", (event) => {
      setNotice(
        "Peta dasar belum tersedia. Beralih ke citra cadangan; titik tetap dapat ditinjau.",
      );
      if (!satellite && event.error?.message && m.getSource("basemap")) {
        const source = m.getSource("basemap") as maplibregl.RasterTileSource;
        source.setTiles([ESRI_TILES]);
        m.setPaintProperty("basemap", "raster-saturation", 0);
        m.setPaintProperty("basemap", "raster-opacity", 1);
        setSatellite(true);
      }
    });
    m.on("moveend", () => {
      const p = m.getCenter();
      setPosition({ x: p.lng, y: p.lat });
    });
    m.on("mousemove", (e) => setCursor({ x: e.lngLat.lng, y: e.lngLat.lat }));
    m.on("mouseleave", () => {
      if (m) setCursor({ x: m.getCenter().lng, y: m.getCenter().lat });
    });
    return () => {
      setReady(false);
      overlay.current = null;
      map.current = null;
      m.remove();
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let timer: ReturnType<typeof setTimeout>,
      controller: AbortController | undefined;
    async function fetchPoints() {
      if (!m) return;
      controller?.abort();
      controller = new AbortController();
      const b = m.getBounds();
      const q = new URLSearchParams({
        minX: String(Math.max(-180, b.getWest())),
        maxX: String(Math.min(180, b.getEast())),
        minY: String(Math.max(-90, b.getSouth())),
        maxY: String(Math.min(90, b.getNorth())),
        zoom: String(m.getZoom()),
      });
      if (sesiId) q.set("sesiId", sesiId);
      if (statusFilter && statusFilter !== "SEMUA")
        q.set("status", statusFilter);
      try {
        const r = await fetch("/api/titik-peta?" + q, {
          signal: controller.signal,
        });
        if (!r.ok) throw Error("Gagal memuat titik peta.");
        const d = await r.json();
        setPoints(d.points);
        if (d.terbatas)
          setNotice(
            "Tampilan dibatasi 8.000 titik per layer. Perbesar peta untuk melihat rincian.",
          );
        else
          setNotice((current) =>
            current.includes("8.000") || current.includes("Gagal memuat")
              ? ""
              : current,
          );
      } catch (e) {
        if ((e as Error).name !== "AbortError") setNotice((e as Error).message);
      }
    }
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void fetchPoints(), 180);
    };
    m.on("moveend", update);
    void fetchPoints();
    return () => {
      clearTimeout(timer);
      controller?.abort();
      m.off("moveend", update);
    };
  }, [ready, sesiId, refresh, statusFilter]);
  useEffect(() => {
    const o = overlay.current;
    if (!o) return;
    const layers: Layer[] = [
      new ScatterplotLayer<Point>({
        id: "titik-koordinat",
        data: points,
        getPosition: (p) => [p.x, p.y],
        getFillColor: (p) =>
          sudahDitinjau(p)
            ? TERKONFIRMASI
            : (colors[p.status] ?? colors.MASTER),
        getRadius: (p) => (p.jenis === "master" ? 5 : 3),
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        stroked: true,
        getLineColor: [255, 255, 255, 230],
        getLineWidth: 1,
        lineWidthUnits: "pixels",
        pickable: true,
        onClick: (info) => {
          if (info.object?.jenis === "tinjauan") select.current(info.object.id);
        },
      }),
    ];
    if (selected) {
      // Posisi efektif: hasil koreksi bila sudah dikonfirmasi.
      const tx = selected.hasilX ?? selected.bx,
        ty = selected.hasilY ?? selected.by;
      const terkoreksi =
        tx !== selected.bx || ty !== selected.by ? true : false;
      const endpoints = [
        { x: tx, y: ty, label: terkoreksi ? "B · Terkoreksi" : "B · Tinjauan" },
        ...(selected.ax !== null && selected.ay !== null
          ? [{ x: selected.ax, y: selected.ay, label: "A · Master" }]
          : []),
      ];
      layers.push(
        new ScatterplotLayer({
          id: "titik-aktif",
          data: endpoints,
          getPosition: (p: { x: number; y: number }) => [p.x, p.y],
          getFillColor: [255, 255, 255, 255],
          getLineColor: [8, 128, 119, 255],
          stroked: true,
          getRadius: 9,
          radiusUnits: "pixels",
          getLineWidth: 3,
          lineWidthUnits: "pixels",
        }),
      );
      // Garis anomali disembunyikan setelah titik diputuskan.
      if (
        selected.ax !== null &&
        selected.ay !== null &&
        selected.keputusan === "BELUM_DITINJAU"
      )
        layers.push(
          new ArcLayer<Hasil>({
            id: "garis-jarak",
            data: [selected],
            getSourcePosition: (p) => [p.ax!, p.ay!],
            getTargetPosition: (p) => [p.hasilX ?? p.bx, p.hasilY ?? p.by],
            getSourceColor: [10, 142, 124],
            getTargetColor: [228, 159, 75],
            getWidth: 3,
            getHeight: 0.5,
            greatCircle: false,
          }),
        );
      const labels = [
        ...endpoints,
        ...(selected.ax !== null && selected.ay !== null
          ? [
              {
                x: (selected.ax + tx) / 2,
                y: (selected.ay + ty) / 2,
                label: `${meter(selected.jarak)} m`,
              },
            ]
          : []),
      ];
      layers.push(
        new TextLayer({
          id: "label-inspeksi",
          data: labels,
          getPosition: (p: { x: number; y: number }) => [p.x, p.y],
          getText: (p: { label: string }) => p.label,
          getColor: [24, 67, 57],
          getSize: 12,
          getPixelOffset: [0, -24],
          fontFamily: "sans-serif",
          fontWeight: 600,
          background: true,
          getBackgroundColor: [255, 255, 255, 235],
          backgroundPadding: [7, 5],
          billboard: true,
        }),
      );
    }
    o.setProps({
      layers,
      getTooltip: ({ object }) =>
        object?.deskripsi
          ? {
              text: object.deskripsi,
              style: {
                backgroundColor: "#204b43",
                fontSize: "11px",
                borderRadius: "6px",
              },
            }
          : null,
    });
  }, [points, selected, ready]);
  useEffect(() => {
    if (!selected || !map.current || !ready) return;
    const m = map.current,
      tx = selected.hasilX ?? selected.bx,
      ty = selected.hasilY ?? selected.by,
      padding = {
        top: 130,
        bottom: Math.min(
          (window.innerHeight * drawerHeight) / 100 + 45,
          window.innerHeight * 0.55,
        ),
        left: 130,
        right: window.innerWidth > 1100 ? 390 : 40,
      };
    if (
      selected.ax !== null &&
      selected.ay !== null &&
      selected.jarak !== null &&
      selected.jarak > 20
    )
      m.fitBounds(
        [
          [Math.min(selected.ax, tx), Math.min(selected.ay, ty)],
          [Math.max(selected.ax, tx), Math.max(selected.ay, ty)],
        ],
        { padding, maxZoom: 18, duration: 1400 },
      );
    else
      m.flyTo({
        center: [tx, ty],
        zoom: 17,
        padding,
        duration: 1400,
      });
  }, [selected?.id, ready]);
  function toggleSatellite() {
    const m = map.current;
    if (!m) return;
    const source = m.getSource("basemap") as maplibregl.RasterTileSource;
    source.setTiles(satellite ? [jalanTiles] : [ESRI_TILES]);
    m.setPaintProperty("basemap", "raster-saturation", satellite ? -0.65 : 0);
    m.setPaintProperty("basemap", "raster-opacity", satellite ? 0.88 : 1);
    setSatellite(!satellite);
  }
  return (
    <>
      <div
        className="map-canvas"
        ref={container}
        role="region"
        aria-label="Peta koordinat interaktif"
        data-ready={ready}
        data-tiles-ready={tilesReady}
        data-points={points.length}
        data-map-mode={satellite ? "satellite" : "standard"}
      />
      <div className="map-gradient" />
      <div
        className={`map-readouts ${satellite ? "map-satellite" : ""}`}
        style={{ bottom: `calc(${drawerHeight}dvh + 42px)` }}
      >
        <div
          className={`map-location map-cursor-hud ${satellite ? "map-satellite" : ""}`}
        >
          <span className="tiny-dot" />
          <span>WGS84</span>
          <span className="mono">
            {cursor ? cursor.y.toFixed(4) : position.y.toFixed(4)}° /
            {cursor ? cursor.x.toFixed(4) : position.x.toFixed(4)}°
          </span>
        </div>
        <div className="map-legend" ref={legendRef}>
          <button
            className="legend-pill"
            onClick={() => setLegendOpen(!legendOpen)}
            aria-expanded={legendOpen}
            aria-label={`Keterangan peta · ${points.length} titik`}
          >
            <i style={{ background: "#2563EB" }} /> Keterangan peta ·{" "}
            {points.length} titik
          </button>
          {legendOpen && (
            <motion.div
              className="map-legend-details"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 300, damping: 28 }
              }
            >
              <div>
                <i style={{ background: "#2563EB" }} /> Master A
              </div>
              <div>
                <i style={{ background: "#F59E0B" }} /> Tinjauan B
              </div>
              <div>
                <i style={{ background: "#10B981" }} /> Sudah dikonfirmasi
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className={`map-controls ${satellite ? "map-satellite" : ""}`}>
        <div>
          <button
            aria-label="Perbesar peta"
            onClick={() => map.current?.zoomIn()}
          >
            <Plus size={18} />
          </button>
          <button
            aria-label="Perkecil peta"
            onClick={() => map.current?.zoomOut()}
          >
            <Minus size={18} />
          </button>
          <i />
          <button
            aria-label="Kembali ke Bandung"
            onClick={() =>
              map.current?.flyTo({
                center: [107.605, -6.91],
                zoom: 13.8,
                bearing: -12,
                pitch: 45,
                duration: 1200,
              })
            }
          >
            <LocateFixed size={18} />
          </button>
          <button
            aria-label="Arah utara"
            onClick={() => map.current?.easeTo({ bearing: 0 })}
          >
            <Compass size={18} />
          </button>
        </div>
        <button
          className={pitch ? "active" : ""}
          aria-label="Ubah kemiringan peta"
          onClick={() => {
            map.current?.easeTo({ pitch: pitch ? 0 : 45, duration: 600 });
            setPitch(!pitch);
          }}
        >
          <Mountain size={18} />
          <span>{pitch ? "3D" : "2D"}</span>
        </button>
        <button aria-label="Ubah peta dasar" onClick={toggleSatellite}>
          <Layers2 size={18} />
        </button>
      </div>
      {notice && (
        <div className="map-notice" role="status">
          {notice}
        </div>
      )}
      <div className="map-attribution">
        {satellite ? (
          <a href="https://www.esri.com/" target="_blank" rel="noreferrer">
            Citra © Esri, Maxar, Earthstar Geographics
          </a>
        ) : (
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>
        )}{" "}
        · WGS84
      </div>
    </>
  );
}
