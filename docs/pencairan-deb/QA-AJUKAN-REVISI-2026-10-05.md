# Permintaan revisi kampus per bagian

Poin 14 melanjutkan poin 13. Implementasi lokal berada pada aplikasi port 5176; perubahan ini belum di-commit, dipush, atau dimasukkan ke PR.

## Perilaku

- Kampus dapat membuka semua halaman pengajuan. Bagian yang tidak boleh diedit tampil **Hanya lihat**; input, unggahan, dan checklist perubahan tetap terkunci.
- Di bawah Data Program, RAB, Administrasi, atau PKS yang terkunci tersedia **Ajukan Revisi**. Bagian mengikuti halaman saat ini; alasan wajib diisi, maksimal 2000 karakter. SK dan Ringkasan bukan bagian yang dapat diminta edit.
- Mengirim permintaan tidak mengubah data, status pemeriksaan, atau persetujuan dokumen. Satu permintaan pending per bagian; setelah penolakan, kampus dapat mengajukan lagi.
- Admin melihat alasan dan riwayat pada panel **Permintaan revisi kampus** di detail pencairan. Persetujuan membuka seluruh bagian tersebut. Penolakan wajib disertai catatan dan tidak membuka akses.
- Kampus menggunakan **Kirim perbaikan**; akses kembali terkunci untuk pemeriksaan. Surat dibuat ulang hanya jika data yang digunakan surat berubah. Dokumen yang tidak terdampak mempertahankan versi, tanda tangan, dan persetujuannya.
- Jika perbaikan tidak mengubah isi surat, admin memakai **Setujui perbaikan data** setelah memeriksa bagian terkait. Ini memakai keputusan pemeriksaan yang sudah tersedia, tanpa membuat ulang surat.
- Jika PF langsung meminta revisi bagian yang sama ketika permintaan kampus masih pending, permintaan tersebut ikut tercatat disetujui.
- Pengajuan yang sudah dibayar tidak dapat meminta atau memperoleh akses edit. Revisi yang sudah dibuka atau belum selesai diperiksa menahan kesiapan pembayaran, meskipun seluruh dokumen lama masih sesuai.

## Penyimpanan dan batas akses

`journey.editRequests` menyimpan bagian, alasan, pelaku, waktu, keputusan, dan catatan admin. Data ini disimpan dalam `applicationData` yang sudah ada, tanpa koleksi/migrasi baru. Persetujuan menggunakan mekanisme scope pada `revisionRequests`; tidak ada checkbox pemilihan field.

Endpoint `POST pengajuan/edit-requests` hanya menerima permintaan kampus sendiri. Endpoint keputusan dengan ID permintaan hanya untuk admin. Validasi status, panjang alasan, duplikasi, keputusan ulang, status sudah dibayar, dan versi data berjalan di layanan data/server. Endpoint perubahan field, unggahan, RAB, dan checklist tetap memeriksa izin tersendiri.

## Verifikasi browser

Gunakan tool Playwright pada `http://127.0.0.1:5176`, dengan akun sementara QA Lokal 3 dan admin lokal. Skrip memverifikasi identitas fixture dan menutup context browser pada `finally`.

- `scripts/qa/scoped-revisions.playwright.js`: regresi poin 13, tujuh pengiriman paket; navigasi kini read only. Seluruh skenario lulus, termasuk surat bertanda tangan, bukti rekening, dan surat kuasa yang terpengaruh perubahan program.
- `scripts/qa/edit-request.playwright.js`: pengajuan beralasan, duplikasi, batas panjang, penolakan, persetujuan, peran, akses baca halaman lain, pengiriman ulang, dan preservasi dokumen yang tidak terdampak. Juga memeriksa Administrasi, RAB, perbaikan kode pos tanpa mengubah surat, kesiapan pembayaran, dan permintaan kampus yang dipenuhi langsung oleh PF.
- Tampilan mobile 390px diperiksa tanpa overflow horizontal. Screenshot QA disimpan lokal dan tidak disertakan dalam publikasi.

Hasil akhir skrip permintaan revisi: seluruh pemeriksaan lulus, termasuk perubahan kode pos tanpa membuat ulang surat (`metadataOnly: true`); tidak ada exception JavaScript pada context QA baru (`consoleErrors: []`). Tab kerja lama sempat mencatat error HMR saat ekspor navigasi diganti; hasil QA akhir memakai context baru dan tidak mengandalkan tab tersebut.

Akun/kampus sementara beserta record dan berkas ujinya telah dihapus menggunakan pemeliharaan PocketBase lokal. Pemilih akun login sudah diperiksa kembali: `campus-904` tidak tersedia. Tidak ada database remote yang diakses. Test suite, check, lint, dan build terminal tidak dijalankan; verifikasi ini menggunakan browser dan API lokal, bukan bukti deployment produksi.
