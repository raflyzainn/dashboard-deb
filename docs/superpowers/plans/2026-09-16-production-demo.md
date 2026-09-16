# Branch production: demo mandiri

Tujuan: UI terbaru termasuk proposal, tanpa koneksi PocketBase; semua data dan PDF contoh disimpan di IndexedDB browser. Branch fitur proposal menyimpan implementasi backend asli.

- [x] Simpan perubahan proposal dan buat branch production.
- [x] Gunakan ulang fixture dummy dan implementasikan adapter browser sesuai kontrak dataService.
- [x] Aktifkan pemilih akun demo, penyimpanan lokal, reset, dan administrasi akun simulasi yang jelas.
- [x] Siapkan build statis dengan adapter-static dan rewrite Vercel, tanpa endpoint server.
- [x] Uji build, tipe, halaman kedua role, persistensi, unggah PDF, tanggapan, periode, reset, dan pastikan tidak ada request API/PocketBase.

Tidak mengubah konfigurasi project Vercel atau push remote. Penyimpanan hanya berlaku pada browser/origin yang sama; email dan autentikasi akun nyata tidak dijalankan.

Verifikasi: Svelte check 0 error/warning; 37 tes unit/regresi lulus; format lulus; build adapter-static lulus; 4 tes Playwright pada server file statis lulus (termasuk forum dan akun). Tidak ada request API/PocketBase pada alur yang diperiksa. Screenshot tersedia di `.qa/demo-admin-proposal.png` dan `.qa/demo-campus-mobile.png`.

Catatan: jalankan check/sync dan build berurutan karena berbagi metadata `.svelte-kit`; build paralel pernah menghasilkan identitas bootstrap berbeda. Kategori forum dinormalisasi dengan helper validasi agar proxy Svelte tidak ikut disimpan ke IndexedDB.
