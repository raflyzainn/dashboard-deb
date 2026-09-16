# Penataan komponen berdasarkan role dan halaman

**Tujuan:** memisahkan komponen berdasarkan pemakaian agar folder mudah dibaca, tanpa perubahan UI atau perilaku.

**Struktur:** `src/lib/components/{ui,layout,auth,admin,campus,shared}`. Folder role/shared memiliki subfolder halaman. Komponen route bersama yang sebelumnya di `routes/(app)/_components` dipindah ke struktur yang sama. Routing tetap di `src/routes`.

- [x] Petakan pemakaian dan import komponen.
- [x] Pindahkan komponen dan sesuaikan semua import; periksa bahwa isi selain import tetap identik.
- [x] Tambahkan panduan singkat di components/README.md.
- [x] Jalankan Svelte check, build, tes unit, dan smoke Playwright untuk kedua role.

Hasil: Svelte check 0 error/warning, build Cloudflare berhasil, format:check dan diff --check bersih, 41 tes unit lulus, 2 tes Playwright halaman admin/kampus desktop/mobile lulus. Semua 28 komponen yang dipindah mempertahankan isi selain path import.

Tidak menambah dependency, wrapper, barrel export, atau duplikasi komponen lintas role. Perubahan disimpan lokal pada branch khusus penataan komponen.
