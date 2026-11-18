# SIMPATIK

Aplikasi pencocokan dan pemetaan koordinat berdasarkan `SIMPATIK.txt`. Next.js App Router, TypeScript, Tailwind, komponen Radix bergaya shadcn, Framer Motion, MapLibre, Deck.gl, TanStack Table/Virtual, dan Prisma + PostGIS.

## Menjalankan secara lokal

Butuh Node.js 22.12+ atau 24 dan npm yang berfungsi. Pada PowerShell, gunakan `npm.cmd` bila eksekusi `npm.ps1` dibatasi.

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run data:contoh
npm.cmd run dev
```

Buka **http://127.0.0.1:3000**, lalu pilih **Buka ruang demo**. Tanpa `DATABASE_URL`, aplikasi menggunakan data simulasi Bandung: 3 sumber master dan 100 titik tinjauan. Impor dan keputusan disimpan di `data/simpatik.json`, bukan hanya state browser. Berkas tersebut tidak masuk Git.

Mode demo adalah penyimpanan satu proses untuk pengembangan. Gunakan PostGIS untuk data besar dan beberapa proses server. Font dan parser dibundel lokal; peta jalan OpenStreetMap dan citra Esri memerlukan internet. Saat tile tidak tersedia, layer koordinat dan tabel tetap dapat digunakan. Peta tidak membutuhkan API key. Tile raster dapat dikonfigurasi melalui `NEXT_PUBLIC_MAP_TILE_URL`. Untuk penggunaan organisasi berskala besar, gunakan penyedia tile atau hosting sendiri yang sesuai kebutuhan; tile komunitas mengikuti [kebijakan OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Menggunakan PostgreSQL + PostGIS

1. Siapkan database PostgreSQL terpisah dengan paket ekstensi PostGIS terpasang. Migrasi mengaktifkan `CREATE EXTENSION IF NOT EXISTS postgis`; akun migrasi harus punya izin untuk itu.
2. Salin `.env.example` menjadi `.env`, lalu isi:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/simpatik?schema=public"
SESSION_SECRET="isi-dengan-minimal-32-karakter-acak"
ADMIN_EMAIL="operator@perusahaan.com"
ADMIN_PASSWORD="isi-kata-sandi-yang-kuat"
```

3. Terapkan migrasi dan, bila diperlukan, isi master simulasi:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

`db:seed` hanya menambahkan tiga master dengan ID tetap, tanpa menimpa master yang sudah ada. Data demo JSON tidak disalin otomatis ke database. Jangan memakai `prisma db push` sebagai pengganti migrasi: trigger geometri dan indeks GIST berada dalam SQL migrasi.

Tidak ada koneksi diam-diam ke database PostgreSQL yang sudah ada. Jika `DATABASE_URL` diisi tetapi koneksi gagal, API menampilkan kegagalan; aplikasi tidak beralih diam-diam ke demo.

## Alur kerja

- **Gudang Master:** unggah CSV, XLS, atau XLSX, pilih sheet dan petakan deskripsi/X/Y. Kartu mendukung pemilihan beberapa sumber.
- **Sesi baru:** unggah data tinjauan, pilih sumber dan toleransi meter. Deskripsi B dapat kosong, termasuk file yang hanya berisi X/Y.
- **Pencocokan:** kode dinormalisasi ke huruf kapital tanpa simbol/spasi; sufiks tetap dibedakan. Di antara kode sama, pilih master dengan jarak terdekat. Kode kosong/tidak cocok memakai pencarian spasial dalam 100 meter dan selalu berstatus kandidat.
- **Inspeksi:** klik baris tabel atau titik tinjauan. Kamera berpindah ke pasangan A/B dan Deck.gl menampilkan ArcLayer serta jarak. Konfirmasikan titik B, gunakan koordinat master/baru, atau terima deskripsi master.
- **Ekspor:** Excel/CSV menyertakan koordinat sumber A/B asli, sumber master, status, jarak, keputusan, dan kolom hasil terpisah. Teks formula spreadsheet dinetralkan saat ekspor.
- **Riwayat:** sesi dan jumlah keputusan tersimpan dapat dibuka lagi.

Parser berjalan di Web Worker. Batas per berkas 50 MB, per sheet/sesi 100.000 baris dan per sheet 200 kolom. Impor dikirim berurutan dalam batch 2.500; progress ditampilkan. Kunci idempotensi mencegah duplikasi saat respons hilang. Jika batch gagal, klik proses kembali dalam dialog yang sama untuk melanjutkan. Jika dialog ditutup, batch sebelumnya tetap tersimpan; periksa Gudang/Riwayat sebelum memulai ulang.

Semua koordinat harus WGS84/EPSG:4326 dalam derajat desimal. Koma desimal diterima; X/Y ditukar otomatis hanya jika pola cocok rentang Indonesia. Koordinat kosong/tidak valid menolak impor sebelum batch pertama; baris bermasalah ditampilkan. UTM tidak dikonversi otomatis.

## Skala dan penyimpanan

PostGIS memakai indeks kode, `ST_DistanceSphere`, `LATERAL` KNN dengan indeks geography dan `ST_DWithin(...,100,false)`, serta filter viewport `ST_MakeEnvelope` dengan GIST. Trigger mengisi geometry saat insert/update. Nilai ID BigInt dikirim sebagai string agar presisi terjaga.

Endpoint peta hanya mengambil titik dalam BBOX, dibatasi 8.000 per layer dengan pemberitahuan jika terpotong. Tabel memuat hasil melalui halaman API 2.500 baris dan hanya merender baris sekitar viewport. Laci dapat ditarik atau diubah melalui tombol/keyboard ke 12%, 45%, atau 85%.

Login menggunakan satu akun operator yang dikonfigurasi melalui environment, cookie HttpOnly SameSite, token HMAC berumur 12 jam, pemeriksaan origin dan pembatasan percobaan login. Tidak mencakup registrasi, SSO, pemisahan tenant, atau manajemen peran. Mode produksi menonaktifkan tombol demo dan mewajibkan secret sesi; jalankan melalui HTTPS agar cookie Secure bekerja.

## Verifikasi

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
```

Uji browser memerlukan server dev di port 3000 dan Google Chrome terpasang; konfigurasi berada di `playwright.config.ts`. Jalankan pada data demo, karena tes menambahkan master, sesi dan keputusan. Screenshot QA disimpan di `test-results/`. Uji mencakup impor multi-sheet, batch/resume, X/Y tertukar, kode dan KNN, konfirmasi, ekspor Excel/CSV, batas BBOX, autentikasi, dan viewport seluler. Uji unit mencakup indeks lokal 50.000 titik; target 60 FPS belum dibenchmark pada perangkat pengguna. Pengujian PostGIS langsung memerlukan `DATABASE_URL` dan ekstensi yang tersedia.

Build produksi:

```powershell
npm.cmd run build
npm.cmd start
```

## Catatan lingkungan implementasi

npm sistem pada mesin implementasi gagal dengan `Class extends value undefined`. Dependensi berhasil dipasang menggunakan npm 10.9.4 lokal di `.cache/tools/package/bin/npm-cli.js`. Jika mesin yang sama masih mengalami masalah registry, jalankan `node .cache/tools/package/bin/npm-cli.js ci`; `.cache` adalah alat lokal sementara, bukan dependensi proyek. `npm.cmd run ...` tetap berfungsi.

Rujukan implementasi: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [PostGIS KNN](https://postgis.net/docs/geometry_distance_knn.html), [ST_DWithin](https://postgis.net/docs/ST_DWithin.html). Lisensi parser tersedia di `public/vendor/`.
