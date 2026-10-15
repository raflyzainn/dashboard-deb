# Penerimaan dokumen asli opsional

Arahan pengguna 15 Oktober 2026: status Asli diterima menjadi pencatatan opsional, bukan syarat pembayaran.

Penilaian kesiapan bersama kini menggunakan pemeriksaan pindaian bertanda tangan (`signedAll`), bukan penerimaan asli. Semua pemanggil pada layanan pengajuan, detail pencairan, dan daftar kampus mengikuti aturan ini. Persetujuan pengajuan, pemeriksaan PF/Legal, pindaian terbaru, dan lampiran tetap divalidasi. Data penerimaan asli yang sudah tercatat dipertahankan. Tidak ada perubahan schema PocketBase.

Tampilan Tanda tangan menjelaskan sifat opsional penerimaan asli. Penanda selesai dan petunjuk pembayaran tidak lagi meminta dokumen asli sebagai prasyarat.

## Verifikasi lokal

- Browser: modul penilaian terbaru menghasilkan `siap_dibayar` tanpa parameter penerimaan asli ketika pemeriksaan dan lampiran lengkap.
- Browser: pindaian belum diperiksa atau lampiran kosong menghasilkan `lengkap`, bukan `siap_dibayar`; revisi tetap `menunggu_kampus`.
- Browser: halaman Tanda tangan Kampus QA Lokal 3 menampilkan petunjuk penerimaan asli opsional.
- Tidak mencatat pembayaran nyata atau mengubah data Sriwijaya/production. Alur pencatatan pembayaran end-to-end belum diuji.
- Test regresi ditambahkan, belum dijalankan. Tidak menjalankan test/check/lint terminal.

## Bukti transfer dan pengiriman branch

Komponen bukti transfer bersama menampilkan pratinjau gambar/PDF dengan tombol buka berkas dan unduh. Jika tidak ada bukti, tampil keterangan belum dilampirkan. Ringkasan kampus yang sudah dibayar menampilkan kartu berhasil beserta tanggal, nominal, dan referensi.

QA browser: gambar bukti lokal Papua dimuat di admin dan kampus; layar kampus 390 px tanpa overflow. Bukti PDF lokal Universitas Pertamina tampil dalam viewer. Pemeriksaan ini hanya membaca berkas yang sudah ada, tanpa mengubah pembayaran.

Build final `npm run build` berhasil exit 0 pada worktree `fix/revisi-pks-asli-opsional`, berbasis GitLab production `775bb42`. Adapter Cloudflare selesai. Warning yang masih ada: aksesibilitas tabindex pada Layar, deprecation punycode, dan ukuran chunk besar. Hasil ini membuktikan build lokal, bukan deployment production.
