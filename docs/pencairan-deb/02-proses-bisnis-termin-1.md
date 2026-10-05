# 02. Proses bisnis Pencairan Termin 1

Fokus: 23 kampus gelombang pertama. **Semua masukan dan keluaran dikerjakan admin atas nama kampus** (mode admin). Peran keuangan untuk sementara digabung ke admin. Semua 40 kampus ada di sistem sejak awal; 17 kampus lainnya akan mengisi dokumennya sendiri di situs ini (mode kampus) setelah 23 kampus selesai (Q4).

## Aturan uang

```
Batas Termin 1   = Nilai Kegiatan SK x 70% (tepat, tanpa pembulatan)
Termin 1 diajukan <= Batas Termin 1 (lebih kecil diperbolehkan)
Termin 2         = Nilai Kegiatan SK dikurangi Termin 1 yang dibayar
```

- Nilai Kegiatan disalin dari SK, ditampilkan di setiap layar kampus, dan terkunci.
- Sen diperbolehkan (keputusan N1 B). Semua jumlah uang disimpan sebagai **bilangan bulat dalam sen**, bukan desimal. UNSIKA boleh mengajukan Rp52.292.405,90.
- Jika kanal bank tidak bisa mengirim sen, admin mengetik jumlah rupiah bulat sebagai Termin 1 diajukan dan sisanya otomatis masuk Termin 2 dengan aturan yang sama.
- Terbilang dihitung sistem, termasuk sen (contoh UNSIKA: "Lima Puluh Dua Juta Dua Ratus Sembilan Puluh Dua Ribu Empat Ratus Lima Rupiah Sembilan Puluh Sen").
- **Tanda untuk admin (Q3).** PKS menulis Termin 2 sebesar 30%. Bila Termin 1 diajukan di bawah batas, Termin 2 menjadi lebih dari 30%. Aplikasi menampilkan persentase sebenarnya di layar RAB dan di Buat dokumen, dan menahan Buat PKS sampai admin mencentang "Pasal Bantuan Dana sudah diperiksa". Contoh IPB: Termin 1 Rp50.110.400 (69,98%), Termin 2 Rp21.498.950 (30,02%).

## Alur tujuh tahap

| Tahap | Nama | Yang terjadi |
| --- | --- | --- |
| 1 | Dasar | Nilai Kegiatan dari SK. Profil DEB diisi admin (kampus hanya melihat) |
| 2 | Berkas masuk | Berkas diunggah ke slot dokumennya lewat web. Untuk 23 kampus ini kondisi awal dimuat satu kali dari belakang layar (lihat "Muat awal") |
| 3 | Periksa berkas | Berkas asli tampil di dalam halaman, isian diketik dari berkas, keputusan Sesuai atau Perlu revisi dengan catatan |
| 4 | RAB disetujui | Total RAB sama dengan Nilai Kegiatan, alokasi Termin 1 tidak melebihi batas. Tahap ini mengunci nominal Termin 1 |
| 5 | Rekening dan surat kuasa | Isian dicek ulang, nama dibandingkan, lalu dicek ke bank |
| 6 | Buat dokumen | PKS (standar atau khusus), Surat permohonan, Invois, Kuitansi dibuat dari data yang sudah diperiksa, dengan pratinjau langsung. Dicetak, ditandatangani, dipindai, diunggah, diperiksa |
| 7 | Ekspor lampiran | Satu PDF per kampus. **Ini penutup Termin 1** |

Sesudah Termin 1 (dikerjakan belakangan): LPJ, lalu Termin 2, lalu sisi kampus untuk 40 kampus.

Alasan urutan: surat dibuat di tahap 6, bukan di awal, karena memerlukan nominal yang sudah benar, rekening yang sudah dicek, dan nama yang tepat.

## Muat awal (satu kali, bukan fitur aplikasi)

Lembar review dan 156 berkas **dimuat satu kali langsung ke backend lewat skrip**, dijalankan Claude setelah ada aba aba. **Tidak ada layar impor lembar review di aplikasi**, karena setelah itu semua pekerjaan terjadi di web.

Aturan pemetaan (keputusan K3 A): centang berarti Sesuai; catatan "Sesuai" tanpa centang masuk antrean Perlu konfirmasi; catatan berisi temuan menjadi Perlu revisi; tanpa catatan dan tanpa berkas menjadi Belum ada. Setiap catatan reviewer menjadi entri riwayat pertama dokumennya. Lima nama kampus disesuaikan ke ejaan SK. ITB dilewati. Setiap berkas kampus menjadi versi 1 slotnya.

Yang tetap menjadi fitur aplikasi: impor dan ekspor **templat Excel RAB** (dokumen 06).

## Tujuh dokumen, asal berkas, isian, dan pemeriksaan

Setiap unggahan disertai isian yang diketik dari berkas sambil berkas terbuka di sampingnya. **Isian melekat pada versi berkas** (Q2): draf kampus dan surat buatan sistem masing masing menyimpan nilainya, dan slot menampilkan isian versi yang berlaku. **Nomor dan tanggal surat disimpan satu kali** sebagai properti pencairan di tahap 6 (Q1); versi buatan sistem mewarisinya sebagai isian, sehingga tidak ada yang diketik dua kali. Setiap nilai isian membawa tiga tanda: siapa yang mengisi, siapa yang mengecek ulang terhadap berkas, dan khusus rekening, siapa yang mengonfirmasi ke bank. Pengecekan ulang boleh oleh admin mana pun (P3 A); kedua nama dicatat, dan bila orangnya sama aplikasi menandainya.

| Dokumen | Asal berkas | Isian yang menyertai | Pemeriksaan sistem |
| --- | --- | --- | --- |
| Perjanjian (PKS) | Dibuat sistem, lalu pindaian bertanda tangan | Nomor PKS Pertamina Foundation, nomor PKS kampus, tanggal perjanjian, pejabat penandatangan dan jabatan, templat standar atau khusus | Nilai bantuan sama dengan SK. Tahun program sesuai SK |
| RAB total dan RAB 70% | Unggahan, lalu dikelola per baris | Total RAB dan alokasi Termin 1 (dihitung dari baris) | Total sama dengan Nilai Kegiatan. Alokasi tidak melebihi batas |
| Surat permohonan | Dibuat sistem, lalu pindaian | Nomor surat, tanggal surat, nominal Termin 1, penandatangan | Nominal sama dengan Termin 1 diajukan |
| Invois | Dibuat sistem, lalu pindaian | Nomor invois, tanggal, nominal, rekening tujuan | Nominal sama. Rekening sama dengan buku rekening |
| Kuitansi | Dibuat sistem, lalu pindaian | Nomor kuitansi, tanggal, nominal, terbilang, bermeterai | Nominal dan terbilang cocok |
| Buku rekening | Unggahan (foto atau pindaian) | Nama bank, cabang, nama pemilik rekening, nomor rekening | Sama di semua dokumen. Dicek ulang. Dicek ke bank |
| Surat kuasa | Unggahan | Nomor dan tanggal surat, pemberi kuasa dan jabatan, nama penerima kuasa | Penerima kuasa mirip dengan pemilik rekening |

Tidak diketik dan tidak pernah ditampilkan di daftar: nomor KTP dan alamat rumah di dalam surat kuasa.

Draf Word yang sudah dikirim 23 kampus disimpan sebagai versi 1 (N6 A). Surat baru dibuat dari data.

## Status dan versi

- Status slot: Belum ada, Menunggu review, Perlu konfirmasi, Perlu revisi, Sesuai.
- Unggahan baru selalu membuat **versi baru**. Versi lama tidak pernah dihapus. Riwayat revisi selalu terlihat.
- Tiga penanda akhir per dokumen (K6 A): draf disetujui, pindaian bertanda tangan diterima, asli kertas diterima (dicentang).
- Revisi atau kosong berarti aplikasi meminta unggahan.

## Rekening dan surat kuasa (tiga pemeriksaan, dari yang termurah)

1. **Isian buku rekening** diketik sambil melihat pindaian buku rekening yang tampil di halaman yang sama (bisa beralih ke surat kuasa), lalu dicek ulang. Sistem memastikan nomor rekening di PKS, surat permohonan, invois, dan buku rekening sama.
2. **Pemilik rekening dibanding penerima kuasa** (N5 A): kedua kelompok nama diketik admin, sistem membandingkan dengan mengabaikan gelar, huruf besar, dan spasi, admin mengonfirmasi. Tidak ada pembacaan data KTP. Ketidakcocokan menahan tahap 6 sampai diperbaiki atau dilewati dengan alasan tertulis yang tercatat.
3. **Cek ke bank** (K5 A) oleh orang: ketik nama yang muncul di bank persis seperti tampil, unggah bukti bila ada, tandai Nama sesuai atau Nama berbeda.

## PKS dan surat lain (mail merge)

Hasil telaah `DRAFT PKS DEB.docx` dan 19 draf PKS kampus berformat Word:

- Templat punya 17 bidang kosong, perjanjian induk, Lampiran 1 Syarat dan Ketentuan Umum (10 pasal), dan Lampiran 2 Syarat dan Ketentuan Khusus (12 pasal). Nomor pasal adalah penomoran otomatis Word, jadi tidak ada di teks. Ada 160 paragraf teks hukum tetap.
- Judul 22 pasal. Lampiran 1: Definisi, Korespondensi, Kerahasiaan dan Jaminan, Hak atas Kekayaan Intelektual (HKI), Adendum, Force Majeure, Sanksi, Penyelesaian Perselisihan, Hukum yang Berlaku, Etika Kerja Sama. Lampiran 2: Maksud dan Tujuan, Objek dan Ruang Lingkup, Bantuan Dana, Jangka Waktu, Tata Cara Penyerahan Bantuan Dana, Pelaporan, Hak dan Kewajiban, Luaran dari Pelaksanaan Program, Larangan dan Sanksi, Pengakhiran Perjanjian, Perpajakan, Perwakilan Para Pihak.
- 11 dari 19 draf hanya mengisi bidang kosong. 5 draf (IPB, UBT, IVET, UNMUL, UNY, semuanya Tahun Kedua) berbeda pada satu paragraf Luaran, artinya pasal Luaran bervariasi menurut tahun program. UNDIP berbeda 29 paragraf, ITPB 11, UNTIRTA 4 (Jangka Waktu dan perpanjangannya, Tata Cara Penyerahan, Pelaporan, target Luaran). Tidak bisa dipastikan apakah itu permintaan kampus atau salinan templat lama.
- Templat menulis mati "Tahun Ketiga", nama penandatangan Pertamina Foundation, dan masa perjanjian. Ketiganya harus menjadi bidang.
- Pasal Luaran memuat target tiga tema (Wisata Energi, Pangan Berkelanjutan, Pesisir Modern); tema kampus dapat menentukan paragraf yang dicetak.
- 14 dari 19 draf masih membawa sorotan kuning. Dokumen buatan sistem tidak.

Asal nilai bidang gabungan:

| Asal | Bidang |
| --- | --- |
| SK | Nama perguruan tinggi, judul program, tahun program, nilai bantuan |
| Profil DEB | Alamat kampus, desa lokasi program, pejabat penandatangan dan jabatan, kop surat |
| Diisi bagian keuangan (saat ini admin) | Nomor PKS kedua pihak, tanggal perjanjian, nomor surat permohonan, nomor invois, nomor kuitansi |
| Hasil pemeriksaan | Termin 1 diajukan, bank, nama pemilik, nomor rekening |
| Pengaturan program | Penandatangan Pertamina Foundation, masa perjanjian, batas waktu laporan |
| Dihitung | Terbilang, 70% dan sisa, tanggal dalam huruf |

**PKS khusus per kampus (P1 A):** beberapa universitas meminta pasal khusus. Caranya: Pertamina Foundation menyunting salinan templat standar di Word, lalu mengunggahnya sebagai templat khusus kampus itu. Bidang gabungan tetap ada di dalamnya, sehingga PKS bisa dibuat ulang kapan pun data berubah. Aplikasi membandingkan templat khusus dengan templat standar dan menampilkan pasal mana yang berbeda. Perbandingan ini sudah dibuktikan berjalan pada 19 draf nyata.

**Pratinjau langsung:** Buat dokumen tidak langsung mengunduh. Properti diisi di kiri, dokumen sungguhan tampil di kanan dan digambar ulang setiap kali properti berubah. Nilai gabungan diberi warna lembut, isian yang belum ada ditandai merah dan disebut namanya. Tombol simpan dan unduh baru aktif setelah semua isian lengkap. Yang disimpan sebagai versi baru adalah persis yang dipratinjau. Hanya halaman Termin 1 yang dibuat.

## Ekspor lampiran (penutup Termin 1)

Syarat: semua dokumen berstatus Sesuai dan rekening sudah dicek ke bank. Urutan isi: lembar ringkasan (dibuat sistem), surat permohonan, invois, kuitansi, RAB total dan RAB 70%, salinan buku rekening, salinan surat kuasa dan PKS bertanda tangan. Satu PDF per kampus. PDF disimpan bersama daftar versi dokumen penyusunnya sehingga bisa dibuat ulang kapan saja. Tersedia juga rekap semua kampus.

## LPJ dan Termin 2 (nanti)

LPJ sederhana: **satu invois satu entri satu berkas pindaian** sebagai bukti, dengan memo. Barang di dalam invois tidak diketik ulang. Entri menunjuk ke bagian pohon RAB (biasanya sub kegiatan), jumlah menggulung ke atas. Termin 2 dibuka setelah LPJ Termin 1, dengan sisa dari Termin 1 ikut terbawa.
