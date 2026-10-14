# Impor tambahan Qty RAB — 12 Oktober 2026

Permintaan pengguna: unggahan awal Qty 10 diikuti tambahan Qty 5 harus menghasilkan Qty 15, bukan mengganti Qty menjadi 5.

## Perilaku

- Kategori, sub kategori, dan nama yang sama: Qty dijumlahkan; ID baris lama dipertahankan.
- Harga satuan tetap mengikuti Excel terbaru. Contoh Panel QA: 15 unit × Rp3 juta = Rp45 juta; ditambah Baterai QA 1 × Rp5 juta menghasilkan Rp50 juta. Ini tidak mempertahankan harga per batch; jika perlu harga berbeda per batch, gunakan nama item berbeda.
- Perbedaan Satuan, Volume, atau Satuan Volume ditolak sebelum perubahan diterapkan. Qty lama tidak valid atau gabungan melampaui batas juga ditolak.
- Item baru menjadi baris baru. Upload ulang merupakan tambahan berikutnya: Panel 15 → 20 dan Baterai 1 → 2. Petunjuk UI menyebutkan konsekuensi ini; koreksi jumlah dilakukan langsung di tabel.
- Perubahan menggantikan aturan lama yang memperbarui/menimpa Qty berdasarkan nama item. Laporan QA historis tentang overwrite/idempotensi tidak menjadi bukti perilaku impor terbaru.

## Bukti dan batas pemeriksaan awal

- Browser membaca kedua berkas asli di `output/contoh-upload-rab-template-asli/` dengan parser aplikasi: awal Panel Qty 10, setelah tambahan Panel Qty 15 dan Baterai Qty 1. Impor ulang menghasilkan Panel Qty 20 dan Baterai Qty 2.
- Komponen `RabItemsEditor` dipasang terisolasi di browser: input file pertama menghasilkan Qty 10/1 baris, kedua Qty 15/2 baris; payload ke callback simpan berisi Qty 15.
- Callback simpan memakai fixture, bukan PocketBase. QA database penuh belum diulang; halaman login mengalami timeout startup lokal. PocketBase health HTTP 200 dan Vite berjalan pada 5176.
- Salinan Excel sementara untuk akses browser dihapus setelah QA. Tidak membuat kampus/akun QA baru.
- Test regresi ditambahkan pada `tests/pencairan-edge-cases.test.ts`; tes terminal, build/check/lint tidak dijalankan. Belum commit/push.

## QA aplikasi dan database sebelum publikasi

Setelah pengguna meminta QA keseluruhan perubahan sebelum push, aplikasi lokal berhasil dibuka. Kampus baru terisolasi memakai SK Rp20 juta; tidak memakai fixture untuk alur bisnis di bawah. Kegagalan autosave saja disimulasikan dengan HTTP 500.

| Skenario | Hasil terlihat dan API |
| --- | --- |
| Excel awal lalu tambahan asli | HTTP 200 keduanya; Panel Qty 10 → 15, Baterai Qty 1; reload mempertahankan Qty 15 |
| Total contoh melebihi SK | Periksa RAB terkunci |
| Satuan/Volume berbeda | Ditolak; Qty 15 dan data database tetap tersedia |
| Duplikat di dalam Excel | Ditolak sebelum perubahan |
| Qty gabungan di luar batas | Ditolak sebelum perubahan |
| Upload ulang tambahan | Panel 15 → 20, Baterai 1 → 2; tidak menambah baris duplikat |
| Autosave gagal setelah tambahan berikutnya | Qty 25 tetap terlihat; retry menyimpan Qty 25/Baterai 3, tanpa menjumlahkan ulang saat retry |
| Koreksi manual dan finalisasi | Qty Panel 15, harga Rp1 juta; Baterai 1 × Rp5 juta, total Rp20 juta. Finalisasi berhasil |
| Pembagian | Di atas 70% terkunci; Rp14 juta/Rp6 juta tersimpan |
| Data pengajuan dan dokumen | Data program, wilayah, rekening, penandatangan, kop, PKS lengkap; empat dokumen dibuat; PDF PKS berhasil diunduh |
| Pengajuan pertama | Submit HTTP 200, riwayat 1, menunggu; notifikasi admin dan tautan kampus benar |
| Tambahan pada revisi RAB | Keputusan revisi admin HTTP 200; unggah Qty Panel 15 → 20 |
| Alokasi setelah item berubah | Sesudah koreksi agar sesuai SK dan finalisasi, alokasi Panel yang berubah kosong; alokasi Baterai yang tidak berubah tetap 0 |
| Pengajuan perbaikan | Alokasi Panel 18 × Rp750 ribu = Rp13,5 juta; kirim perbaikan HTTP 200; satu notifikasi perbaikan terlihat |
| Submit ulang saat menunggu | Ditolak HTTP 400 |
| Ponsel 390px | Lebar halaman 380px, tidak meluap horizontal |
| Pembersihan | Kampus dan akun QA serta relasinya dihapus setelah metadata diarsipkan; kembali 40 kampus tanpa Kampus QA |

Lingkup rangkaian ini adalah impor RAB sampai pengajuan dan kirim perbaikan. Pembayaran Tahap 1 telah diuji pada laporan alur lengkap sebelumnya, tidak diulang di sini. Bukan pengujian seluruh modul, rekening kuasa, Tahap 2/LPJ, atau production. Test suite terminal dan check/lint tetap tidak dijalankan. Build wajib dijalankan sebelum publikasi yang diminta pengguna; hasilnya dicatat setelah selesai.

Build sebelum publikasi: `npm run build` berhasil exit 0 menggunakan adapter Cloudflare. Warning: `punycode` deprecated dan chunk client lebih besar dari 500 kB. Log lokal `output/build-rab-additive-20261012.log` tidak disertakan dalam commit. Publikasi ditujukan ke development GitHub/GitLab sesuai permintaan pengguna; tidak deploy.
