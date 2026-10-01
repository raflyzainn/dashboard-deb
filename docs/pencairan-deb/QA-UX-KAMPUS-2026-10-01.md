# QA UX alur kampus - 1 Oktober 2026

## Kesimpulan

Alur RAB sudah cukup mudah diikuti, tetapi keseluruhan pengajuan belum konsisten bagi pengguna kampus baru. Ada perbedaan petunjuk Beranda vs alur baru, daftar validasi berulang, serta pekerjaan PF yang ditampilkan sebagai pekerjaan kampus. Laporan ini merupakan evaluasi dari walkthrough Playwright, bukan klaim usability test dengan pengguna kampus sungguhan.

## Skenario dan hasil

Target aplikasi PocketBase lokal 5176. Login Sorong (`campus-040`) untuk mengamati kondisi awal yang sama dengan screenshot pengguna. Tidak mengisi atau mengunggah dokumen ke kampus tersebut; navigasi dapat memperbarui posisi terakhir. Login QA 903 untuk alur dengan data yang sudah lengkap.

1. Beranda Sorong: lima tombol Unggah untuk PKS, permohonan, kuitansi, invoice, dan rekening. Tombol PKS membawa pengguna langsung ke formulir PKS alur baru, bukan unggah dokumen.
2. Data Program: nama program/desa/kabupaten kosong; lokasi program masuk Alamat kampus; beberapa mentor dan telepon ditampilkan dalam satu input. Tombol Lanjut tetap bisa ke RAB meski Data Program belum lengkap.
3. Upload RAB: petunjuk satu file 100%, nilai SK Rp75 juta, format dan batas file terlihat. Tidak upload ke kampus Sorong agar draf tetap kosong.
4. QA 903: jumlah item T1 diubah 6 menjadi 5; PATCH berhasil 200 dan snackbar Draf RAB tersimpan terlihat. Lanjut ke T2 lalu Kembali tetap menampilkan 5. Dikembalikan ke 6 dan tersimpan. Total akhir tetap RAB20/T1 12/T2 8 juta.
5. Lanjut T2 -> Administrasi -> PKS berhasil. Dokumen yang sudah lama diberi keterangan Data berubah, buat ulang dokumen.
6. Siapkan semua dokumen berhasil menghasilkan empat dokumen versi 2. Ringkasan menampilkan nilai SK, RAB, termin, nama program, dan rekening.
7. Ajukan untuk diperiksa pada akun QA berhasil. Riwayat pengajuan bertambah, tombol kirim hilang, dokumen menjadi Menunggu PF. Header sempat masih menunjukkan draf tepat setelah kirim, lalu diperbarui menjadi PF yang bertindak.
8. Lebar mobile 390 piksel: halaman tidak meluber horizontal; navigasi butir memakai geser horizontal.

Status akhir QA Lokal 2 sekarang **menunggu PF**, empat dokumen versi 2. Tidak menyetujui atau melakukan pembayaran. Semua data contoh berada di lokal.

## Temuan prioritas

| Prioritas | Temuan | Dampak dan saran |
| --- | --- | --- |
| Tinggi | Beranda meminta unggah dokumen yang seharusnya dihasilkan otomatis | Ganti daftar tugas untuk alur baru menjadi Lengkapi Data Program / Unggah RAB / Lengkapi Administrasi / Periksa dan ajukan. Backend lama tetap memakai tugas lama. |
| Tinggi | Nomor PKS PF belum diisi diarahkan ke Perbaiki Administrasi kampus | Pisahkan hambatan milik PF dari isian kampus; tampilkan Menunggu nomor PKS dari PF dan pihak yang harus bertindak. |
| Tinggi | Puluhan validasi tampil sekaligus dan banyak duplikat | Validasi per field satu pesan, tampilkan prioritas langkah aktif, ringkas kekurangan per bagian. Contoh Nama kegiatan dan Judul program sebenarnya satu field. |
| Tinggi | Pemetaan Data Program tidak sesuai makna label | Bedakan alamat institusi dan lokasi kegiatan; pisahkan nama dari telepon; tampilkan beberapa mentor secara terbaca. Jangan menebak wilayah dari narasi atau menimpa profil asli. |
| Sedang | Header progres 1/10 tetap meskipun pengisian lengkap | Beri label jelas Progres pemeriksaan PF dan sediakan progres pengisian yang terpisah bila diperlukan. |
| Sedang | Lanjut pada Data Program kosong tetap aktif | Bila navigasi bebas memang diinginkan, beri tahu data belum lengkap. Jangan membuat tombol terasa sebagai konfirmasi kelengkapan. |
| Sedang | Pembuatan dokumen muncul di Administrasi dan PKS | Tetapkan tempat utama setelah data lengkap; sebelum itu cukup jelaskan dokumen akan dibuat otomatis. |
| Sedang | Status header terlambat sesudah pindah langkah/kirim | Sinkronkan segera setelah mutasi, sehingga pesan berhasil tidak berdampingan dengan petunjuk lanjutkan draf. |
| Rendah | Istilah campur Invois/Invoice, Tahap/Termin, Draf/Draft | Seragamkan istilah untuk mengurangi beban membaca. |

## Bagian yang sudah membantu

- Satu RAB penuh sebagai sumber, empat langkah dengan tujuan berbeda.
- Penjelasan batas 70% untuk total dana, bukan memaksa setiap item 70/30.
- Perhitungan sisa T2, autosave, snackbar, dan kembali ke T1 tanpa kehilangan isian.
- Penjelasan rekening kampus tidak memerlukan kuasa, batas file, dan aturan tanggal surat.
- Ringkasan nominal sebelum satu kali kirim serta status menunggu PF sesudah terkirim.

## Batas evaluasi

### Perbaikan lanjutan: validasi langsung saat mengetik

Peringatan Data Program, Administrasi, PKS, serta daftar kekurangan dokumen kini dihitung dari isian lokal yang sedang diedit. `validateJourney` diekstrak dari aturan server yang sudah ada, sehingga UI dan pengajuan tetap memakai aturan yang sama. Ini tidak otomatis menyimpan formulir: tombol Simpan draf tetap berlaku. Berkas yang belum diunggah dan pekerjaan PF tetap menjadi peringatan meskipun kolom teks lain terisi.

QA Playwright pada Sorong: isi Kabupaten/Kota membuat peringatan hilang tanpa PATCH penyimpanan; kosong/spasi memunculkannya lagi. Rekening alfabet tetap tidak valid, rekening numerik valid menghilangkan peringatan format. Tanggal invoice 17 Juni ditolak, 18 Juni menghilangkan peringatan tanggal. Nomor PKS kampus yang diketik menghilangkan seluruh pesan kekurangan nomor tersebut. Peringatan kop belum diunggah tetap muncul. Semua isian percobaan dikembalikan tanpa disimpan. Pemeriksaan yang bisa diulang: `scripts/qa/pengajuan-live-validation.playwright.js` melalui tool browser pada formulir Data Program yang bisa diedit.

Walkthrough ini tidak mengulang import Excel dari nol, pembayaran, atau pemeriksaan admin; hasil fungsional sebelumnya ada di laporan migrasi. Belum ada pengamatan pengguna nonteknis nyata. Temuan UX di atas belum diimplementasikan dalam sesi audit ini. Screenshot lokal tersedia di `.playwright-mcp/qa-ux-campus-submitted-mobile.png`.

### Perbaikan lanjutan: peringatan ganda

Validasi bersama Data Program, Administrasi, PKS, dan Ringkasan kini menggabungkan alias template berdasarkan sumber field. Nama kegiatan/Judul program, identitas penandatangan, pemilik rekening, tempat surat, nomor surat, dan pecahan tanggal PKS tidak dihitung berulang. Lokasi program yang dihitung dari desa/wilayah mengikuti peringatan field sumber; Kecamatan tetap opsional. Kekurangan nominal terbilang RAB mengikuti peringatan RAB yang sudah ada. Perbandingan nama kuasa hanya diperiksa setelah kedua nama diisi. Daftar placeholder mentah tetap tersedia untuk pemeriksaan template.

QA melalui tool Playwright: seluruh placeholder empat template diuji pada validator di browser; program kosong menghasilkan enam pesan untuk enam field wajib, tanpa pesan Judul program/Lokasi program tambahan. Rekening alfabet dan tanggal invoice 17 Juni tetap ditolak. Pada formulir Sorong, Nama kegiatan kosong menampilkan satu pesan dan mengetik menghilangkannya langsung; isian percobaan dikembalikan tanpa disimpan. Pemeriksaan dapat diulang melalui `scripts/qa/pengajuan-live-validation.playwright.js`. Build/check terminal tidak diulang untuk perubahan ini. Temuan UX lain pada laporan sebelumnya tetap terbuka.
