# Ruang Kerja UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki filter status ruang kerja agar tabel dan peta selalu mengikuti status yang sama, lalu ubah detail inspeksi dari fullscreen menjadi panel overlay kanan dengan backdrop blur yang tetap menjaga konteks peta.

**Architecture:** Pertahankan state `mapFilter` di page ruang kerja sebagai sumber tunggal. `LaciTabel` menampilkan kontrol filter eksplisit dan memanggil `onFilter`; `KanvasPeta` memakai prop `statusFilter` untuk request ulang endpoint yang sudah ada. `KartuInspeksi` tetap menjadi komponen aksi, tetapi mode detail diberi backdrop sibling dan ukuran panel terbatas melalui class CSS; tidak ada perubahan API atau database.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS custom, MapLibre/deck.gl, Framer Motion, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-ruang-kerja-ux-design.md`

## Global Constraints

- Jangan ubah API, database, `.env`, data import, algoritma pencocokan, atau format ekspor.
- Jangan menambah dependency.
- Semua status `SEMUA`, `AKURAT`, `PERLU_KOREKSI_JARAK`, `KANDIDAT_LOKASI_TERDEKAT`, `TIDAK_DITEMUKAN` harus dapat dipilih dan dilacak di peta.
- Tombol `Lihat detail` selalu terlihat pada kartu inspeksi.
- Detail tidak boleh memakai hampir seluruh viewport; gunakan panel kanan berukuran terbatas dengan backdrop blur/redup.
- Hormati `prefers-reduced-motion`.

## Review Focus

- Filter desktop: kontrol status harus terlihat tanpa bergantung pada kartu statistik atau select mobile, dan pilihan harus memicu request peta.
- Filter `SEMUA`: request peta tidak boleh membawa `status=SEMUA` atau menyisakan filter status sebelumnya.
- Filter dengan hasil kosong: tabel dan peta harus menampilkan state kosong tanpa error atau titik stale.
- Detail pada viewport kecil: panel tetap memiliki margin aman, tombol tutup/`Kembalikan kartu` dan aksi utama tetap bisa dijangkau.
- Reduced motion: membuka detail tidak boleh menghasilkan animasi perpindahan/scale yang bermakna ketika media preference aktif.

---

### Task 1: Status Filter Tabel dan Peta

**Files:**
- Modify: `src/components/tabel/laci-tabel.tsx` — tampilkan kontrol status eksplisit pada toolbar, pertahankan statistik sebagai shortcut.
- Modify: `src/app/(kerja)/ruang-kerja/page.tsx` — pertahankan `mapFilter` sebagai sumber filter tunggal dan reset filter saat sesi baru/diganti bila diperlukan agar tidak membawa filter stale.
- Modify: `src/components/peta/kanvas-peta.tsx` — pastikan perubahan `statusFilter` menghapus layer lama/loading state lalu mengambil data status terbaru; `SEMUA` tidak mengirim parameter status.
- Test: `tests/e2e/ruang-kerja.spec.ts` — focused assertions untuk kontrol filter, request API, dan titik/layer setelah filter berubah.

**Interfaces:**
- Consumes: existing `LaciTabel` prop `onFilter?: (status: string) => void`; existing `KanvasPeta` prop `statusFilter?: string`; existing `GET /api/titik-peta?status=...`.
- Produces: visible control `select[aria-label="Filter status"]` on desktop and mobile; `mapFilter` values exactly matching `STATUS`; map request behavior unchanged for `SEMUA` and explicit for other statuses.

- [ ] **Step 1: Write failing focused E2E assertions**

  Extend the existing authenticated workspace flow in `tests/e2e/ruang-kerja.spec.ts` or add a focused test in `tests/e2e/ruang-kerja-filter.spec.ts`:
  - open a workspace with sample data;
  - assert `select[aria-label="Filter status"]` is visible at desktop width;
  - select `PERLU_KOREKSI_JARAK`;
  - assert table status rows only contain `Perlu koreksi`;
  - observe `/api/titik-peta` request and assert URL contains `status=PERLU_KOREKSI_JARAK`;
  - select `SEMUA` and assert next request has no `status` query parameter;
  - assert no page error.

  Use Playwright request observation, not implementation internals or mocked React state.

- [ ] **Step 2: Run focused test and verify RED**

  Run: `npx playwright test tests/e2e/ruang-kerja-filter.spec.ts --project=chromium` (or the focused test title if kept in the existing spec).

  Expected: FAIL because desktop toolbar has no visible status select and/or map request does not reflect the selection.

- [ ] **Step 3: Implement minimum filter UI and synchronization**

  In `LaciTabel`, render the existing status select outside the mobile-only presentation so it remains visible on desktop. Keep its value bound to `filter`; options must use `SEMUA` plus `LABEL_STATUS` entries. Keep statistic buttons calling the same `setFilter`, so both controls share behavior.

  In `ruang-kerja`, keep passing `mapFilter` to both `LaciTabel.onFilter` and `KanvasPeta.statusFilter`; reset the filter to `SEMUA` when loading a different session or starting a new session only if current UI state would otherwise carry a stale status choice.

  In `KanvasPeta`, keep the current query rule (`status` only for non-`SEMUA`) and ensure the effect clears/replaces displayed points when the dependency changes, preventing old filtered points from remaining while the new request is in flight. Do not alter endpoint shape.

- [ ] **Step 4: Run focused test and verify GREEN**

  Run: `npx playwright test tests/e2e/ruang-kerja-filter.spec.ts --project=chromium` (or focused title).

  Expected: PASS with request assertions for `PERLU_KOREKSI_JARAK` and unfiltered `SEMUA`.

- [ ] **Step 5: Run unit/type checks**

  Run: `npm run typecheck && npm test`.

  Expected: TypeScript clean and all unit tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/tabel/laci-tabel.tsx src/app/(kerja)/ruang-kerja/page.tsx src/components/peta/kanvas-peta.tsx tests/e2e/ruang-kerja-filter.spec.ts tests/e2e/ruang-kerja.spec.ts
  git commit -m "fix: sync workspace status filter with map"
  ```

---

### Task 2: Inspection Detail Overlay

**Files:**
- Modify: `src/components/peta/kartu-inspeksi.tsx` — render backdrop only in detail mode and retain detail toggle/close/action semantics.
- Modify: `src/app/globals.css` — replace fullscreen detail geometry with bounded right panel, backdrop blur/reduction, stacking order, responsive mobile rules, and reduced-motion behavior.
- Modify: `tests/e2e/ruang-kerja.spec.ts` or create `tests/e2e/inspection-card.spec.ts` — focused UI assertions for compact/detail states.

**Interfaces:**
- Consumes: existing `KartuInspeksi` props `{ hasil, onClose, onUpdate }`; existing `detail` local state; existing `framer-motion` `useReducedMotion` behavior.
- Produces: detail-mode DOM marker/class `inspection-card-detail`; backdrop class `inspection-backdrop`; buttons with existing accessible names `Lihat detail`, `Kembalikan kartu`, and `Tutup inspeksi`.

- [ ] **Step 1: Write failing focused UI assertions**

  Add a focused Playwright test using the existing login/workspace setup:
  - open a point inspection;
  - assert `getByRole("button", { name: "Lihat detail", exact: true })` is visible;
  - click it;
  - assert `getByRole("button", { name: "Kembalikan kartu", exact: true })` is visible;
  - assert `.inspection-backdrop` is visible;
  - read bounding boxes for `.inspection-card-detail` and the viewport, asserting panel width is less than viewport width and panel does not start at `x=0` on desktop;
  - assert computed backdrop style contains blur and a non-transparent background;
  - click `Kembalikan kartu`, assert backdrop is hidden and compact card remains;
  - set a mobile viewport and repeat the detail action, asserting panel has positive margins and the primary decision button remains visible.

  Add a reduced-motion context test or `page.emulateMedia({ reducedMotion: "reduce" })`; assert detail transition duration is effectively zero (`transitionDuration`/animation duration), while controls remain functional.

- [ ] **Step 2: Run focused test and verify RED**

  Run: `npx playwright test tests/e2e/inspection-card.spec.ts --project=chromium` (or focused title).

  Expected: FAIL because current `.inspection-card-detail` uses viewport-spanning inset geometry and no `.inspection-backdrop` exists.

- [ ] **Step 3: Implement minimum overlay behavior**

  In `KartuInspeksi`, render a sibling backdrop when `detail` is true. Give it `className="inspection-backdrop"`, `aria-hidden="true"`, and an `onClick` that does not close the card accidentally; close remains explicit through `Tutup inspeksi` or `Kembalikan kartu`. Keep the existing detail button always rendered and preserve all decision controls.

  In `globals.css`, use:
  - `.inspection-backdrop`: absolute inset, translucent dark/green background, `backdrop-filter: blur(...)`, stacking below card but above map;
  - `.inspection-card-detail`: absolute right panel, bounded `width`/`max-width`, safe top/bottom margins, `max-height` with internal scrolling, and z-index above backdrop/map controls as intended;
  - desktop positioning that leaves map context visible;
  - mobile positioning with left/right margins and bottom clearance for the table drawer;
  - reduced-motion rules that disable transitions/animations without hiding the backdrop or controls.

  Keep map controls usable in compact mode; detail overlay may visually dim them, but panel controls must stay above backdrop.

- [ ] **Step 4: Run focused test and verify GREEN**

  Run: `npx playwright test tests/e2e/inspection-card.spec.ts --project=chromium` (or focused title).

  Expected: PASS at desktop/mobile and reduced-motion contexts.

- [ ] **Step 5: Run full verification**

  Run: `npm run typecheck && npm test && npm run build && npm run test:e2e`.

  Expected: typecheck clean, all unit tests pass, production build succeeds, and full Playwright suite passes.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/peta/kartu-inspeksi.tsx src/app/globals.css tests/e2e/inspection-card.spec.ts tests/e2e/ruang-kerja.spec.ts
  git commit -m "fix: keep inspection detail contextual to map"
  ```

---

## Self-review

- Spec coverage: filter visibility/request synchronization is Task 1; bounded overlay, backdrop, responsive layout, reduced motion, and focused UI coverage are Task 2. API/database/env/import remain untouched.
- Interface consistency: `mapFilter` remains a string matching existing status enum values; `KartuInspeksi` props remain unchanged; tests use existing accessible names.
- Review focus coverage: desktop filter and `SEMUA` are Task 1; empty/stale layer behavior is Task 1 implementation check; mobile panel and reduced motion are Task 2 tests.
- Scope: no new abstraction or dependency; existing `LaciTabel`, `KanvasPeta`, `KartuInspeksi`, CSS, and Playwright setup are reused.
