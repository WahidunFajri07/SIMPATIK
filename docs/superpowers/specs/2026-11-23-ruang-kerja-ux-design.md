# Ruang Kerja UX Design

## Intent

Buat status filter di hasil pencocokan mudah ditemukan dan pastikan filter yang dipilih mengendalikan tabel serta layer peta. Buat inspeksi detail tetap kontekstual terhadap peta: kartu ringkas tetap di sisi kanan, sedangkan detail dibuka sebagai panel overlay berukuran terbatas dengan backdrop blur redup.

## Goals

- Filter status eksplisit terlihat di toolbar tabel.
- Satu state filter mengendalikan tabel dan request `/api/titik-peta?status=...`.
- Semua status (`SEMUA`, `AKURAT`, `PERLU_KOREKSI_JARAK`, `KANDIDAT_LOKASI_TERDEKAT`, `TIDAK_DITEMUKAN`) dapat dilacak melalui peta.
- Tombol `Lihat detail` selalu terlihat pada kartu inspeksi.
- Mode detail tidak lagi memakai hampir seluruh viewport.
- Backdrop redup/blur aktif saat detail terbuka.
- Tombol `Kembalikan kartu`, tutup, dan aksi keputusan tetap terlihat serta dapat dipakai.
- Hormati `prefers-reduced-motion`.

## Non-goals

- Tidak mengubah API, database, `.env`, data import, algoritma pencocokan, atau format ekspor.
- Tidak menambah dependency.
- Tidak menambah mode fullscreen baru.

## Approach

Gunakan pendekatan A: pertahankan pemisahan `LaciTabel`, `KanvasPeta`, dan `KartuInspeksi`. Jadikan filter toolbar sebagai sumber state yang sudah diteruskan dari `ruang-kerja` ke tabel dan peta. Ubah mode detail kartu dari inset hampir fullscreen menjadi overlay panel kanan dengan `inspection-backdrop`; panel memiliki lebar maksimum, batas vertikal, scroll internal, dan breakpoint mobile dengan margin aman.

### Visual behavior

```text
Peta tetap terlihat     backdrop blur redup     panel inspeksi kanan
                                               [Lihat detail] [X]
                                               isi + aksi utama
```

## Acceptance

- Memilih `Perlu koreksi` mengubah filter tabel dan request peta ke `status=PERLU_KOREKSI_JARAK`.
- Memilih setiap status lain menghasilkan parameter peta yang sesuai; `SEMUA` tidak mengirim parameter status.
- Detail inspeksi memiliki ukuran lebih kecil dari viewport pada desktop dan mobile.
- Backdrop memiliki blur/redup dan tidak menutup kontrol panel.
- `Kembalikan kartu` mengembalikan kartu ringkas.
- Reduced motion tidak menghasilkan transisi animasi yang bermakna.
- Typecheck, unit test, dan focused E2E lulus.
