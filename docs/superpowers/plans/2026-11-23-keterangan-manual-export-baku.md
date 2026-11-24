# Keterangan Manual dan Export Baku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah keterangan manual per titik dan hasilkan XLSX/CSV mentor dengan format baku 8 kolom + data final + ringkasan audit.

**Architecture:** Tambahkan field nullable pada Prisma dan fallback JSON, lalu gunakan helper repositori yang sama untuk update catatan saja maupun keputusan + catatan. UI kartu dan tabel memanggil endpoint yang sama. Export memproses hasil terfilter sekali, membentuk representasi baku untuk CSV/Sheet 1, final dataset untuk Sheet 2/KML/GeoJSON, dan ringkasan bersih untuk Sheet 3.

**Tech Stack:** Prisma/PostgreSQL, fallback JSON, Next.js route handlers, React, TypeScript, XLSX, PapaParse, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-keterangan-manual-export-baku-design.md`

## Global Constraints

- `catatanManual String? @map("catatan_manual")` nullable dan migrasi additive.
- `PATCH /api/konfirmasi` mengubah catatan tanpa mengubah keputusan.
- `POST /api/konfirmasi` menerima `catatanManual` opsional bersama keputusan.
- `catatanManual: null` atau `""` mengosongkan catatan.
- Sheet pertama harus persis `Hasil Pencocokan` dengan 8 kolom dan urutan tetap.
- CSV memakai 8 kolom Sheet 1 dengan urutan sama.
- Sheet kedua harus `Data Final Siap Pakai` dengan 7 kolom baku.
- Sheet ketiga harus `Ringkasan Audit`; tanggal WIB manusiawi, jumlah angka, persentase dua desimal.
- `isiKeteranganOtomatis` default `false`; hanya true yang memakai label status untuk catatan kosong.
- Sanitizer `aman()` wajib tetap dipakai.
- Tidak mengubah algoritma pencocokan, status/keputusan, `.env`, atau data import.
- Tidak menjalankan full E2E; focused tests + `npx tsc --noEmit`, `npm test`, `npm run build`.

## Review Focus

- Catatan null/string kosong harus benar-benar menghapus nilai pada DB dan JSON fallback, tanpa mengubah keputusan.
- Catatan berisi formula Excel (`=`, `+`, `-`, `@`) harus disanitasi di Sheet 1/2/3/CSV.
- `isiKeteranganOtomatis=false` harus membiarkan kolom kosong; true hanya mengisi catatan kosong.
- Export sesi tanpa hasil harus tetap menghasilkan tiga sheet/CSV valid dan rekap 0 tanpa pembagian nol.
- Persentase kecil harus tetap dua desimal dan tipe numeric, bukan string pembulatan satu desimal.

---

### Task 1: Persistence, Repository, dan API Catatan

**Files:**
- Modify: `prisma/schema.prisma` — nullable `catatanManual` pada `HasilPencocokan`.
- Create: `prisma/migrations/<timestamp>_catatan_manual/migration.sql` — additive nullable column.
- Modify: `src/lib/tipe.ts` — `Hasil.catatanManual: string | null`.
- Modify: `src/lib/penyimpanan.ts` / `src/lib/repositori.ts` — fallback mapping and DB/JSON updates.
- Modify: `src/app/api/konfirmasi/route.ts` — POST optional note, PATCH note-only route.
- Test: `tests/catatan-manual.test.ts` — pure repository/decision behavior where possible.

**Interfaces:**
- Produces `ubahCatatanManual(input: { id: string; sesiId: string; catatanManual: string | null }): Promise<Hasil>`.
- `terapkanKeputusan` retains existing output and `konfirmasi` merges normalized note when supplied.
- POST schema accepts optional `catatanManual: z.string().max(...) .nullable().optional()`.
- PATCH schema requires numeric `id`, UUID `sesiId`, nullable/optional note.

- [ ] **Step 1: Write failing unit tests**

  Add tests proving: note is preserved with decision; null/empty clears note; note-only update does not change `keputusan`, `hasilX`, `hasilY`, or `hasilDeskripsi`; formula-like note remains available to export sanitizer (repository does not strip content).

- [ ] **Step 2: Run unit test and verify RED**

  Run: `npx tsx --test tests/catatan-manual.test.ts`

  Expected: FAIL because `Hasil` has no `catatanManual` and repository update helper/API contract does not exist.

- [ ] **Step 3: Add schema and migration**

  Add `catatanManual String? @map("catatan_manual")` after `hasilDeskripsi` in Prisma. Create additive SQL `ALTER TABLE "hasil_pencocokan" ADD COLUMN "catatan_manual" TEXT;`. Run `npx prisma migrate deploy` or project-approved migration command, then `npx prisma generate`.

- [ ] **Step 4: Update types, JSON fallback, and repository**

  Add nullable field to `Hasil`, ensure `buatPencocok`/fallback-created results initialize it to `null`, and implement `ubahCatatanManual` for Postgres transaction/update and fallback `lokal(..., true)`. Normalize `""` to `null`; trim only surrounding whitespace without deleting meaningful content.

- [ ] **Step 5: Extend API POST and add PATCH**

  Keep existing POST decision validation. Add optional nullable note and merge it into DB/fallback update data without changing decision logic. Add PATCH route handler in same route module with note-only schema and repository call. Return updated `Hasil` for both.

- [ ] **Step 6: Run tests and typecheck**

  Run: `npx tsx --test tests/catatan-manual.test.ts && npx tsc --noEmit`.

  Expected: tests pass and typecheck clean.

---

### Task 2: UI Keterangan Kartu dan Tabel

**Files:**
- Modify: `src/components/peta/kartu-inspeksi.tsx` — textarea/button exact label, PATCH save, state sync.
- Modify: `src/components/tabel/laci-tabel.tsx` — editable `Keterangan` column, PATCH save, optimistic/reloaded row update.
- Modify: `src/app/(kerja)/ruang-kerja/page.tsx` — preserve updated `Hasil` in table/selected card state.
- Modify: `src/app/globals.css` — note field/inline editor styling.
- Test: `tests/e2e/catatan-manual-ui.spec.ts` — focused card/table editing.

**Interfaces:**
- Consumes `Hasil.catatanManual` and PATCH `/api/konfirmasi` from Task 1.
- Produces accessible label exact `Keterangan (Opsional — untuk Export)`, save action, and table column `Keterangan` separate from status badge.

- [ ] **Step 1: Write failing focused UI tests**

  Open a workspace point; assert exact textarea label, fill note, save, reload/select another point and verify persistence; clear note and verify empty value. Open table inline note editor, save a different note, and assert status badge/filter still exists and note appears in row.

- [ ] **Step 2: Run focused test and verify RED**

  Run: `npx playwright test tests/e2e/catatan-manual-ui.spec.ts`

  Expected: FAIL because card has no note field and table has no editable Keterangan column.

- [ ] **Step 3: Implement card editor**

  Add local note state initialized from `h.catatanManual`, textarea label, and explicit save button calling PATCH with `null` for blank. On success call `onUpdate(updated)`; preserve decision controls, busy/error state, and detail overlay behavior.

- [ ] **Step 4: Implement table inline editor**

  Add `Keterangan` column with text display and edit control. Save via PATCH with row `id`/`sesiId`; pass updated row through existing `onSelect`/page update path or local callback without replacing status column/filter behavior. Keep formula text unmodified in UI; sanitizer belongs export boundary.

- [ ] **Step 5: Run focused UI test and typecheck**

  Run: `npx playwright test tests/e2e/catatan-manual-ui.spec.ts && npx tsc --noEmit`.

  Expected: focused UI test passes and typecheck clean.

---

### Task 3: Mentor Export XLSX/CSV and Export Options

**Files:**
- Modify: `src/app/api/konfirmasi/route.ts` — exact three-sheet workbook, CSV 8 columns, auto-fill flag, WIB date, numeric rekap.
- Modify: `src/components/tabel/laci-tabel.tsx` — unchecked auto-fill checkbox and append `isiKeteranganOtomatis` to links.
- Modify: `src/app/(kerja)/riwayat/page.tsx` — same checkbox/link option for quick export.
- Modify: `src/app/globals.css` / `src/app/halaman.css` — export checkbox/menu layout if needed.
- Test: `tests/e2e/export-baku.spec.ts` — focused XLSX/CSV/API/UI assertions.

**Interfaces:**
- Consumes `Hasil.catatanManual`, status filter, and `isiKeteranganOtomatis` query flag.
- Produces exact SheetNames `["Hasil Pencocokan", "Data Final Siap Pakai", "Ringkasan Audit"]`.

- [ ] **Step 1: Write failing focused export tests**

  Request filtered/unfiltered CSV and XLSX. Assert CSV exact 8 headers/order. Assert XLSX exact sheet order and exact headers:
  - Sheet 1 eight columns listed in spec.
  - Sheet 2 seven columns listed in spec.
  - Sheet 3 includes human WIB date and numeric `Jumlah`/`Persentase` fields.
  Assert default empty manual note stays empty; `isiKeteranganOtomatis=true` fills with `LABEL_STATUS`; formula-like manual text is sanitized. Assert first sheet is `Hasil Pencocokan`.

  Assert workspace and riwayat export menu checkbox defaults unchecked and checked links include `isiKeteranganOtomatis=true`.

- [ ] **Step 2: Run focused export test and verify RED**

  Run: `npx playwright test tests/e2e/export-baku.spec.ts`

  Expected: FAIL because existing first sheet is `Ringkasan Audit`, columns are audit-trail columns, date is ISO, and auto-fill flag is unsupported.

- [ ] **Step 3: Implement export data builders**

  Parse `isiKeteranganOtomatis` strictly as `q.get(...) === "true"`. Build `keterangan(h)` as sanitized manual note or, only when enabled and note empty, sanitized `LABEL_STATUS[h.status]`. Build exact Sheet 1 rows and use same array for CSV. Build exact Sheet 2 rows with final coordinates, status matching, decision, source master, note. Build Sheet 3 metadata and status summary with numeric count and numeric percentage (`0..1`) plus `z`/XLSX number format `0.00%`; use `toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " WIB"` for export date.

- [ ] **Step 4: Implement workspace/riwayat checkbox URL sync**

  Add unchecked checkbox `Isi Keterangan kosong dengan Status Sistem` to each export menu. Use local menu state for the option and append `isiKeteranganOtomatis=true` only when checked. Preserve current status filter query and all format links. For quick export history, keep option scoped to opened session menu.

- [ ] **Step 5: Run focused export tests and typecheck**

  Run: `npx playwright test tests/e2e/export-baku.spec.ts && npx tsc --noEmit`.

  Expected: focused tests pass and typecheck clean.

- [ ] **Step 6: Run required final checks**

  Run: `npm test && npm run build`.

  Expected: unit tests pass and production build succeeds. Do not run full E2E.

---

## Self-review

- Schema/API/fallback coverage Task 1; card/table editing Task 2; exact export and checkbox sync Task 3.
- Review focus covers null clearing, formula injection, opt-in status fill, empty sessions, and numeric percentage precision.
- Existing filter status, KML/GeoJSON, effective coordinates, and prior map/UI changes remain in scope and are preserved.
- Migration is additive and nullable; no import or matching code changes.
