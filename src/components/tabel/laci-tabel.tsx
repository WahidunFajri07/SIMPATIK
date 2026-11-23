"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownToLine,
  ArrowDownUp,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Expand,
  ListFilter,
  Minimize2,
  Search,
  Table2,
} from "lucide-react";
import {
  LABEL_STATUS,
  LABEL_KEPUTUSAN,
  type Hasil,
  type Sesi,
} from "@/lib/tipe";
import { jumlah, meter } from "@/lib/klien";
import { Button } from "../ui/button";
export function StatusBadge({ status }: { status: Hasil["status"] }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <i />
      {LABEL_STATUS[status]}
    </span>
  );
}
const col = createColumnHelper<Hasil>();
const columns = [
  col.accessor("deskripsiA", {
    header: "Deskripsi A",
    size: 150,
    cell: (i) => <span className="table-code">{i.getValue() || "—"}</span>,
  }),
  col.accessor("sumber", {
    header: "Sumber master",
    size: 180,
    cell: (i) => <span className="table-source">{i.getValue() || "—"}</span>,
  }),
  col.accessor(
    (h) => (h.ax === null ? "—" : `${h.ax.toFixed(6)}, ${h.ay!.toFixed(6)}`),
    {
      id: "koordinatA",
      header: "Koordinat A (X, Y)",
      size: 215,
      cell: (i) => <span className="mono">{i.getValue()}</span>,
    },
  ),
  col.accessor("status", {
    header: "Keterangan status",
    size: 190,
    cell: (i) => <StatusBadge status={i.getValue()} />,
  }),
  col.accessor("jarak", {
    header: "Jarak (m)",
    size: 110,
    cell: (i) => (
      <span
        className={`mono ${i.row.original.status === "PERLU_KOREKSI_JARAK" ? "distance-warning" : ""}`}
      >
        {meter(i.getValue())}
      </span>
    ),
  }),
  col.accessor("deskripsiB", {
    header: "Deskripsi B",
    size: 150,
    cell: (i) =>
      i.getValue() ? (
        <span className="table-code">{i.getValue()}</span>
      ) : (
        <span className="no-description">Tanpa deskripsi</span>
      ),
  }),
  col.accessor((h) => `${h.bx.toFixed(6)}, ${h.by.toFixed(6)}`, {
    id: "koordinatB",
    header: "Koordinat B (X, Y)",
    size: 215,
    cell: (i) => <span className="mono">{i.getValue()}</span>,
  }),
  col.accessor("keputusan", {
    header: "Konfirmasi",
    size: 205,
    cell: (i) => (
      <span
        className={`decision-cell ${i.getValue() !== "BELUM_DITINJAU" ? "confirmed" : ""}`}
      >
        {i.getValue() !== "BELUM_DITINJAU" && <CheckCheck size={13} />}{" "}
        {LABEL_KEPUTUSAN[i.getValue()]}
      </span>
    ),
  }),
];
export function LaciTabel({
  hasil,
  sesi,
  selectedId,
  onSelect,
  height,
  onHeight,
  loading,
  onFilter,
}: {
  hasil: Hasil[];
  sesi: Sesi | null;
  selectedId?: string;
  onSelect: (h: Hasil) => void;
  height: number;
  onHeight: (n: number) => void;
  loading: boolean;
  onFilter?: (status: string) => void;
}) {
  const [filter, setFilter] = useState("SEMUA"),
    [search, setSearch] = useState(""),
    [sorting, setSorting] = useState<SortingState>([]),
    [exportOpen, setExportOpen] = useState(false),
    [pending, setPending] = useState(false);
  // Sinkronkan filter tabel ke layer peta agar keduanya menampilkan hal sama.
  useEffect(() => {
    onFilter?.(filter);
  }, [filter, onFilter]);
  // Tinggi terakhir sebelum layar penuh, supaya tombol perkecil bisa kembali.
  const restore = useRef(45);
  useEffect(() => {
    if (height >= 20 && height < 70) restore.current = height;
  }, [height]);
  const ringkas = height >= 20;
  const layarPenuh = height >= 70;
  const scroller = useRef<HTMLDivElement>(null);
  const data = useMemo(
    () =>
      hasil.filter(
        (h) =>
          (filter === "SEMUA" || h.status === filter) &&
          (!pending || h.keputusan === "BELUM_DITINJAU"),
      ),
    [hasil, filter, pending],
  );
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: search },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 49,
    overscan: 12,
  });
  function drag(e: React.PointerEvent) {
    const start = e.clientY,
      initial = height;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (v: PointerEvent) =>
      onHeight(
        Math.max(
          12,
          Math.min(
            85,
            initial + ((start - v.clientY) / window.innerHeight) * 100,
          ),
        ),
      );
    const up = (v: PointerEvent) => {
      const h = initial + ((start - v.clientY) / window.innerHeight) * 100;
      onHeight(
        [12, 45, 85].reduce((a, b) =>
          Math.abs(b - h) < Math.abs(a - h) ? b : a,
        ),
      );
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }
  const stats = [
    { key: "SEMUA", label: "Seluruh titik", n: sesi?.total ?? 0 },
    {
      key: "AKURAT",
      label: "Akurat",
      n: hasil.filter((h) => h.status === "AKURAT").length,
    },
    {
      key: "PERLU_KOREKSI_JARAK",
      label: "Perlu koreksi",
      n: hasil.filter((h) => h.status === "PERLU_KOREKSI_JARAK").length,
    },
    {
      key: "KANDIDAT_LOKASI_TERDEKAT",
      label: "Kandidat terdekat",
      n: hasil.filter((h) => h.status === "KANDIDAT_LOKASI_TERDEKAT").length,
    },
    {
      key: "TIDAK_DITEMUKAN",
      label: "Tidak ditemukan",
      n: hasil.filter((h) => h.status === "TIDAK_DITEMUKAN").length,
    },
  ];
  return (
    <section
      className={`table-drawer ${height < 20 ? "compact" : ""}`}
      style={{ height: `${height}dvh` }}
      aria-label="Hasil pencocokan"
    >
      <div
        className="drawer-handle"
        onPointerDown={drag}
        role="separator"
        aria-label="Ubah tinggi tabel"
        aria-orientation="horizontal"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") onHeight(Math.min(85, height + 33));
          if (e.key === "ArrowDown") onHeight(Math.max(12, height - 33));
        }}
      >
        <span />
      </div>
      <div className="drawer-summary">
        <div className="result-title">
          <span>
            <Table2 size={17} />
          </span>
          <div>
            <strong>Hasil pencocokan</strong>
            <small>{sesi?.nama ?? "Belum ada sesi aktif"}</small>
          </div>
        </div>
        <div className="result-stats">
          {stats.map((s) => (
            <button
              key={s.key}
              className={`${filter === s.key ? "active" : ""} stat-${s.key.toLowerCase()}`}
              onClick={() => {
                setFilter(s.key);
                if (height < 20) onHeight(45);
              }}
            >
              <strong>{jumlah(s.n)}</strong>
              <span>
                <i />
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <div className="drawer-size-controls">
          <button
            aria-label={ringkas ? "Ringkas tabel" : "Buka tabel"}
            aria-expanded={ringkas}
            onClick={() => {
              if (ringkas) {
                restore.current = height;
                onHeight(12);
              } else onHeight(restore.current < 20 ? 45 : restore.current);
            }}
          >
            {ringkas ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button
            aria-label={
              layarPenuh ? "Kembalikan ukuran tabel" : "Perbesar tabel"
            }
            onClick={() => {
              if (layarPenuh)
                onHeight(restore.current < 70 ? 45 : restore.current);
              else {
                restore.current = height;
                onHeight(85);
              }
            }}
          >
            {layarPenuh ? <Minimize2 size={15} /> : <Expand size={15} />}
          </button>
        </div>
      </div>
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={14} />
          <input
            value={search}
            aria-label="Cari hasil pencocokan"
            placeholder="Cari deskripsi, kode, atau sumber…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="filter-label">
          <ListFilter size={13} />
          {filter === "SEMUA"
            ? "Semua status"
            : LABEL_STATUS[filter as Hasil["status"]]}
        </span>
        <select
          className="status-mobile"
          aria-label="Filter status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="SEMUA">Semua status</option>
          {Object.entries(LABEL_STATUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="pending-filter">
          <input
            type="checkbox"
            checked={pending}
            onChange={(e) => setPending(e.target.checked)}
          />{" "}
          Belum ditinjau
        </label>
        <div className="export-wrap">
          <Button
            variant="secondary"
            disabled={!sesi || loading}
            onClick={() => setExportOpen(!exportOpen)}
          >
            <ArrowDownToLine size={14} /> Ekspor hasil <ChevronDown size={12} />
          </Button>
          {exportOpen && sesi && (
            <div className="export-menu">
              <a
                href={`/api/konfirmasi?sesiId=${sesi.id}&format=xlsx`}
                onClick={() => setExportOpen(false)}
              >
                Excel (.xlsx) · 3 sheet
              </a>
              <a
                href={`/api/konfirmasi?sesiId=${sesi.id}&format=csv`}
                onClick={() => setExportOpen(false)}
              >
                CSV (.csv)
              </a>
              <a
                href={`/api/konfirmasi?sesiId=${sesi.id}&format=kml`}
                onClick={() => setExportOpen(false)}
              >
                Google Earth (.kml)
              </a>
              <a
                href={`/api/konfirmasi?sesiId=${sesi.id}&format=geojson`}
                onClick={() => setExportOpen(false)}
              >
                QGIS / GeoJSON (.geojson)
              </a>
            </div>
          )}
        </div>
      </div>
      <div
        className="table-scroll"
        ref={scroller}
        role="grid"
        aria-label="Tabel hasil pencocokan"
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
      >
        <div style={{ width: table.getTotalSize(), minWidth: "100%" }}>
          <div className="table-head" role="row">
            {table.getHeaderGroups()[0].headers.map((h) => (
              <div
                key={h.id}
                role="columnheader"
                style={{ width: h.getSize() }}
              >
                <button onClick={h.column.getToggleSortingHandler()}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  <ArrowDownUp size={10} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
            {virtual.getVirtualItems().map((v) => {
              const row = rows[v.index];
              return (
                <div
                  key={row.id}
                  role="row"
                  aria-rowindex={v.index + 2}
                  aria-selected={row.original.id === selectedId}
                  tabIndex={0}
                  className={`data-row ${row.original.id === selectedId ? "selected" : ""}`}
                  style={{
                    height: v.size,
                    transform: `translateY(${v.start}px)`,
                  }}
                  onClick={() => onSelect(row.original)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((c) => (
                    <div
                      key={c.id}
                      role="gridcell"
                      style={{ width: c.column.getSize() }}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {!rows.length && (
          <div className="table-empty">
            {loading
              ? "Memuat data pencocokan…"
              : sesi
                ? "Tidak ada titik sesuai filter ini."
                : "Mulai sesi baru untuk mencocokkan data Anda."}
          </div>
        )}
      </div>
      <footer className="table-footer">
        <span>
          {jumlah(rows.length)} dari {jumlah(sesi?.total ?? 0)} titik{" "}
          {loading ? "· Memuat…" : ""}
        </span>
        <span>
          <span className="tiny-dot" /> {sesi?.dikonfirmasi ?? 0} terkonfirmasi{" "}
          <i /> Toleransi {sesi?.toleransi ?? 15} m
        </span>
        <span>
          Pilih baris untuk meninjau titik <ArrowDownToLine size={11} />
        </span>
      </footer>
    </section>
  );
}
