# QA jalur revisi pencairan lokal — 1 Oktober 2026

Lingkup: PocketBase lokal 8097, frontend 5176, Tahap 1 alur pengajuan baru. Menggunakan Kampus QA Lokal 3 dan akun QA 904, tidak mengubah pengajuan kampus asli. Pemeriksaan melalui tool Playwright, interaksi UI dan request dari sesi browser. Tidak menjalankan test/check/build terminal, commit atau push.

## Skenario dan hasil

| Skenario | Hasil yang diamati |
| --- | --- |
| Admin meminta revisi rekening | Catatan tampil di kampus; Administrasi menjadi Perlu revisi; isian terbuka. |
| Kirim ulang tanpa mengganti rekening | Awalnya tombol aktif. Diperbaiki: tombol ditahan dan request langsung ditolak 400. |
| Kampus unggah pengganti, buat ulang dokumen, kirim ulang | Berhasil; paket kembali Menunggu PF. |
| Admin meminta perubahan alokasi RAB | Kampus mengubah panel dari dua ke satu paket; Termin 1 Rp12 juta menjadi Rp8 juta; Termin 2 dihitung otomatis. Dokumen dibuat ulang, pengajuan masuk kembali. |
| PF mengubah nomor PKS setelah pengajuan | Kampus mendapat catatan revisi dan wajib membuat ulang dokumen sebelum mengirim ulang. |
| Admin membatalkan persetujuan PKS | Paket kembali Menunggu PF, PKS Periksa; dapat disetujui kembali. |
| Admin membatalkan persetujuan RAB | Ditemukan tombol persetujuan terkunci. Transisi versi diperbaiki; dapat disetujui kembali lewat UI. |
| Revisi setelah pindaian PKS diterima | Pindaian lama tetap tersedia sebagai versi historis, tetapi signedReceived direset; empat dokumen menjadi perlu dibuat ulang. |
| Catatan revisi kosong / keputusan tidak dikenal | Ditolak 400. |
| Riwayat kirim ulang | Enam pengajuan tercatat; urutan nomor 1–6 diverifikasi setelah perbaikan pengurutan audit. |

## Perbaikan kode

- `journeyView` mengirim `revisionBlockers`; server dan tombol kirim menahan revisi yang belum ditindaklanjuti. Unggah pengganti / pembuatan dokumen baru / perubahan alokasi menghapus hambatan sesuai jenis berkas.
- Permintaan revisi memanggil `touchJourney`: dokumen terbaru harus dibuat ulang dan tanda tangan/asli lama tidak dipakai untuk paket revisi.
- Pembatalan persetujuan RAB mengembalikan versi ke menunggu pemeriksaan dan menghapus relasi versi aktif yang tidak lagi disetujui.
- Timeline kembali ke Isi pengajuan saat revisi; petunjuk menjelaskan perbaikan dan kirim ulang. Nama dokumen pada catatan memakai label pengguna.
- Riwayat pengajuan diurutkan berdasarkan waktu; catatan keputusan terbaru tidak mengambil catatan lama dari keputusan sebelumnya.

## Cara mengulangi

Provision QA lokal memakai maintenance `--seed-qa3`. Siapkan data program, RAB 100% Rp20 juta, alokasi, administrasi, nomor PKS PF/kampus dan empat dokumen melalui UI. Ajukan, setujui, kemudian minta revisi PKS. Jalankan `scripts/qa/revision-roundtrip.playwright.js` melalui tool browser. Skrip hanya mengubah QA 3 dan memerlukan status awal revisi PKS; bukan pemeriksaan produksi atau skrip yang dapat diulang tanpa menyiapkan prasyarat. Setelah selesai gunakan maintenance `--delete-qa`.

## Batas pembuktian

Cleanup selesai: satu kampus QA, satu akun, 163 record, dan 30 berkas dihapus. Regresi pembacaan 40 kampus (80 permintaan) menghasilkan HTTP 200; navigasi Tahap 2 tidak menampilkan tautan LPJ. Data kampus asli dipertahankan.

Validasi menjamin ada berkas/versi/alokasi pengganti, bukan kebenaran isi atau tanda tangan; admin tetap memeriksa hasil revisi. Mengunggah ulang berkas yang sama tetap memerlukan penilaian admin. Perubahan alokasi draf masih memakai versi RAB yang sama; riwayat pengajuan menyimpan referensi versi, bukan salinan terpisah tiap alokasi. QA ini tidak mencakup transaksi Tahap 2, produksi, transfer bank nyata, atau render dokumen di Microsoft Word.
