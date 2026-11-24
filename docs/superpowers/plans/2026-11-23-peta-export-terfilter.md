# Kanvas Peta dan Export Terfilter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bersihkan kanvas ruang kerja, tambah HUD/legenda adaptif, dan samakan filter status antara tabel, peta, export, serta quick export riwayat.

**Architecture:** Pertahankan state React lokal yang sudah ada. `KanvasPeta` mengelola HUD cursor, mode satelit, dan legenda expandable; `ruang-kerja` meneruskan `mapFilter` ke tabel/peta dan menu export; route GET export memfilter hasil sebelum semua serializer; riwayat memakai URL endpoint yang sama.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS custom, Framer Motion, MapLibre/deck.gl, XLSX, PapaParse, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-peta-export-design.md`

## Global Constraints

- Jangan ubah API selain parameter opsional `status` pada GET `/api/konfirmasi`.
- Jangan ubah database, `.env`, algoritma pencocokan, atau data import.
- Testing fokus hanya fitur baru; jangan mengulang full E2E.
- Format export tetap `xlsx`, `csv`, `kml`, `geojson`.
- Filter status valid: `AKURAT`, `PERLU_KOREKSI_JARAK`, `KANDIDAT_LOKASI_TERDEKAT`, `TIDAK_DITEMUKAN`, atau kosong/`SEMUA`.
- Marker colors: Master A `#2563EB`, Tinjauan B `#F59E0B`, confirmed `#10B981`.
- Dark frosted glass: `rgba(15, 23, 42, 0.80)`, text `#F8FAFC`, blur `10px`, border `rgba(255,255,255,0.16)`.

## Review Focus

- Cursor keluar peta: HUD kembali ke kamera, bukan angka terakhir atau `NaN`.
- Nama sesi berisi slash, quote, atau karakter kontrol: `Content-Disposition` tetap valid dan aman.
- Filter `SEMUA` dan status kosong: seluruh baris diekspor dan filename memakai `_SEMUA`.
- Export kosong: semua format tetap menghasilkan file valid dengan nol feature/baris data.
- Riwayat pada layar sempit: menu quick export tidak keluar viewport dan semua status tetap dapat dipilih.

---

### Task 1: HUD, Legenda, dan Kontras Kanvas

**Files:**
- Modify: `src/app/(kerja)/ruang-kerja/page.tsx` — hapus hero/tagline dekoratif.
- Modify: `src/components/peta/kanvas-peta.tsx` — cursor HUD, expandable legend, marker colors, satellite theme class.
- Modify: `src/app/globals.css` — micro HUD, compact legend, dark frosted controls, overlap-safe positions.
- Test: `tests/e2e/peta-hud.spec.ts` — focused canvas assertions.

**Interfaces:**
- Consumes: existing `position`, `satellite`, `drawerHeight`, `MapLibre` map ref, existing Framer Motion dependency.
- Produces: `.map-location` micro HUD with cursor-driven coordinates; `.map-legend` compact collapsed/expanded state; `data-map-mode="standard|satellite"` on map container or wrapper; no `.workspace-caption` in workspace.

- [ ] **Step 1: Write failing focused map test**

  Assert workspace has no hero caption, HUD is compact, mouse movement changes HUD text, leaving map returns HUD to a camera coordinate, legend starts collapsed and expands on click/hover, standard and satellite states expose theme classes, and marker/legend colors equal the required hex values.

- [ ] **Step 2: Run focused test and verify RED**

  Run: `npx playwright test tests/e2e/peta-hud.spec.ts`

  Expected: FAIL because hero caption remains, HUD is large camera-only pill, legend is always expanded, and required theme/color hooks do not exist.

- [ ] **Step 3: Implement minimum kanvas UI behavior**

  Use `onMouseMove`/`onMouseLeave` on the map region. Convert `e.lngLat` when available from MapLibre canvas events or use the pointer position/camera mapping already exposed by the map; store cursor position and reset to `map.getCenter()` on leave. Render a compact HUD with formatted latitude/longitude.

  Replace the long legend contents with a button-like compact capsule and a Framer Motion expand region. Preserve accessible labels and point count. Add mode data/class based on `satellite`; use required marker colors in deck layers and legend dots. Remove workspace caption render only; do not remove login/loading tagline.

- [ ] **Step 4: Implement CSS geometry and adaptive contrast**

  Keep HUD and collapsed legend above drawer using `bottom: calc(drawerHeight * 1dvh + safe gap)`, compact width, and separate vertical rows. Add `.map-satellite` dark frosted glass rules for HUD, legend, and map controls. Ensure mobile and drawer heights 12/45/85 do not overlap.

- [ ] **Step 5: Run focused map test and verify GREEN**

  Run: `npx playwright test tests/e2e/peta-hud.spec.ts`

  Expected: PASS.

- [ ] **Step 6: Run typecheck**

  Run: `npx tsc --noEmit`

  Expected: PASS.

---

### Task 2: Filtered Export and Workspace Shared State

**Files:**
- Modify: `src/app/api/konfirmasi/route.ts` — validate/filter `status`, safe session filename, filename headers, Excel metadata.
- Modify: `src/components/tabel/laci-tabel.tsx` — export links use current filter and clear labels.
- Modify: `src/app/(kerja)/ruang-kerja/page.tsx` — pass filter to export link state if needed; retain existing table/peta shared filter.
- Test: `tests/e2e/ekspor-terfilter.spec.ts` — focused API/UI export assertions.

**Interfaces:**
- Consumes: existing `GET /api/konfirmasi?sesiId=<uuid>&format=<format>`; existing `mapFilter` callback/state; existing three-sheet XLSX structure.
- Produces: optional `status` query; safe filename `SIMPATIK_<safe-session>_<STATUS>.<ext>`; `Ringkasan Audit` row `Filter Export`; menu labels for active filter and all statuses.

- [ ] **Step 1: Write failing focused export tests**

  Create a session with mixed statuses, request CSV/XLSX/KML/GeoJSON with `status=PERLU_KOREKSI_JARAK`, assert each payload contains only that status, assert filename contains `_PERLU_KOREKSI_JARAK`, assert XLSX `Ringkasan Audit` includes `Filter Export`, request `SEMUA`/no status and assert all rows plus `_SEMUA`, and assert invalid status returns 400. In UI, select `Perlu koreksi`, open export menu, assert active-filter label and URL status query.

- [ ] **Step 2: Run focused tests and verify RED**

  Run: `npx playwright test tests/e2e/ekspor-terfilter.spec.ts`

  Expected: FAIL because route ignores `status`, filename uses UUID, Excel lacks filter metadata, and links have no status/active-filter labels.

- [ ] **Step 3: Implement route filtering and safe naming**

  Parse `status`; accept empty/`SEMUA` as no filter; reject unknown values with `ApiError` 400. Filter `hasil` before building audit rows, final rows, summaries, and all output formats. Add `safeFilenamePart` that preserves readable Indonesian/session characters while replacing path separators, quotes, controls, and unsupported punctuation. Use `SIMPATIK_<nama-sesi>_<filter-or-SEMUA>` and correct extension.

- [ ] **Step 4: Implement workspace export links**

  Build links from `sesi.id`, `format`, and current `filter`. Show `Export Sesuai Filter (<label>)` when filter is not `SEMUA`, plus `Export Semua Status` links. Preserve existing format labels and close menu on navigation.

- [ ] **Step 5: Run focused export tests and verify GREEN**

  Run: `npx playwright test tests/e2e/ekspor-terfilter.spec.ts`

  Expected: PASS.

- [ ] **Step 6: Run typecheck and unit tests**

  Run: `npx tsc --noEmit && npm test`

  Expected: typecheck clean and existing unit tests pass.

---

### Task 3: Quick Export Riwayat

**Files:**
- Modify: `src/app/(kerja)/riwayat/page.tsx` — per-session Export Cepat menu with format/status options.
- Modify: `src/app/globals.css` or `src/app/halaman.css` — menu sizing and mobile overflow safety.
- Test: `tests/e2e/quick-export-riwayat.spec.ts` — focused history export assertions.

**Interfaces:**
- Consumes: existing `Sesi` rows and GET export contract from Task 2.
- Produces: per-row `Export Cepat` control with Excel 3-Sheet, CSV, KML, GeoJSON and status choices `SEMUA` plus all four statuses.

- [ ] **Step 1: Write failing focused history test**

  Open `/riwayat`, assert each session has `Export Cepat`, open one menu, assert all four formats and status choices, choose filtered CSV and assert URL includes `sesiId`, `format=csv`, and selected status; assert menu remains within viewport at mobile width.

- [ ] **Step 2: Run focused test and verify RED**

  Run: `npx playwright test tests/e2e/quick-export-riwayat.spec.ts`

  Expected: FAIL because history has only the old icon XLSX link and no quick-export menu.

- [ ] **Step 3: Implement minimal quick export menu**

  Add local open-session state and one menu per row. Generate links with endpoint, session ID, format, and status; use `SEMUA` without status or an explicit valid status query. Use accessible button/menu labels and close after selection. Keep existing icon export behavior only if it does not duplicate confusingly; otherwise replace it with the named control.

- [ ] **Step 4: Implement responsive CSS**

  Anchor menu to row action, use max-width/overflow rules, and at mobile keep menu inside viewport with a predictable left/right alignment.

- [ ] **Step 5: Run focused history test and verify GREEN**

  Run: `npx playwright test tests/e2e/quick-export-riwayat.spec.ts`

  Expected: PASS.

- [ ] **Step 6: Run required technical checks only**

  Run: `npx tsc --noEmit && npm test && npm run build`

  Expected: typecheck clean, unit tests pass, production build succeeds. Do not run full E2E.

---

## Self-review

- Spec coverage: Task 1 covers all canvas visual requirements; Task 2 covers filtered export and shared workspace filter; Task 3 covers history quick export and responsive menu.
- Testing scope follows request: only three new focused Playwright tests plus required typecheck/unit/build; no full E2E.
- Existing API surface remains unchanged except optional `status` on requested GET export route.
- No database, env, matching, or import files are in task scope.
- Review focus maps to tests/implementation: cursor leave, filename sanitization, SEMUA/empty export, zero-row output, and mobile history menu.
