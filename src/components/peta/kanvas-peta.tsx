"use client";
import { useEffect, useRef, useState } from "react";
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
};
const colors: Record<string, [number, number, number, number]> = {
  MASTER: [12, 132, 118, 220],
  AKURAT: [20, 150, 126, 220],
  PERLU_KOREKSI_JARAK: [223, 146, 61, 235],
  KANDIDAT_LOKASI_TERDEKAT: [92, 142, 188, 235],
  TIDAK_DITEMUKAN: [157, 163, 171, 230],
};
const jalanTiles =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export function KanvasPeta({
  sesiId,
  selected,
  onSelect,
  refresh,
  drawerHeight,
}: {
  sesiId?: string;
  selected: Hasil | null;
  onSelect: (id: string) => void;
  refresh: number;
  drawerHeight: number;
}) {
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
    [position, setPosition] = useState({ x: 107.607, y: -6.91 });
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
    m.on("error", () =>
      setNotice(
        "Peta dasar belum tersedia. Periksa koneksi internet; titik tetap dapat ditinjau.",
      ),
    );
    m.on("moveend", () => {
      const p = m.getCenter();
      setPosition({ x: p.lng, y: p.lat });
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
  }, [ready, sesiId, refresh]);
  useEffect(() => {
    const o = overlay.current;
    if (!o) return;
    const layers: Layer[] = [
      new ScatterplotLayer<Point>({
        id: "titik-koordinat",
        data: points,
        getPosition: (p) => [p.x, p.y],
        getFillColor: (p) => colors[p.status] ?? colors.MASTER,
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
      const endpoints = [
        { x: selected.bx, y: selected.by, label: "B · Tinjauan" },
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
      if (selected.ax !== null && selected.ay !== null)
        layers.push(
          new ArcLayer<Hasil>({
            id: "garis-jarak",
            data: [selected],
            getSourcePosition: (p) => [p.ax!, p.ay!],
            getTargetPosition: (p) => [p.bx, p.by],
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
                x: (selected.ax + selected.bx) / 2,
                y: (selected.ay + selected.by) / 2,
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
          [
            Math.min(selected.ax, selected.bx),
            Math.min(selected.ay, selected.by),
          ],
          [
            Math.max(selected.ax, selected.bx),
            Math.max(selected.ay, selected.by),
          ],
        ],
        { padding, maxZoom: 18, duration: 1400 },
      );
    else
      m.flyTo({
        center: [selected.bx, selected.by],
        zoom: 17,
        padding,
        duration: 1400,
      });
  }, [selected?.id, ready]);
  function toggleSatellite() {
    const m = map.current;
    if (!m) return;
    const source = m.getSource("basemap") as maplibregl.RasterTileSource;
    source.setTiles(
      satellite
        ? [jalanTiles]
        : [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
    );
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
      />
      <div className="map-gradient" />
      <div className="map-location">
        <span className="tiny-dot" /> WGS84 · INDONESIA{" "}
        <span className="mono">
          {position.y.toFixed(4)}° / {position.x.toFixed(4)}°
        </span>
      </div>
      <div className="map-controls">
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
      <div
        className="map-legend"
        style={{ bottom: `calc(${drawerHeight}dvh + 42px)` }}
      >
        <span>
          <i style={{ background: "#0e9381" }} /> Master A
        </span>
        <span>
          <i style={{ background: "#dba052" }} /> Tinjauan B
        </span>
        <span className="legend-count">
          {points.length} titik dalam tampilan
        </span>
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
