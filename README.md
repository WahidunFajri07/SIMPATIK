# SIMPATIK

Gunakan Node.js 24 dan PostgreSQL dengan ekstensi PostGIS. Konfigurasi pribadi ada di `.env` dan diabaikan Git; `.env.example` hanya berisi contoh.

1. Salin `.env.example` ke `.env` jika belum ada. Isi `DATABASE_URL` dengan koneksi PostgreSQL Anda. Database tujuan harus sudah dibuat, dan PostGIS harus terpasang di server.
2. Jalankan `npm run env:admin`, lalu masukkan email dan kata sandi admin. Input kata sandi tersembunyi. Skrip menyimpan `ADMIN_PASSWORD_HASH` memakai scrypt dan membuat `SESSION_SECRET` acak bila belum tersedia.
3. Jalankan `npm run db:generate`, `npm run db:migrate`, dan `npm run db:check` untuk menyiapkan serta memeriksa tabel aplikasi.
4. Jalankan `npm run dev`. Mulai ulang server setelah mengubah konfigurasi atau kata sandi admin.

Di PowerShell yang menolak `npm.ps1`, gunakan `npm.cmd` sebagai pengganti `npm`.

Jika `.env` lama berisi `ADMIN_PASSWORD`, jalankan `npm run env:amankan`. Skrip menggantinya dengan hash dan menghapus nilai polos. Login admin sekarang membutuhkan `ADMIN_EMAIL` dan `ADMIN_PASSWORD_HASH`; password polos tidak diterima. Akun pengguna di database juga disimpan sebagai hash, dan hash dari versi sebelumnya tetap dapat digunakan.

Password dalam `DATABASE_URL` dibutuhkan driver untuk autentikasi ke PostgreSQL sehingga tidak dapat diganti dengan hash aplikasi. URL-encode karakter khusus pada username/password database, batasi akses file `.env`, dan gunakan TLS ketika menghubungkan database melalui jaringan. Hash password tidak menjamin aplikasi kebal terhadap serangan.

`npm test` menguji password, konfigurasi admin, dan pencocokan data. Untuk pengujian browser, jalankan server dengan akun uji tersendiri lalu sediakan kata sandinya melalui variabel proses `E2E_ADMIN_PASSWORD` sebelum menjalankan `npm run test:e2e`. Jangan simpan password pengujian di `.env` aplikasi.
