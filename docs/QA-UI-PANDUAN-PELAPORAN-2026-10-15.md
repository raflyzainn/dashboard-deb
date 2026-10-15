# UI panduan pelaporan — 15 Oktober 2026

Bagian pelaporan dipindahkan ke dalam pembungkus Panduan Aplikasi dengan lebar maksimum 1120 px. Sebelumnya bagian ini berada di luar pembungkus sehingga melebar sendiri.

Paragraf panjang diganti ringkasan, satu bagian LPJ, empat keluaran dalam grid responsif, tombol Buka Pelaporan, dan detail cara kirim/revisi/kriteria selesai yang dapat dibuka-tutup. Informasi format berkas, batas video dua menit, riwayat revisi, serta syarat selesai LPJ/pelaporan tetap tersedia. Hanya tampilan dan susunan teks; tidak mengubah aturan atau data pelaporan.

QA tool Playwright melalui Node REPL pada 5176: kartu tampil sebagai kampus, detail dapat dibuka-tutup, tautan menuju `/campus/pelaporan`. Desktop 1366 px: kartu selebar 1120 px sesuai pembungkus. Mobile 390 px: lebar dokumen dan konten 380 px tanpa overflow horizontal. Screenshot desktop diperiksa; bukti lokal `.local/guide-report-desktop.png` dan `.local/guide-report-mobile.png`.

Tidak menjalankan test suite, check, lint, atau build terminal. Tidak commit/push atau memperbarui PR/MR pada perubahan UI ini.

## Build sebelum pembaruan PR/MR

Setelah pengguna meminta push UI ke PR/MR existing, `npm run build` dijalankan ulang pada branch `docs/panduan-pencairan-613` dan berhasil exit 0 dengan adapter Cloudflare. Warning: `punycode` deprecated, chunk client di atas 500 kB, dan `a11y_no_noninteractive_tabindex` pada linimasa Layar. Hash halaman panduan sama dengan versi yang di-QA lokal. Test suite, check, dan lint tetap tidak dijalankan. Pembaruan ditujukan ke PR GitHub #52 dan MR GitLab !36; tidak merge atau deploy.

## Urutan pengajuan baru

Delapan paragraf pengajuan diubah menjadi delapan kartu bernomor dengan label pelaku, ringkasan satu kalimat, serta rincian per tahap yang dapat dibuka-tutup. Desktop memakai dua kolom; mobile satu kolom. Seluruh penjelasan lama dipertahankan dalam rincian, termasuk aturan tanggal dan contoh, pembagian tugas PKS, PF → Legal, revisi, pindaian dan lampiran.

QA Playwright: delapan kartu tampil, semua rincian tertutup saat awal; rincian tahap 4 memuat aturan dan contoh tanggal lengkap, dapat ditutup kembali. Rincian tahap 6 dapat dibuka dengan Enter dari keyboard. Layar 390 px: lebar dokumen dan konten 380 px tanpa overflow horizontal. Screenshot desktop diperiksa di `.local/guide-steps-desktop.png`; bukti mobile `.local/guide-steps-mobile.png`. Tidak menjalankan transaksi atau mengubah data kampus.
