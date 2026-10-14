# QA alur lokal — 1 Oktober 2026

> Keputusan terbaru: pengguna meminta tambahan LPJ dihapus karena bukan bagian revisi rapat. Akses/menu/tombol/panduan LPJ kampus lokal dan forwarding API LPJ telah dicabut; petunjuk setelah pembayaran menyatakan Tahap 1 selesai. Uji LPJ di bawah adalah catatan historis, bukan fitur aktif pengajuan lokal. Kuitansi pencairan PF tetap dipertahankan.

## Pemeriksaan ulang setelah penghapusan LPJ

Dilakukan melalui tool browser pada salinan lokal yang tersisa; tidak membuat ulang kampus QA atau mengubah isian kampus asli.

- **40 kampus:** GET kartu pencairan dan daftar lampiran berhasil seluruhnya, 0 kegagalan dari 80 request. Sebanyak 17 kampus memakai pengajuan baru; 16 draf dan Sorong selesai review.
- **8 layar admin:** Dashboard, Tahap 1, Periksa, PKS, RAB, Tanda tangan, Lampiran, Pembayaran Sorong terbuka tanpa alert, pageerror JavaScript, atau respons 500 selama pemeriksaan.
- **8 layar kampus Sorong:** Beranda, Panduan, Data Program, RAB, Administrasi, PKS, Ringkasan, unggah PKS bertanda tangan terbuka tanpa alert/pageerror. Ringkasan mobile 390 px tidak meluber secara horizontal.
- **4 DOCX Sorong:** PKS 785.339 byte, permohonan 185.978 byte, invois 131.779 byte, kuitansi 119.601 byte; respons 200, tipe DOCX dan signature ZIP benar. Ini pemeriksaan unduhan, bukan render Microsoft Word.
- **3 ekspor RAB Sorong melalui tombol UI:** penuh 8.804 byte, Termin 1 8.680 byte, Termin 2 8.566 byte; file XLSX berisi ZIP, nama unduhan sesuai. Nominal ekspor pernah diverifikasi pada QA awal; pada pemeriksaan ulang ini yang diperiksa adalah unduhan dan struktur file dasar.
- **Pembatasan:** akses kampus Sorong ke pengajuan kampus lain 403; mencatat pembayaran sebagai kampus 403; mencoba mengubah field PF dengan revisi terkini ditolak dengan pesan hanya admin. Tidak ada data asli berubah akibat percobaan itu.
- **Kampus baru Universitas Pertamina:** Data Program, RAB, Administrasi, PKS, Ringkasan terbuka tanpa alert; pengajuan kosong tetap draf dan Ajukan untuk diperiksa nonaktif, dengan daftar syarat yang belum terisi.
- **LPJ dihapus:** menu/panduan kampus tidak muncul; URL kampus LPJ diarahkan ke Beranda; endpoint LPJ pengajuan lokal tidak tersedia.

Temuan tambahan: detail Tahap 2 admin masih menautkan LPJ lama yang menghasilkan 405. Tautan itu dihapus pada mode lokal, dan teks daftar/detail Tahap 2 diperjelas sebagai ringkasan dengan pengajuan/pembayaran belum tersedia. Browser membuka ulang detail: 0 tautan LPJ, 0 alert, pesan batas fitur terlihat.

Pemeriksaan ulang minimum ada di `scripts/qa/pengajuan-local-regression.playwright.js`. Build/check/test terminal tetap belum dijalankan; tidak ada push pada pekerjaan ini. Hasil ini membuktikan jalur yang disebutkan, bukan jaminan aplikasi bebas semua kemungkinan bug.

## Lingkungan dan cakupan

Aplikasi `http://127.0.0.1:5176`, PocketBase salinan lokal `8097`, branch `feat/pencairan-pocketbase-local`. Semua nominal pembayaran berikut adalah catatan simulasi; tidak ada transfer bank nyata. QA dilakukan lewat tool browser, bukan runner terminal. Build/check/test terminal tidak dijalankan pada pekerjaan ini. Perubahan ini belum di-commit/push.

QA ulang memakai kampus baru **Kampus QA Lokal 3** (`32859b9c98494e7`, akun `campus-904`), sehingga data Sorong tidak ditimpa. Setelah QA, pengguna meminta semua kampus dan akun QA dihapus. Catatan ini mempertahankan bukti hasil sebelum pembersihan.

## Alur yang benar-benar diulang melalui UI

| Langkah | Peran dan tindakan | Hasil yang diperiksa |
|---|---|---|
| 1 | Kampus membuka SK, lanjut Data Program | SK simulasi Rp20 juta terbaca; data awal profil terisi |
| 2 | Kampus mengubah judul dan kecamatan | Debounce menyimpan tanpa tombol; judul tetap sama setelah reload |
| 3 | Kampus mengunggah `01_RAB_10_Unit.xlsx` | RAB 100% Rp20 juta terbaca; tiga tombol ekspor tersedia |
| 4 | Kampus membagi empat item | Pecahan 1,5 dan total 100% pada Termin 1 diblokir; alokasi 6 dari 10 menghasilkan Rp12 juta/Rp8 juta; bertahan setelah reload; kembali ke Termin 1 berhasil |
| 5 | Kampus mengisi administrasi, mengunggah rekening dan kop | File tersimpan; rekening kampus tidak memerlukan kuasa |
| 6 | Kampus meminta nomor PKS PF; admin mengisinya | Kampus QA 3 muncul di panel tugas dashboard; nomor simulasi PF tersimpan |
| 7 | Kampus mengisi nomor PKS kampus, menyiapkan semua dokumen | Tanggal PKS tetap 17 Juni 2026; PKS, permohonan, invois, kuitansi dibuat dan dipratinjau di kartu masing-masing |
| 8 | Kampus mengirim pengajuan | Timeline sebelum kirim **3/Kirim pengajuan**, setelah kirim dan reload **4/Pemeriksaan PF** |
| 9 | Admin menyetujui PKS, RAB 100%, RAB 70%, RAB 30%, permohonan, kuitansi, invois, rekening | Rekening memerlukan nama yang terlihat di bank; 10/10 selesai, timeline kampus **5/Tanda tangan** |
| 10 | Kampus mengunggah empat PNG bertanda `SIMULASI QA LOKAL — BUKAN DOKUMEN RESMI` melalui UI signed | Empat respons unggah 200; timeline **6/Pembayaran**; pemilik tindakan menjadi PF |
| 11 | Admin menandai empat asli diterima, membuka pratinjau dan menyimpan lampiran | Operasi 200; lampiran versi 1 tersimpan; unduhan PDF 200, 73.707 byte |
| 12 | Admin mencatat pembayaran simulasi Rp12 juta, 1 Oktober 2026, referensi `SIMULASI-LOKAL-QA3-TRANSFER-001` | Respons 200; setelah reload admin **Dibayar**, kampus **7/Dana dibayar**, `paidSen=1200000000`, `lampiranCount=1` |
| 13 | Kampus membuka LPJ, menambah bukti Rp100 ribu; admin menyetujui | Tersimpan, status Sesuai terlihat pada kampus setelah reload; sisa pertanggungjawaban Rp11,9 juta |
| 14 | Percobaan mengubah pengajuan yang sudah dibayar | Ditolak 409 dengan pesan pengajuan sudah dibayar terkunci |

Dashboard admin, daftar Tahap 1, daftar Tahap 2, dan antrean Periksa juga dibuka: data tampil dan tidak ada alert error. Pada QA Lokal 1, lampiran/pembayaran/LPJ juga berhasil, sebagai pemeriksaan tambahan sebelum uji ulang QA 3.

## Temuan dan perubahan

- Hook alur lokal menelan endpoint lampiran, pembayaran, dan LPJ sehingga menghasilkan 405. Ketiga keluarga endpoint sekarang menggunakan layanan PocketBase yang sudah ada.
- Pembacaan kartu alur lokal sebelumnya tidak memasukkan lampiran tersimpan. Snapshot sekarang membaca collection attachments untuk disbursement terkait.
- Pembayaran alur baru diblokir di UI dan server hingga dokumen asli serta lampiran siap. Tombol menunjukkan alasan dan tautan penyelesaian.
- Data revisi dan file pengajuan tidak ikut dikirim ke kartu timeline draf. Keduanya kini ikut dibaca, sehingga tahap Siapkan/Kirim dokumen dapat dihitung.
- Petunjuk setelah unggah tanda tangan dan pembayaran masih menyuruh tanda tangan. Kini petunjuk mengikuti keadaan nyata, termasuk tautan LPJ setelah dibayar.
- LPJ kampus dialihkan ke Beranda oleh whitelist halaman. Mode PocketBase lokal kini mengizinkan `/campus/lpj`. Tombol tambah bukti hanya muncul setelah pembayaran; server menolak LPJ alur baru yang belum dibayar dan bagian RAB dari kampus lain.
- Placeholder pemeriksaan nama rekening sebelumnya berbunyi “Bila berbeda”, padahal nama diperlukan saat menyetujui. Kini menjelaskan nama yang terlihat di bank.

## Cara membaca status Sorong

Pada pemeriksaan browser: semua butir Sorong sudah sesuai, tetapi empat dokumen memiliki `signedReceived=false`, `originalReceived=false`; lampiran 0; `paidAt` kosong. Timeline **Tanda tangan** benar untuk keadaan itu. Persetujuan 10/10 adalah selesainya review berkas, bukan bukti transfer.

Di kampus: buka Ringkasan, gunakan **Unggah bertanda tangan** pada PKS, permohonan, invois, kuitansi. Setelah keempat pindaian tersimpan, timeline menuju Pembayaran. Di admin: buka Tanda tangan, terima asli; buka Lampiran, pratinjau dan simpan; buka Pembayaran, isi tanggal/referensi dan catat. Sesudah pembayaran tercatat, kampus melihat Dana dibayar. Tombol Perbarui status/reload mengambil keadaan tersimpan.

## Pembersihan dan pintu masuk LPJ

Setelah QA, tiga kampus QA dan empat akun QA dihapus dari instance lokal, termasuk pengajuan, keputusan, RAB, lampiran, LPJ, notifikasi terkait dan 50 berkas objek yang tidak dipakai record lain. Penghapusan akun awalnya tertahan relasi wajib notifikasi; cleanup dilanjutkan setelah menyertakan `recipientUser`/campus/target notifikasi, lalu berhasil. Manifest disimpan lokal sebagai catatan pemulihan. Browser memastikan dashboard tersisa 40 kampus, 0 kampus QA, Sorong tetap ada; dropdown login 0 opsi QA.

Pintu masuk LPJ diperjelas: dropdown akun kampus lokal **Laporan Realisasi (LPJ)**, tombol di Beranda setelah pembayaran, tautan di petunjuk Pencairan Dana, dan kartu Panduan Aplikasi. Browser login Sorong lalu menekan menu LPJ berhasil membuka `/campus/lpj`; karena belum dibayar, tidak ada tombol Tambah bukti dan pesan syarat pembayaran tampil.

Pengguna mengklarifikasi lingkup: **LPJ tidak dibahas dalam 16 poin dan gambar revisi rapat.** Fitur LPJ berasal dari kode lama dan audit tambahan atas permintaan seluruh alur lokal, bukan persyaratan checklist revisi. Jangan menjadikan LPJ syarat kelulusan implementasi 14 poin rapat atau mengklaim penambahan menu LPJ berasal dari revisi tersebut.

## Batas yang belum selesai

**Pencairan Tahap 2 belum mempunyai alur transaksi lengkap.** `Tahap2Kartu.svelte` masih ringkasan baca saja; dokumen dan pembayaran Tahap 2 belum tersedia. Pembagian dan ekspor RAB Termin 2 tersedia, tetapi itu tidak sama dengan pembayaran Tahap 2. Karena itu, klaim “semua alur sampai Tahap 2 selesai” belum benar.

QA ini membuktikan alur Tahap 1 + LPJ di salinan lokal. Tidak membuktikan produksi, transfer bank nyata, render Microsoft Word/LibreOffice, ataupun build/check terminal. Skrip pemeriksaan ulang minimum: `scripts/qa/pengajuan-local-closing.playwright.js`, dijalankan lewat tool browser pada kartu lokal yang sudah dibayar; akun QA yang dibersihkan harus diprovision ulang sebelum mengulang uji mutasi.

## Revisi centang akhir dan bukti transfer opsional

Sesudah `paidAt` tersimpan, ketujuh langkah timeline kampus berwarna hijau dan dicentang, termasuk Dana dibayar. Persetujuan 10/10 saja tetap tidak dianggap pembayaran.

Admin membuka Pembayaran untuk mengunggah bukti transfer PDF/PNG/JPG maksimal 2 MB. Unggah dapat dilakukan sebelum atau setelah pencatatan pembayaran; bukti tidak menjadi syarat pembayaran. Kampus melihat tautan Lihat bukti transfer pada panel progres setelah dibayar. Jika admin belum melampirkan bukti, panel menjelaskan bahwa lampiran opsional belum tersedia.

Data menggunakan `disbursements.properties.paymentProof` dan penyimpanan privat yang sudah ada; tanpa collection baru. Endpoint `/api/pencairan/[campus]/pembayaran/bukti` memeriksa peran dan kepemilikan kampus. Validasi isi berkas dan revision mencegah berkas palsu serta penimpaan perubahan terbaru.

QA melalui tool Playwright pada Sorong lokal: unggah PNG simulasi berhasil; admin dan kampus membuka bukti dengan HTTP 200 image/png; semua tujuh langkah dicentang dan langkah terakhir hijau setelah reload. Unggah oleh kampus ditolak 403, format terlarang 400, revision lama 409. Berkas simulasi kemudian dihapus dari metadata dan penyimpanan; pembayaran asli lokal tetap tersimpan. Audit unggah simulasi dipertahankan sebagai riwayat QA. Pemeriksaan ulang: `scripts/qa/payment-proof.playwright.js`, melalui tool browser. Build/check/test terminal dan push tidak dijalankan.
