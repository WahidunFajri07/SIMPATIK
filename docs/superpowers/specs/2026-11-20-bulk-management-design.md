# Bulk Management Design

## Intent
Admin perlu mengelola banyak sumber master dan riwayat tanpa menghapus satu per satu. Alur impor data pembanding juga harus memberi error baris yang tepat dan tetap menolak koordinat yang memang rusak.

## Goals
- Pilih semua item yang sedang terlihat setelah filter/pencarian.
- Hapus master terpilih dalam satu transaksi.
- Hapus sesi terpilih dalam satu transaksi.
- Pertahankan dampak data saat ini: master menghapus titik master dan membuat pasangan lama menjadi `NULL`; sesi menghapus hasil sesi dan mempertahankan master.
- Pastikan `travo.xlsx` dapat dipakai setelah nilai `data pembanding!C429` diperbaiki menjadi `-6.697219`.
- Tambahkan tes minimum untuk bulk API, koordinat invalid, dan satu alur UI penting.

## Non-goals
- Tombol `hapus semua` tanpa selection.
- Pemulihan data atau soft delete.
- Menebak atau memperbaiki nilai Excel yang rusak secara otomatis.
- CRUD per titik koordinat.
- Mengubah sumber data master ketika riwayat dihapus.

## Constraints
- Otorisasi existing `endpoint()` tetap digunakan.
- Bulk delete menerima UUID valid dan memakai transaction database.
- `Pilih semua` hanya memilih hasil filter aktif, bukan item yang tidak terlihat.
- Validasi koordinat tetap WGS84: X `-180..180`, Y `-90..90`.
- Tidak menambah dependency.
- `.env` dan file asli `travo.xlsx` tidak diubah atau di-commit.

## Approaches
1. Hapus satu per satu dari UI: aman tetapi lambat dan meminta terlalu banyak klik.
2. Endpoint bulk tanpa konfirmasi per jumlah: cepat tetapi terlalu berisiko.
3. **Dipilih:** checkbox individual + pilih semua hasil filter + satu dialog konfirmasi bulk + satu transaction backend. Ini memenuhi kebutuhan admin tanpa tombol penghapusan massal yang tidak terarah.

## Design
- `DELETE /api/master` dan `DELETE /api/sesi` menerima JSON `{ ids: string[] }`; query `?id=` tunggal tetap dipertahankan untuk kompatibilitas.
- Repository menyediakan `hapusMasterBanyak(ids)` dan `hapusSesiBanyak(ids)`, validasi item hilang sebagai 404, lalu menjalankan operasi terkait dalam satu transaction.
- UI gudang dan riwayat memiliki selection state, checkbox header, tombol `Pilih semua`, dan `Hapus terpilih`.
- Dialog bulk merangkum jumlah item dan dampak destruktif.
- Importer menampilkan baris invalid seperti `Baris 429`, tetap menolak nilai `-6697219`; workbook yang valid setelah koreksi dipakai untuk focused browser check.

## Success criteria
- Bulk delete tidak menghapus item di luar filter.
- Bulk master/session delete menghapus relasi sesuai semantics existing.
- `travo.xlsx` versi valid berhasil dipetakan sebagai master dan pembanding.
- Typecheck, unit tests, focused API/UI tests lulus.
