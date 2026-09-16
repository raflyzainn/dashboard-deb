# Digitalisasi DEB — demo mandiri

Branch `production` menggunakan UI terbaru dari development dan perubahan proposal terkini, dengan data simulasi di **IndexedDB browser**. Aplikasi berjalan sebagai situs statis tanpa PocketBase, API aplikasi, login nyata, atau layanan email.

## Menjalankan

Gunakan Node.js 22.x.

```sh
npm ci
npm run dev
```

Buka alamat yang ditampilkan Vite, pilih akun kampus atau administrator, lalu **Buka ruang kerja**. Tidak memerlukan `.env` atau menjalankan PocketBase.

Data awal mencakup 40 kampus, 30 indikator, proposal PDF contoh, pengajuan, forum, dan notifikasi. Nama institusi digunakan sebagai contoh; angka dan dokumen adalah simulasi.

Isian indikator, periode, versi PDF, tanggapan admin, forum, dan perubahan lainnya bertahan setelah reload pada browser dan origin yang sama. Ganti akun melalui sidebar untuk mencoba alur kampus/admin dengan data yang sama. **Reset data demo** mengembalikan contoh awal setelah konfirmasi.

Halaman admin Akun kampus menampilkan dua PIC per kampus, masing-masing dengan nama dan email yang dapat diedit. Login dummy tetap satu pilihan per kampus (40 pilihan awal). Penyimpanan versi lama ditingkatkan otomatis dengan mempertahankan PIC pertama dan seluruh data kampus.

Data tidak tersinkron antarperangkat atau pengunjung. Menghapus penyimpanan situs juga menghapus perubahan demo. Pemilih peran bukan autentikasi; jangan gunakan demo untuk data pribadi atau dokumen operasional.

## Build dan pengujian

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

`vercel.json` mengatur build `npm run build`, output `build`, dan fallback SPA ke `index.html` agar tautan halaman langsung/reload bekerja. Setelah branch dipush, ubah **Project Settings → Environments → Production → Branch Tracking** dari `main` menjadi `production`, lalu deploy commit branch ini. Tidak membutuhkan environment variable PocketBase atau email.

Pembuatan branch lokal tidak otomatis mengganti deployment yang sedang tayang. Konfigurasi proyek Vercel belum diubah oleh pekerjaan ini.

## Lokasi kode

- `src/lib/data/demo/`: adapter data, transaksi penyimpanan browser, dan fixture simulasi.
- `src/lib/components/`: UI dikelompokkan menurut role/halaman.
- `src/routes/`: halaman aplikasi; endpoint API tidak disertakan pada branch demo.
- `tests/browser/demo.spec.ts`: pemeriksaan demo pada build statis.

Modul backend, skrip PocketBase, dan dokumen migrasi lama masih tersimpan sebagai referensi serta untuk tes regresi logika; tidak dipakai build demo dan tidak perlu dijalankan. Implementasi backend proposal asli disimpan pada branch `feat/proposal-versions-admin-feedback`. Pengembangan aplikasi PocketBase tetap dilanjutkan terpisah dari branch demo ini.
