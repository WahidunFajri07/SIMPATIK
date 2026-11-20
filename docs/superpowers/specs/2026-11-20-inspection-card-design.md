# Inspection Card Design

## Intent
Kartu inspeksi titik harus memberi akses cepat ke keputusan utama tanpa menutup kontrol map. Informasi lengkap tetap tersedia melalui tombol yang jelas dan selalu terlihat.

## Goals
- Kartu ringkas tidak menutupi kontrol map.
- Tombol `Lihat detail` selalu terlihat, bukan hanya icon hover.
- Detail dapat dibuka dalam mode fullscreen.
- Tombol `Kembalikan kartu` dan `Tutup inspeksi` selalu tersedia.
- Tombol utama tetap mudah ditemukan: `Pakai koordinat master` dan `Konfirmasi titik B valid`.
- Animasi memakai transform/opacity dan menghormati reduced motion.
- Mobile memakai panel lebar/bottom-sheet yang tetap dapat ditutup.

## Non-goals
- Tidak mengubah API pencocokan atau konfirmasi.
- Tidak memindahkan tabel hasil menjadi fullscreen.
- Tidak menambah dependency.
- Tidak menyembunyikan kontrol map ketika detail terbuka.

## Chosen approach
Mode ringkas dan fullscreen pada komponen `KartuInspeksi`, dengan state lokal `detail`. Kartu ringkas berada pada area kanan di bawah kontrol map; mode detail memakai overlay panel di atas map dengan backdrop, tombol `Kembalikan kartu`, dan tombol tutup. `map-controls` tetap memiliki z-index lebih tinggi daripada kartu.

## Interaction
```text
Pilih baris → kartu ringkas muncul
Lihat detail → panel detail fullscreen
Kembalikan kartu → kembali ke kartu ringkas
Tutup inspeksi → kartu hilang dan titik tetap dapat dipilih ulang
```

## Success criteria
- `getByRole("button", { name: "Lihat detail" })` selalu terlihat pada kartu ringkas.
- Detail menampilkan tombol `Kembalikan kartu`.
- Kontrol `Ubah kemiringan peta` dan `Ubah peta dasar` tetap clickable saat kartu ringkas/detail terbuka.
- Existing confirmation actions tetap bekerja.
- Typecheck dan focused Playwright test lulus.
