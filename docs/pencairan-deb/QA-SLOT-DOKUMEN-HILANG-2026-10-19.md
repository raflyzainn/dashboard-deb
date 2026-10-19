# Pemulihan jenis dokumen pengajuan

## Penyebab dan batas perbaikan

Pengajuan preview dibuat langsung berstatus `draf` tanpa baris `documents`.
Hooks mengarahkannya ke alur journey sehingga inisialisasi layanan lama tidak
dipanggil. Pemeriksaan RAB dan perubahan rekening mengakses status baris yang
tidak ada; unggah rekening mengakses `kind` dari baris yang tidak ada.

Lapisan transaksi journey kini melengkapi jenis dokumen dari `KINDS` hanya jika
belum tersedia. GET membentuk tampilan lengkap tanpa menulis database. Baris
baru disimpan dalam transaksi operasi yang berhasil, sebelum versi unggahan
yang merujuk kepadanya. Baris lama, status, versi, dan pemeriksaannya tidak
diganti oleh inisialisasi ini. Validasi revisi dan kunci pembayaran tetap berlaku.

Pemulihan ini tidak mengembalikan berkas fisik atau riwayat versi yang terhapus.
Alur legacy tetap memakai mekanisme inisialisasi existing.

## Bukti QA

QA dijalankan lewat tool Playwright pada aplikasi lokal 5176/PocketBase 8097,
dengan akun dan pengajuan sintetis. Tidak menjalankan test suite terminal.

- Sebelum perubahan: slot kosong, POST RAB 400 dengan `setting 'status'`.
- Sesudah perubahan: permintaan RAB yang sama 200, sepuluh slot tersimpan.
- Sebagian slot hilang: unggah rekening 200; versi terhubung ke slot baru.
- SK existing berstatus `sesuai`: ID, status, dan `updated` tetap sama.
- Operasi berulang: tetap sepuluh jenis unik, tidak ada duplikasi slot.
- Revisi kedaluwarsa: 409. Pengajuan sudah dibayar: 409.
- GET dan operasi ditolak pada sembilan slot: database tetap sembilan slot.
- Regresi browser reusable: `scripts/qa/missing-document-slots.playwright.js`.
  Jalankan dengan tool browser setelah menyiapkan fixture sesuai komentar file.

## Production dan publikasi

Data Kampus PREVIEW DEB - AWAL (SIMULASI) sudah dilengkapi terpisah pada sesi
sebelumnya. Browser production membuktikan Periksa RAB, Lanjut, simpan rekening,
unggah, dan reload berhasil; isian pengujian kemudian dipulihkan.
Pemeriksaan read-only terbaru: 41 pengajuan termin pertama memiliki jenis
dokumen lengkap. Ini bukan audit keberadaan semua objek berkas.

Perubahan kode ini masih lokal; belum commit, push, deploy, atau build/check.
