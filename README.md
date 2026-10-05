# Digitalisasi DEB — demo mandiri

Mode bawaan branch `feat/pencairan-pocketbase-local` yang diajukan ke `development` menggunakan data simulasi di **IndexedDB browser**. Build dummy berjalan sebagai situs statis tanpa PocketBase, API aplikasi, login nyata, atau layanan email.

**Batas branch — 5 Oktober 2026:** sesuai arahan pengguna, `development` dipakai untuk dummy; koneksi layanan aktif berada pada `production`. Jangan mengubah branch, deployment, konfigurasi, database, atau layanan production sebelum pengguna menyuruh secara eksplisit. Izin PR/push/QA ke `development` tidak mencakup production. Panduan demo historis di bawah tidak menjelaskan kondisi deployment production saat ini.

## Panduan Codex

### Pengajuan PocketBase lokal - 30 September 2026

Branch `feat/rab-dummy-all-campuses` juga menyediakan mode backend lokal melalui `npm run dev:local` (aplikasi 5176, PocketBase 8097). Mode dummy tetap tersedia. Mulai dari [panduan migrasi lokal](docs/pencairan-deb/MIGRASI-POCKETBASE-LOKAL.md), [runbook](docs/pencairan-deb/RUNBOOK-PENGAJUAN-LOKAL.md), dan [hasil QA](docs/pencairan-deb/QA-MIGRASI-POCKETBASE-LOKAL-2026-09-30.md). Implementasi ini belum di-push atau diterapkan ke produksi; uraian demo di bawah berlaku untuk mode dummy.

Mulai setiap chat dengan membaca [AGENTS.md](AGENTS.md), [panduan proyek](docs/PANDUAN-CODEX.md), dan seluruh dokumentasi `docs/`. Jangan push atau membuat PR/MR sebelum diminta. Tes melalui terminal ditunda; QA menggunakan tool browser Playwright.

## Menjalankan

Gunakan Node.js 22.x.

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan Vite, pilih akun kampus atau administrator, lalu **Buka ruang kerja**. Tidak memerlukan `.env` atau menjalankan PocketBase.

Data awal mencakup 40 kampus, 30 indikator, proposal PDF contoh, pengajuan, forum, dan notifikasi. Nama institusi digunakan sebagai contoh; angka dan dokumen adalah simulasi.

Isian indikator, periode, versi PDF, tanggapan admin, forum, dan perubahan lainnya bertahan setelah reload pada browser dan origin yang sama. Ganti akun melalui sidebar untuk mencoba alur kampus/admin dengan data yang sama. **Reset data demo** mengembalikan contoh awal setelah konfirmasi.

Halaman admin Akun kampus menampilkan dua PIC per kampus, masing-masing dengan nama dan email yang dapat diedit. Login demo menampilkan dua identitas Universitas Pertamina: Mentor dan SoBI. Penyimpanan versi lama ditingkatkan otomatis dengan mempertahankan PIC pertama dan seluruh data kampus.

Data tidak tersinkron antarperangkat atau pengunjung. Menghapus penyimpanan situs juga menghapus perubahan demo. Pemilih peran bukan autentikasi; jangan gunakan demo untuk data pribadi atau dokumen operasional.

## Build dan pengujian

**Untuk Codex:** perintah di bawah hanya referensi. Sesuai [AGENTS.md](AGENTS.md), jangan menjalankan tes/pemeriksaan terminal sebelum pengguna meminta; lakukan QA melalui tool browser Playwright. Jangan memakai Playwright CLI sebagai pengganti tool browser.

```sh
npm run check
npm test
npm run format:check
npm run build
npm run test:e2e
```

Jalankan perintah pemeriksaan dan build berurutan; jangan menjalankan `svelte-kit sync`/`check` bersamaan dengan build karena keduanya menulis metadata `.svelte-kit`.

Output statis berada di `build/`. Playwright menjalankan server file statis pada port 4178, menguji autosave, PDF, tanggapan admin, reset, kedua role, dan pergantian periode. Tes juga memeriksa bahwa alur demo tidak meminta API/PocketBase. Chrome perlu terpasang untuk konfigurasi pengujian ini.

## Vercel

`vercel.json` mengatur build dummy `npm run build`, output `build`, dan fallback SPA ke `index.html` agar tautan halaman langsung/reload bekerja. Demo tidak membutuhkan environment variable PocketBase atau email. PR ke `development` bukan izin mengubah Branch Tracking, konfigurasi hosting, atau deployment production.

Pembuatan branch lokal tidak otomatis mengganti deployment yang sedang tayang. Konfigurasi proyek Vercel belum diubah oleh pekerjaan ini.

## Lokasi kode

- `src/lib/data/demo/`: adapter data, transaksi penyimpanan browser, dan fixture simulasi.
- `src/lib/components/`: UI dikelompokkan menurut role/halaman.
- `src/routes/`: halaman aplikasi; endpoint API tidak disertakan pada branch demo.
- `tests/browser/demo.spec.ts`: pemeriksaan demo pada build statis.

Modul backend, skrip PocketBase, dan dokumen migrasi lama masih tersimpan sebagai referensi serta untuk tes regresi logika; tidak dipakai build demo dan tidak perlu dijalankan. Implementasi backend proposal asli disimpan pada branch `feat/proposal-versions-admin-feedback`. Pengembangan aplikasi PocketBase tetap dilanjutkan terpisah dari branch demo ini.
