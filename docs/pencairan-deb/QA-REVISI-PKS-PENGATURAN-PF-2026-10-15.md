# Revisi dokumen setelah pengaturan PF berubah

## Perbaikan lokal

Perubahan pengaturan PF dapat membatalkan kesiapan dokumen meskipun isian kampus lengkap. Pada alur PKS dengan pemeriksaan Legal, PDF terbaru harus disiapkan Admin PF melalui **Pencairan > kampus > PKS > Siapkan PDF PKS**. Kampus kemudian membuka **Dokumen** dan menekan **Kirim perbaikan**. Surat permohonan, invois, dan kuitansi yang terdampak dibuat ulang otomatis. Pemeriksaan PF dan Legal tetap berlaku.

- Daftar dokumen dan tombol pembaruan surat tetap terlihat saat revisi. Hak edit bagian lain tetap terkunci.
- Kampus diberi petunjuk menunggu PDF dari PF, bukan pesan umum yang menyatakan isian belum lengkap. Pengiriman ditahan selama PDF belum siap.
- Menu Dokumen saat revisi memakai label Periksa dokumen. Catatan revisi yang sama ditampilkan sekali.
- Validasi server membedakan isian belum lengkap, PDF PKS yang harus disiapkan PF, dan surat lain yang perlu dibuat ulang.

## QA browser 15 Oktober 2026

Playwright pada frontend lokal 5176 dan PocketBase lokal 8097. Sesuai arahan pengguna, reproduksi menggunakan **Kampus QA Lokal 3** (`32859b9c98494e7`), bukan Universitas Sriwijaya. Akun lokal sementara dibuat untuk kampus uji; tidak ada email akses yang dikirim. Pengaturan PF bersama tidak diubah ulang: fixture sudah memiliki PDF dengan pengaturan lama.

1. Isian lengkap (`blockers: []`), status revisi dan empat surat usang akibat pengaturan PF. Permintaan kirim dari sesi kampus ditolak 400 dengan alasan PDF terbaru belum siap. Kode perbaikan sudah aktif, sehingga pesan umum versi lama tidak diuji ulang melalui UI.
2. Halaman Dokumen menampilkan empat kartu, PDF sebelumnya, tombol buat ulang tiga surat, dan petunjuk tindakan Admin PF. Kirim perbaikan ditahan saat PDF belum siap.
3. Admin menekan Siapkan PDF PKS. Konversi DOCX ke PDF selesai; panel menampilkan PDF siap diperiksa PF.
4. Halaman kampus menerima pembaruan. Tombol Kirim perbaikan aktif. Klik tombol membuat ulang tiga surat dan berhasil mengirim paket.
5. Hasil server: status `menunggu`, `stale: []`, `blockers: []`, riwayat pengajuan bertambah dari 1 menjadi 2; empat surat `menunggu_review`. PKS masih berstatus review `draft`, belum disetujui Legal. Riwayat versi lama tetap ada.
6. Setelah reload, empat kartu dokumen tetap tampil saat menunggu PF. Lebar layar 390 px tidak mengalami overflow horizontal.

Data Sriwijaya dan production tidak dimutasi dalam QA ini. Fixture QA Lokal 3 ditinggalkan pada status menunggu pemeriksaan PF. Test regresi pesan validasi ditambahkan di `tests/journey-submission.test.ts`, tetapi belum dijalankan. Test suite, check, lint, dan build terminal tidak dijalankan; perubahan belum dipush.
