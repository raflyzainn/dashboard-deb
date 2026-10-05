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

### Autosave Data Program

Data Program kini memakai debounce 800 ms setelah perubahan terakhir. Tombol Simpan draf pada bagian ini dihapus; Administrasi dan PKS masih mengikuti penyimpanan sebelumnya. Status menunggu/menyimpan/tersimpan ditampilkan, kegagalan menyediakan Coba simpan lagi; konflik akun lain tetap memerlukan muat data terbaru. Tombol Lanjut/Kembali tetap menyimpan perubahan sebelum navigasi.

QA browser Sorong: perubahan cepat tidak mengirim PATCH sebelum jeda, satu burst menghasilkan satu PATCH, nilai bertahan setelah reload. Nilai percobaan dikembalikan dan disimpan kembali. Percobaan pertama membaca input terlalu cepat setelah reload; pemeriksaan ulang menunggu data halaman dan memverifikasi respons GET server, lalu berhasil. Pemeriksaan ulang tersedia pada scripts/qa/pengajuan-autosave.playwright.js, khusus formulir QA lokal yang bisa diedit. Build dan test terminal tidak dijalankan untuk perubahan ini.

### Warna titik Draf pada daftar butir kampus

Titik pada butir kampus berlabel Draf kini biru #0066B2, sama dengan SK. Perubahan hanya pada daftar alur kampus; status dan warna Sesuai, Menunggu PF, serta Perlu revisi tetap mengikuti pemetaan sebelumnya. QA browser Sorong memeriksa computed background ketujuh butir Draf: semuanya rgb(0, 102, 178). Build tidak dijalankan untuk perubahan tampilan ini.

### Unggahan dan alasan tombol dokumen terkunci

PDF TOR yang dipilih berukuran 5.659.661 byte, melebihi batas 2 MB. Pemilihan gagal kini menampilkan ukuran dan pesan di kotak unggah serta mengosongkan input gagal. QA browser memakai PDF sintetis 3 MB: pesan lokal muncul, input kosong, peringatan belum diunggah tetap berlaku. Tidak ada file sintetis tersimpan.

Administrasi kini menampilkan seluruh penghalang pembuatan dokumen, termasuk bagian lain. Nomor PKS PF ditandai sebagai tugas admin PF tanpa tombol Perbaiki yang membebankan kampus. GET pengajuan Sorong terakhir menunjukkan rekening/kop tersimpan; satu penghalang tersisa nomor PKS PF. QA browser memastikan alasan tampil dan tombol tetap terkunci sesuai validasi. Nomor PF tidak diisi otomatis dengan nilai palsu.

### Template surat kuasa

Susunan mengacu pada contoh surat kuasa penerimaan dana Danamon (https://www.danamon.co.id/-/media/ALL-CONTENT-BUSINESS-BANKING/MUFG/pdf/form/13-Surat-Kuasa-Penerimaan-Dana.pdf), dengan isi khusus pengajuan DEB. Identitas memakai kolom label/titik dua/nilai; tanda tangan dua kolom sejajar. A4 margin 2,5 cm. Header contoh permohonan tidak diwariskan. Kop semua dokumen dibatasi tinggi 1 inci dengan rasio asli agar gambar tinggi tidak membuat satu halaman sendiri. Dokumen tersimpan sebelumnya tidak diubah; unduh/buat ulang untuk hasil baru.

Pratinjau docx-preview browser diperiksa melalui screenshot: surat kuasa data sintetis satu halaman, identitas dan tanda tangan sejajar; gambar tinggi 122x332 dibatasi tinggi 96 px. LibreOffice/soffice tidak tersedia, sehingga render Word/PDF native belum diverifikasi. Screenshot final lokal: .playwright-mcp/qa-kuasa-layout-final.png. Build dan tes terminal belum dijalankan.

### Dashboard admin dan permintaan data PF

Akar error direktori: 138 ID versi dokumen digabung dalam satu filter OR, PocketBase mengembalikan 400. Pembacaan ID kini dibagi 50 per permintaan, dipakai bersama oleh direktori dan antrean pemeriksaan. QA browser API direktori: 200, 42 kampus. Dashboard menampilkan tugas Lengkapi nomor PKS PF dengan tautan langsung ke PKS kampus terkait. Error lama dibersihkan saat pemuatan ulang berhasil.

Kampus yang membutuhkan nomor PF mendapat tombol Minta PF melengkapi nomor PKS. PATCH memakai revisi server dan menyimpan pfRequestedAt pada applicationData yang sudah ada; permintaan berulang tidak mengirim notifikasi ganda. Notifikasi memakai notifyAdmins yang sudah tersedia, setelah transaksi berhasil. Admin mengisi melalui form Data PKS yang diisi PF; perubahan nomor mengirim notifyCampus untuk melanjutkan dokumen. Tidak ada collection tambahan dan nomor tidak dibuat palsu.

QA browser lokal Sorong: permintaan dikirim, tombol berubah Permintaan sudah dikirim ke PF, API notifikasi admin 200 berisi Nomor PKS PF diperlukan, tautan PKS membuka input admin. Nomor PF tetap kosong dan belum diubah dalam QA ini. Karena itu pembuatan dokumen Sorong masih menunggu aksi admin; notifikasi balik setelah nomor disimpan belum dicoba pada data Sorong. Permintaan lokal Sorong tersimpan sebagai tindakan QA, bukan paket pengajuan final. Tidak ada email/WhatsApp dikirim. Pemeriksaan browser baca direktori tersedia pada scripts/qa/pencairan-directory.playwright.js. Build/typecheck belum diulang dan perubahan belum dipush.

### Pembukaan penghalang Sorong dengan nomor simulasi lokal

Atas izin pengguna untuk mengisi data lokal, nomor PKS PF Sorong diisi melalui form admin menjadi PKS-PF/SIMULASI-LOKAL/SORONG/2026/001. Nomor ini khusus simulasi, bukan nomor resmi. Notifikasi balik Nomor PKS PF sudah tersedia terverifikasi di akun kampus. GET pengajuan menghasilkan blockers kosong. Tombol Siapkan semua dokumen berhasil menghasilkan PKS, permohonan, invois, kuitansi dari UI kampus. Tombol Ajukan untuk diperiksa aktif. Draf dibiarkan belum diajukan agar pengguna dapat melanjutkan percobaan.

### Pratinjau di kartu dokumen

Pratinjau PKS, permohonan, invois, dan kuitansi kini tampil di dalam kartu masing-masing, tepat sesudah tombol dan sebelum panduan. Hanya satu pratinjau terbuka; klik tombol yang sama menutupnya. QA browser Sorong membuka keempat dokumen, memastikan renderer terlihat dalam kartu terkait, lalu menutupnya. Build belum diulang dan perubahan belum dipush.

### Linimasa pengajuan baru

Linimasa sebelumnya membaca disbursement.stage alur lama, sehingga paket baru tetap di Dasar walaupun butir telah disetujui. Alur baru kini memakai status paket, dokumen dari revisi pengajuan terkini, kelengkapan berkas, penerimaan tanda tangan, dan paidAt. Label: Isi pengajuan ? Siapkan dokumen ? Kirim pengajuan ? Pemeriksaan PF ? Tanda tangan ? Pembayaran ? Dana dibayar. Persetujuan beberapa butir tidak memindahkan paket ke tanda tangan sebelum status keseluruhan selesai. Kembali ke tab lama tidak memundurkan paket menunggu pemeriksaan. Alur legacy tetap menggunakan STAGES sebelumnya.

QA browser Sorong setelah pengguna mengajukan: tahap aktif Pemeriksaan PF, tiga langkah terdahulu bertanda centang, judul tahap sama. Tidak ada persetujuan/pembayaran dibuat oleh QA ini. Build belum diulang.

### Snackbar penyimpanan (1 Oktober 2026)

Pesan sukses pengajuan, termasuk autosave Data Program, tampil sebagai snackbar di bawah layar. Animasi masuk/keluar 200 ms, hilang otomatis setelah 4 detik, tombol tutup tersedia. Preferensi reduced motion menonaktifkan animasi. Kesalahan dan panduan validasi tetap tampil di form. QA browser pada Data Program Fakfak: autosave memunculkan snackbar dengan posisi fixed, tombol tutup tampil, pesan hilang otomatis, isi nama program tetap sama setelah normalisasi spasi. Tidak menjalankan build/test terminal atau push.

### Input tetap aktif saat simpan draf

`CampusJourney` membedakan simpan draf dari operasi lain. Input teks/tanggal dan pilihan rekening tetap aktif saat menyimpan; file dan tindakan lanjutan tetap menunggu request selesai. Snapshot yang dikirim dibandingkan dengan isian terkini ketika respons diterima: field yang berubah selama request tidak ditimpa respons lama. Jika masih ada perubahan, Data Program mengantre autosave berikutnya; pesan sukses hanya tampil setelah semua isian terkini tersimpan. RAB sudah mempertahankan snapshot alokasi dan membolehkan input saat autosave; snackbar RAB diberi transisi yang sama dan menghormati reduced motion.

Pemeriksaan browser awal terinterupsi oleh navigasi pengguna/dialog pilih file. Belum dijadikan bukti lulus. Skrip pemeriksaan berlatensi `scripts/qa/autosave-editing.playwright.js` tersedia untuk tool browser; mengubah nama sementara lalu memulihkan. Jangan jalankan pada tab yang sedang dipakai mengetik oleh pengguna.

Pemeriksaan lanjutan berhasil pada context browser terpisah, akun Universitas Pertamina: request autosave ditahan 1,2 detik; input tetap aktif selama request; ketikan kedua tidak ditimpa respons pertama; autosave berikutnya menyimpan ketikan terkini dan tetap terlihat setelah reload. Nama sementara dikembalikan ke nilai awal. QA ini memverifikasi autosave Data Program; Administrasi/PKS memakai fungsi save bersama, diperiksa melalui kode. RAB mempertahankan mekanisme autosave lama; animasi snackbar ditambahkan tanpa mengubah alokasi.
