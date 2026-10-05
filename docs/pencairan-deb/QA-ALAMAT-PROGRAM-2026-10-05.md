# Alamat lokasi program: implementasi dan QA

Perubahan lokal pada branch `development`, untuk Pencairan > Data Program. Hanya lokasi program yang memakai pilihan provinsi, kabupaten/kota, kecamatan, desa/kelurahan, dan kode pos otomatis. Alamat kampus tetap berupa isian terpisah.

Komponen menggunakan `RegionSelect` dan JSON `static/data/regions` yang sudah tersedia di DEB dan sama dengan PF Series. Tidak menambah dependensi atau menyalin dataset lagi. Kode pos dapat dikoreksi manual.

Alamat lengkap terisi setelah desa dipilih dan dapat diedit. Pergantian wilayah memperbarui alamat yang masih otomatis; alamat hasil edit dipertahankan dengan pengingat dan tombol **Susun ulang dari wilayah**. Pilihan wilayah turunan direset ketika induknya berubah. Lokasi lama tetap ditampilkan, tanpa menebak ID wilayah dari namanya.

Draf belum lengkap boleh disimpan. Pengajuan baru membutuhkan wilayah lengkap dan alamat lengkap. Backend memeriksa format kode, hubungan kode induk-anak, dan format kode pos. Pemetaan surat menggunakan alamat kampus dan alamat lengkap lokasi program secara terpisah.

## Bukti QA browser

- Target: `http://127.0.0.1:5176`, backend PocketBase lokal yang dijaga skrip pemeliharaan.
- Skrip ulang: `scripts/qa/program-location.playwright.js`, dijalankan melalui tool Playwright dengan akun kampus QA sementara sesuai petunjuk di skrip.
- Lulus: pilihan wilayah bertingkat; Tebet Timur menghasilkan 12820; Tebet Barat menghasilkan 12810; alamat otomatis; tambahan manual bertahan setelah pergantian desa dan reload dari backend; alamat kampus tetap sama.
- Lulus: pemetaan alamat untuk dokumen; validasi kelengkapan; PATCH kabupaten dari provinsi berbeda ditolak HTTP 400; reset wilayah; tombol susun ulang.
- Tampilan desktop 1366px dan mobile 390px diperiksa melalui screenshot. Mobile tidak melebar horizontal.
- Satu error jaringan 400 berasal dari pengujian penolakan data yang sengaja tidak valid.
- Akun QA sudah keluar. Pembersihan lokal menghapus 1 kampus, 1 pengguna, dan 18 record terkait; tidak menghapus berkas dan tidak mengakses database remote.

Tidak menjalankan test/check/lint/build melalui terminal. Pemetaan dokumen diperiksa, tetapi ekspor/render DOCX belum diuji pada sesi ini. Tidak commit, push, atau deploy.

## Persiapan PR

Perubahan alamat dipisahkan pada branch `feat/program-location-address` dari `origin/development`; perubahan navigasi/snackbar pada PR #30 tetap terpisah. Build `npm run build` pada worktree PR berhasil (exit 0), menghasilkan situs statis di `build`. Ada warning awal bahwa `.svelte-kit/tsconfig.json` belum tersedia pada worktree baru; build tetap menyelesaikan pembuatan konfigurasi dan output. QA browser di atas dilakukan pada workspace lokal sebelumnya, bukan simulasi ulang pada worktree PR. Test suite/check/lint tidak dijalankan.
