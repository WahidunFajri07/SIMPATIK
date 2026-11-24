# Keterangan Manual dan Export Baku

## Intent

Simpan keterangan manual per titik tanpa mengubah keputusan pencocokan. Keterangan dapat diedit kapan saja sebelum export, tersedia pada kartu inspeksi dan tabel, lalu masuk ke format export baku yang stabil untuk kebutuhan mentor/staf.

## Goals

- Tambah `catatanManual String? @map("catatan_manual")` pada `HasilPencocokan`.
- Pertahankan fallback JSON agar mode tanpa DB tetap kompatibel.
- Sediakan `PATCH /api/konfirmasi` untuk mengubah hanya catatan manual.
- Izinkan `POST /api/konfirmasi` menyimpan catatan bersamaan dengan keputusan.
- Izinkan catatan dikosongkan dengan nilai `null` atau string kosong.
- Tampilkan editor catatan pada kartu inspeksi dan edit inline pada tabel.
- Export XLSX/CSV memakai format mentor yang deterministik.
- Opsi `isiKeteranganOtomatis` default `false`; hanya saat `true` catatan kosong diisi label status sistem.
- Pertahankan filter status export yang sudah ada.

## Approach

Gunakan endpoint terpisah untuk edit catatan (`PATCH`) dan perluas payload keputusan existing dengan `catatanManual` opsional. Tambahkan helper repositori yang mengubah hanya field catatan pada DB maupun fallback JSON. UI memakai helper client yang sama; update berhasil mengembalikan `Hasil` terbaru agar tabel, kartu, dan export langsung konsisten.

Export membentuk tiga representasi dari hasil terfilter yang sama:

1. `Hasil Pencocokan`: tepat 8 kolom baku dan menjadi sheet pertama.
2. `Data Final Siap Pakai`: 7 kolom final plus konteks status/keputusan/sumber/catatan.
3. `Ringkasan Audit`: metadata serta rekap status dengan `Kategori`, `Jumlah`, `Persentase`.

CSV memakai delapan kolom Sheet 1. KML/GeoJSON tetap memakai data final dan filter status existing.

## API contract

`POST /api/konfirmasi` existing decision payload menerima:

```json
{
  "id": "123",
  "sesiId": "uuid",
  "keputusan": "TERKONFIRMASI_VALID",
  "catatanManual": "Catatan opsional"
}
```

`PATCH /api/konfirmasi` menerima:

```json
{
  "id": "123",
  "sesiId": "uuid",
  "catatanManual": "Catatan baru"
}
```

`catatanManual: null` atau `""` disimpan sebagai null/kosong konsisten pada kedua backend.

GET export menerima `isiKeteranganOtomatis=true|false`, default `false`. Filter status existing tetap berlaku.

## Export contract

Sheet 1/CSV column order, exact:

```text
Deskripsi A | Koordinat A X | Koordinat A Y | Keterangan | Jarak (m) | Deskripsi B | Koordinat B X | Koordinat B Y
```

Sheet 2 exact:

```text
Deskripsi Final | Koordinat X Final | Koordinat Y Final | Status Pencocokan | Keputusan | Sumber Master | Keterangan
```

Sheet 3 contains metadata and status summary. Summary count is numeric and percentages use two decimal places. Export date uses Indonesian WIB display format, e.g. `23 Nov 2026, 13:43 WIB`.

## UI contract

- Card label exact: `Keterangan (Opsional — untuk Export)`.
- Save button performs explicit PATCH and preserves decision.
- Table adds editable `Keterangan` column while status badge/filter remains separate.
- Export menus in workspace/history add unchecked checkbox `Isi Keterangan kosong dengan Status Sistem`.
- Export URL includes `isiKeteranganOtomatis=true` only when checked.

## Non-goals and constraints

- No change to matching algorithm, status values, decisions, coordinates, database relations, `.env`, or import files.
- No removal of existing KML/GeoJSON support.
- Existing Excel sanitizer `aman()` remains mandatory for user-controlled text.
- Migration must be additive and nullable; existing rows remain valid.

## Verification

Focused tests cover PATCH persistence/clear, decision plus note, fallback JSON mapping, exact XLSX sheet order/headers/types, CSV headers, auto-fill opt-in, UI card/table editing, and export checkbox URL behavior. Required checks: `npx tsc --noEmit`, `npm test`, `npm run build`. Full E2E is not required unless a focused test needs the shared workspace setup.
