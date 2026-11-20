# Inspection Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat kartu inspeksi ruang kerja ringkas, detail fullscreen, dan tidak menutupi kontrol map.

**Architecture:** Keep state local to `KartuInspeksi`; render one card with `compact` and `detail` classes. The parent continues mounting it only when a table/map result is selected. CSS owns responsive placement and layering; Framer Motion owns opacity/transform transitions.

**Tech Stack:** React 19, TypeScript, Next.js App Router, Framer Motion, Lucide, Playwright, existing CSS.

**Spec:** `docs/superpowers/specs/2026-11-20-inspection-card-design.md`

## Global Constraints

- `Lihat detail` is always visible in compact mode.
- `Kembalikan kartu` is always visible in detail mode.
- `map-controls` z-index remains above inspection cards.
- Existing confirmation actions and API payloads stay unchanged.
- No new dependency.
- Reduced motion removes travel while keeping content visible.

## Review Focus

- Detail opened from compact card must return without losing selected result — covered by focused UI test.
- Mobile card must retain close/detail controls — covered by responsive locator test.
- Map mode/layer controls must remain clickable with compact card open — covered by focused UI test where feasible; otherwise CSS assertion plus manual check.
- Existing action buttons must remain present after layout change — covered by existing workspace test or focused test.
- Reduced-motion users must still see card content — covered by CSS rule and type/UI regression review.

---

### Task 1: Inspection card states

**Files:**
- Modify: `src/components/peta/kartu-inspeksi.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/e2e/ruang-kerja.spec.ts` or create focused test if no suitable file exists

**Interfaces:**
- Existing props remain `{ hasil: Hasil; onClose: () => void; onUpdate: (h: Hasil) => void }`.
- New visible controls: `Lihat detail`, `Kembalikan kartu`, existing `Tutup inspeksi`.
- Existing action labels and confirmation handlers remain unchanged.

- [ ] **Step 1: Write failing UI test**
  - Open a workspace session with at least one result.
  - Select a result row.
  - Assert compact card shows `Lihat detail`, `Pakai koordinat master`, and `Konfirmasi titik B valid`.
  - Click `Lihat detail`; assert `Kembalikan kartu` is visible.
  - Click `Kembalikan kartu`; assert `Lihat detail` returns.
  - Assert `Tutup inspeksi` remains available.

- [ ] **Step 2: Run focused test and verify failure**
  - Run `npx playwright test tests/e2e/ruang-kerja.spec.ts --grep "detail inspeksi" --reporter=list`.
  - Expected: fails because `Lihat detail` and `Kembalikan kartu` do not exist.

- [ ] **Step 3: Implement minimal state and controls**
  - Add `detail` boolean state, reset it when `h.id` changes.
  - Add explicit header button with text `Lihat detail` and `Maximize2` icon in compact mode.
  - In detail mode change card class to `inspection-card detail` and show `Kembalikan kartu` with `Minimize2` icon.
  - Keep close button with existing aria label.
  - Do not duplicate confirmation logic; keep existing buttons and `confirm()`.
  - Use `motion.aside` variants based on detail state; animate opacity/transform only.

- [ ] **Step 4: Update CSS layout and layering**
  - Compact card sits below map controls and has bounded height.
  - Detail card uses a bounded overlay panel with backdrop-like surface, but map controls retain higher z-index.
  - Ensure action area remains reachable through scrolling.
  - Add `@media (prefers-reduced-motion: reduce)` behavior that removes transform travel.
  - At mobile width, card becomes inset bottom sheet with visible header controls.
  - Remove duplicate `.map-controls` z-index declaration; retain one value above inspection card.

- [ ] **Step 5: Run verification**
  - Run focused Playwright test.
  - Run `npm run typecheck`.
  - Expected: focused interaction passes and no TypeScript errors.

### Task 2: Final regression

**Files:**
- No additional product files unless Task 1 exposes a regression.

- [ ] **Step 1: Run focused workspace regression**
  - Run the focused test plus existing workspace/visual tests that do not mutate shared data destructively.
  - Expected: existing selection, map, and confirmation UI remain green.

- [ ] **Step 2: Inspect diff**
  - Confirm no API, database, `.env`, or workbook changes.
  - Confirm detail labels are visible text, not icon-only affordances.

- [ ] **Step 3: Run final checks**
  - `npm run typecheck`
  - `npm test`
  - Report any browser test blocked by shared DB isolation instead of claiming pass.
