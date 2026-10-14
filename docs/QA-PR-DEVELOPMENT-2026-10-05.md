# QA PR ke development — 5 Oktober 2026

## Konteks dan batas

Sumber: `feat/pencairan-pocketbase-local`, target: GitHub `origin/development` (`a45a907f46d367f5b2ce640910b72de60c8d5120` saat pemeriksaan). Pengguna mengizinkan PR, tes, check, build, serta QA Playwright. `development` dipakai untuk dummy. Branch, deployment, konfigurasi, database, dan layanan production tidak boleh diubah tanpa instruksi eksplisit pengguna.

Belum dilakukan merge atau deployment. Pemeriksaan berjalan pada branch sumber dan build dummy lokal. Simulasi `git merge-tree --write-tree origin/development HEAD` sebelum perbaikan tidak menghasilkan konflik dan menghasilkan tree yang sama dengan HEAD; pemeriksaan ini diulang pada commit akhir sebelum publikasi PR. Kesamaan tree berarti kode hasil merge sama dengan kode sumber yang diuji, bukan bukti deployment development sudah berjalan.

## Bug yang ditemukan dan diperbaiki

Playwright menemukan `RangeError: Invalid time value` saat admin membuka pencairan ITB (`campus-015`). Seed dummy yang sudah dibayar menandai dokumen asli/pindaian diterima tetapi tanggal penerimaannya kosong. Pemformatan tanggal langsung menyebabkan halaman berhenti di “Memuat…”.

Seluruh pemformatan tanggal pada `TandaTanganView.svelte` kini menggunakan helper yang memeriksa validitas tanggal. Metadata kosong/tidak valid ditampilkan sebagai “Tanggal belum tercatat”, tanpa mengubah status penerimaan atau menciptakan tanggal historis. Skrip `scripts/qa/dummy-receipt-dates.playwright.js` gagal pada build lama dan lulus pada build baru, termasuk reload. Jalankan lewat tool Playwright pada browser lokal dummy dengan seed ITB awal dan sesi Admin PF.

## Hasil terminal setelah perbaikan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | 60 lulus, 0 gagal |
| `npm run check` | 0 error, 0 warning |
| `npm run build` | Berhasil; adapter-static menulis `build/` |

Build memberi peringatan ukuran chunk melebihi 500 kB; bukan kegagalan build. Percobaan awal test/check terhalang sandbox `spawn EPERM`, lalu dijalankan ulang dengan eksekusi yang diizinkan dan berhasil. Lingkungan pemeriksaan menggunakan Node 25.5; `package.json` meminta Node 22.x, sehingga hasil ini bukan verifikasi terpisah pada Node 22.

Log lokal: `.playwright-mcp/pr-development-{test,check,build}-fixed-20261005.log` (diabaikan Git).

## QA browser pada hasil build

Server file statis `node tests/demo-server.mjs`, alamat `http://127.0.0.1:4178`. QA memakai tool Playwright, bukan runner Playwright terminal.

- Login/logout dummy Admin PF, Mentor Kupang, dan Mentor ITB berhasil.
- Sebelas halaman navigasi admin terbuka. Empat halaman dengan data asinkron diperiksa ulang sampai judul dan isi muncul. Tidak ditemukan error JavaScript/HTTP pada pemeriksaan tersebut.
- Detail pencairan seluruh 40 kampus pada daftar dummy terbuka hingga nama kampus dan kontrol Riwayat muncul, tanpa error JavaScript/HTTP.
- Panel Tanda tangan, Lampiran, dan Pembayaran ITB terbuka pada lebar 1440 dan 390 px; tidak ada overflow horizontal halaman atau error JavaScript/HTTP yang tertangkap. Metadata tanggal kosong tetap tampil setelah reload.
- Kupang: unggah `static/contoh-rab/01_RAB_10_Unit.xlsx` berhasil; empat item terbaca. Pecahan jumlah unit dan alokasi di atas 70% ditolak. Alokasi Rp6 juta lalu Rp7 juta tersimpan; navigasi kembali, batal meninggalkan perubahan, dan reload mempertahankan draf. Termin 2 menampilkan sisa. Lebar 390 px tidak membuat halaman melebar.
- Pemeriksaan RAB menggunakan langkah pada `scripts/qa/rab-campus-navigation.playwright.js`, dengan alamat diganti ke port 4178 dan masuk Termin 1 melalui tombol Lanjut dari layar RAB 100%. Deep-link lama pada skrip dinormalisasi aplikasi kembali ke langkah RAB 100%.
- Form Data Program Kupang yang belum memiliki kabupaten/kota mencegah navigasi lanjut dan menampilkan validasi. Ini perilaku validasi yang diharapkan, bukan crash.
- Kampus ITB menampilkan pembayaran Tahap 1 selesai; navigasi Data Program, Administrasi, dan PKS pada pengajuan terkunci dapat dibuka tanpa alert. PKS diperiksa juga pada lebar 390 px.
- Mutasi QA hanya terjadi pada data dummy browser lokal. Tidak ada perubahan layanan production.

Screenshot lokal: `.playwright-mcp/pr-development-Tanda-tangan-{1440,390}.png`, `pr-development-Lampiran-{1440,390}.png`, `pr-development-Pembayaran-{1440,390}.png`, `pr-development-campus-rab-term2.png`, dan `pr-development-campus-paid-mobile.png`.

## Batas kesimpulan

Tidak ditemukan blocker pada cakupan di atas setelah fix. Ini tidak menjamin semua kemungkinan alur bebas bug. Seluruh transaksi end-to-end, backend PocketBase/Cloudflare, login nyata, pengiriman email, dan hosting development setelah deployment tidak diverifikasi dalam QA ini. Panel Lampiran diperiksa tampilannya, bukan seluruh proses pembuatan/unduh lampiran. Production tidak diuji maupun diubah.
