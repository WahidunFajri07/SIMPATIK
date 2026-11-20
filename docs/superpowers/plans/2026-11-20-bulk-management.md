# Bulk Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan bulk select/delete aman untuk master dan sesi, serta pastikan alur workbook pembanding tervalidasi dengan error baris yang jelas.

**Architecture:** Reuse repository transaction patterns and existing `DialogHapus`, `api()`, and page selection state. DELETE endpoints accept JSON arrays while retaining single-query compatibility. Excel behavior stays strict; only diagnostics and focused coverage change.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL/PostGIS, Zod, Framer Motion, Playwright, node:test.

**Spec:** `docs/superpowers/specs/2026-11-20-bulk-management-design.md`

## Global Constraints

- Bulk selection follows the active filter/search result only.
- Bulk deletion uses one database transaction and existing authentication.
- Master deletion removes master points; old match results remain with nullable master relation.
- Session deletion removes session results; master data remains.
- Coordinates remain WGS84 with X `-180..180` and Y `-90..90`.
- Do not auto-correct malformed spreadsheet coordinates or modify/commit `.env` and original `travo.xlsx`.
- No new dependencies.

## Review Focus

- Partial selection with active search must not delete hidden items — covered by UI selection test.
- Empty or duplicate bulk ID lists must return validation error — covered by API test.
- One missing UUID in a bulk request must not partially delete other items — covered by repository/API transaction test.
- Invalid workbook row must identify Excel row and preserve strict rejection — covered by coordinate/parser unit test.
- Valid corrected comparison sheet must reach `/api/cocokkan` — covered by focused API test using valid mapped sample.

---

### Task 1: Bulk repository operations

**Files:**
- Modify: `src/lib/repositori.ts`
- Test: `tests/pencocokan.test.ts` or a focused repository test file if database setup requires it

**Interfaces:**
- Produces `hapusMasterBanyak(ids: string[]): Promise<void>` and `hapusSesiBanyak(ids: string[]): Promise<void>`.
- Existing singular functions remain available and may delegate to bulk functions.

- [ ] **Step 1: Write failing tests**
  - Assert bulk master deletion is all-or-nothing when any requested ID is missing.
  - Assert bulk session deletion removes sessions/results but not master rows.
  - Assert empty IDs are rejected before database work.

- [ ] **Step 2: Run focused tests and verify expected failure**
  - Run `npm test -- tests/pencocokan.test.ts` or the new focused test path.
  - Expected: missing exported bulk functions or failed assertions, not setup errors.

- [ ] **Step 3: Implement minimal transaction methods**
  - Validate non-empty unique UUID input at API boundary; repository assumes validated IDs.
  - Preflight all requested rows inside transaction; throw 404 before deletes if any is missing.
  - For masters, delete related `batch_impor`, then delete selected masters in the same transaction; existing cascade/set-null behavior remains.
  - For sessions, delete related `batch_impor`, then selected sessions; existing cascade removes results.
  - Make singular methods call the bulk method to avoid duplicate deletion semantics.

- [ ] **Step 4: Run focused tests and full unit suite**
  - Run `npm test`.
  - Expected: all unit tests pass.

### Task 2: Bulk DELETE API contracts

**Files:**
- Modify: `src/app/api/master/route.ts`
- Modify: `src/app/api/sesi/route.ts`
- Modify: `src/lib/api.ts` only if shared validation is needed
- Test: `tests/e2e/api.spec.ts`

**Interfaces:**
- `DELETE /api/master` accepts `{ ids: string[] }` and legacy `?id=<uuid>`.
- `DELETE /api/sesi` accepts `{ ids: string[] }` and legacy `?id=<uuid>`.
- Success response remains `{ ok: true }`.

- [ ] **Step 1: Add failing API assertions**
  - Create two masters and delete them with one JSON request; assert both disappear.
  - Create two sessions and delete them with one JSON request; assert both disappear.
  - Assert empty IDs and duplicate IDs return 400.
  - Assert a request containing one random UUID returns 404 and preserves existing requested rows.

- [ ] **Step 2: Run focused API test to verify it fails**
  - Run `npx playwright test tests/e2e/api.spec.ts --grep "bulk" --reporter=list`.
  - Expected: DELETE currently reads query `id` and returns 400 for JSON-only requests.

- [ ] **Step 3: Implement request parsing**
  - Parse JSON with `body(req, z.object({ ids: z.array(uuid).min(1).max(100).superRefine(...) }))` when body exists.
  - Keep query `id` fallback for existing callers.
  - Call repository bulk methods and return `{ ok: true }`.
  - Reject duplicate IDs as 400 to keep selection contract deterministic.

- [ ] **Step 4: Run API tests**
  - Run the focused API test, then `npx playwright test tests/e2e/api.spec.ts --reporter=list`.
  - Expected: focused bulk assertions and existing API regression pass.

### Task 3: Master page selection and bulk confirmation

**Files:**
- Modify: `src/app/(kerja)/gudang-master/page.tsx`
- Modify: `src/components/ui/dialog-aksi.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/e2e/gudang.spec.ts`

**Interfaces:**
- New bulk dialog consumes `jumlah`, `nama`, `akibat`, `catatan`, `onHapus` using existing `Modal`/`Button` conventions.
- Page sends `DELETE /api/master` with `{ ids: selectedVisibleIds }`.

- [ ] **Step 1: Add failing UI test**
  - Upload two uniquely named masters or use two existing visible cards.
  - Search/filter so only one target subset is visible.
  - Click `Pilih semua`, assert selection count matches visible subset.
  - Click `Hapus terpilih`, confirm dialog text, confirm deletion, assert hidden/nonmatching master remains.

- [ ] **Step 2: Run focused UI test and verify failure**
  - Run `npx playwright test tests/e2e/gudang.spec.ts --grep "bulk" --reporter=list`.
  - Expected: no select-all/bulk action exists.

- [ ] **Step 3: Implement minimum UI**
  - Derive `visibleIds` from existing `visible` array.
  - Header checkbox selects/deselects only `visibleIds`; preserve selected IDs not currently visible unless user clears them.
  - Add `Pilih semua` and `Hapus terpilih` controls near existing toolbar/selection bar.
  - Add bulk dialog with total count and master-point consequence.
  - On success remove deleted IDs from selected state, toast, reload list; keep single-item edit/delete behavior.
  - Keep touch accessibility and `aria-label` text.

- [ ] **Step 4: Run focused UI and typecheck**
  - Run focused `gudang.spec.ts` and `npm run typecheck`.
  - Expected: existing single CRUD flow and new bulk flow pass.

### Task 4: History page selection and bulk confirmation

**Files:**
- Modify: `src/app/(kerja)/riwayat/page.tsx`
- Modify: `src/app/globals.css` if shared selection styling needs history layout support
- Test: `tests/e2e/riwayat.spec.ts` (create only if no suitable existing file)

**Interfaces:**
- Page sends `DELETE /api/sesi` with `{ ids: selectedVisibleIds }`.
- Uses same bulk dialog component as master page.

- [ ] **Step 1: Add failing UI test**
  - Create or locate two sessions, filter to a subset, select visible sessions, bulk delete, confirm.
  - Assert selected sessions disappear and master source remains available through `/gudang-master` or API.

- [ ] **Step 2: Run focused UI test to verify failure**
  - Run `npx playwright test tests/e2e/riwayat.spec.ts --grep "bulk" --reporter=list`.
  - Expected: no history bulk controls exist.

- [ ] **Step 3: Implement minimum UI**
  - Add selection state and filter-aware `visibleSessions`.
  - Add header/select-all control and `Hapus terpilih` action.
  - Reuse bulk dialog; state exact impact: results and decisions deleted, master sources safe.
  - Reload after success; close any active session link only through normal navigation (no automatic workspace mutation).

- [ ] **Step 4: Run focused history UI test and typecheck**
  - Expected: history bulk and existing edit/delete behavior pass.

### Task 5: Comparison workbook validation and focused coverage

**Files:**
- Modify: `src/lib/bersihkan-data.ts` only if error formatting needs a stable helper
- Modify: `src/components/modal/petakan-kolom.tsx` only if user-facing row guidance needs improvement
- Test: `tests/pencocokan.test.ts`
- Test fixture: do not commit original `travo.xlsx`; use in-memory rows or a temporary corrected copy outside tracked fixtures

**Interfaces:**
- `petakanBaris()` continues returning `{ titik, errors, ditukar }`.
- Invalid row error includes 1-based spreadsheet row number.

- [ ] **Step 1: Add failing tests**
  - Assert `{ description: ..., longitudex: 108.545097, latitudey: -6697219 }` produces one error containing `Baris 2` for a minimal sample row.
  - Assert corrected `latitudey: -6.697219` produces a point with valid X/Y.
  - Assert valid `data pembanding` rows with empty descriptions remain accepted.

- [ ] **Step 2: Run unit tests to verify failure if behavior is missing**
  - Run `npm test`.
  - Expected: tests fail only if current error text/accepted corrected sample differs; if they pass immediately, retain them as regression tests and document no production change needed.

- [ ] **Step 3: Implement only needed feedback**
  - Preserve strict coordinate rejection.
  - Improve error copy to say the row must be corrected in the source file when useful; do not auto-infer missing decimal places.
  - Ensure mapping defaults recognize `longitudex` and `latitudey` (existing regex already does through `longitude`/`latitude`).

- [ ] **Step 4: Run all required verification**
  - Run `npm test`.
  - Run `npm run typecheck`.
  - Run focused API/UI tests only; do not run unrelated full browser suite unless a changed shared path requires it.
  - Report original `travo.xlsx` remains invalid at `data pembanding!C429`; corrected copy passes mapping/cocokkan path.

### Task 6: Final verification and review

**Files:**
- No new product files.

- [ ] **Step 1: Run verification commands**
  - `npm run typecheck`
  - `npm test`
  - `npx playwright test tests/e2e/api.spec.ts tests/e2e/gudang.spec.ts tests/e2e/riwayat.spec.ts --reporter=list`

- [ ] **Step 2: Inspect diff**
  - Confirm no `.env`, original `travo.xlsx`, generated test artifacts, or unrelated files changed.
  - Confirm single-delete compatibility remains.

- [ ] **Step 3: Report results**
  - State exact test counts and any skipped checks.
  - State data-loss behavior plainly before handoff.
