# Kanvas Peta dan Export Terfilter

## Intent

Bersihkan kanvas ruang kerja untuk visualisasi koordinat dan beri HUD kecil yang tetap terbaca pada peta standar maupun satelit. Samakan filter status tabel, track peta, dan export. Sediakan quick export dari riwayat tanpa membuka ruang kerja.

## Goals

- Hapus hero/tagline dekoratif dari atas kanvas ruang kerja.
- HUD koordinat kecil mengikuti cursor, fallback ke tengah kamera saat cursor keluar.
- Legenda menjadi kapsul expandable hover/click.
- Marker dan legenda memakai biru/oranye/emerald yang kontras.
- Kontrol floating memakai dark frosted glass pada mode satelit/gelap.
- GET `/api/konfirmasi` menerima filter status opsional untuk semua format.
- Nama file export transparan dan metadata Excel mencatat filter.
- Filter workspace membentuk URL export yang sama dengan filter tabel dan peta.
- Riwayat menyediakan Excel 3-sheet, CSV, KML, GeoJSON dengan pilihan status.

## Constraints

Tidak mengubah API selain parameter `status` pada GET `/api/konfirmasi`; tidak mengubah database, `.env`, algoritma pencocokan, atau data import. Testing fokus hanya fitur baru; tetap jalankan typecheck, unit test, dan build sesuai brief.

## Approach

Gunakan state React yang sudah ada. `KanvasPeta` memiliki state cursor/satellite/legend expansion; `mapFilter` di workspace diteruskan ke tabel, peta, dan URL export. Route export memfilter hasil sekali sebelum membentuk CSV/XLSX/KML/GeoJSON. Riwayat memakai menu kecil per sesi yang membangun URL endpoint yang sama.
