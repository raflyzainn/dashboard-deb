# QA Pelaporan kampus — 14 Oktober 2026

## Pemeriksaan sebelum PR/MR

Atas permintaan publikasi pengguna, `npm run build` dijalankan pada worktree pelaporan dan berhasil exit 0 menggunakan adapter Cloudflare. Warning yang teramati: deprecation `punycode` pada Node lokal 25.5.0 (proyek menetapkan Node 22.x). `git diff --check` tidak melaporkan masalah whitespace. Test suite, check dan lint terminal belum dijalankan. Schema production belum diubah; migrasi aditif tetap diperlukan sebelum aktivasi fitur.

## Pratinjau admin dan menu akun terbaru

Admin melihat PDF langsung melalui FileViewer existing, MP4 melalui pemutar video, dan artikel teks secara langsung. Word memakai renderer DOCX existing. QA tool Playwright pada 5177 melihat dua iframe PDF, video readyState 4 tanpa media error, artikel teks terlihat, serta DOCX lengkap dirender satu halaman dengan teks fixture. Fixture DOCX awal yang tidak memiliki relationships gagal ditampilkan; berkas fixture lengkap berhasil. Kampus tidak mendapat viewer tambahan. Screenshot: `output/qa-pelaporan/admin-inline-previews.png` dan `admin-word-preview.png`.

Sesuai instruksi terakhir, Pencairan Dana dihapus dari dropdown akun kampus; akses tetap melalui kartu Beranda. QA dropdown sebelum/sesudah pembayaran memastikan menu Pencairan tidak ada, sedangkan kartu pencairan tetap ada. Pelaporan masih hanya muncul sesudah pembayaran. Menu admin tidak diubah. Tes/build terminal dan publikasi belum dilakukan.

## Beranda dengan grid kartu

Profil Program, Pencairan dan Pelaporan menggunakan desain yang sama: border, ikon, padding, judul dan ukuran tombol. Tiga kartu berdampingan pada desktop mulai lebar 1024 px; pada layar sempit kartu bertumpuk. Sapaan dibuat lebih ringkas dan lebar konten menjadi max-w-6xl.

QA Playwright pada 5177: Beranda kampus QA dibayar pada viewport 1366×768 memiliki scrollWidth 1366 dan scrollHeight 768, sehingga muat tanpa scroll. Mobile 390 px tidak memiliki overflow horizontal. Kampus QA belum dibayar tetap tidak memiliki tautan Buka Pelaporan. Tidak ada pageerror tercatat. Screenshot: `output/qa-pelaporan/beranda-grid-desktop.png` dan `beranda-grid-mobile.png`.

Tidak memakai tinggi paksa atau overflow hidden: mobile, viewport pendek, nama panjang atau daftar tugas legacy tetap dapat menggulir ketika dibutuhkan. Tes/build terminal dan publikasi belum dilakukan.

## Tampilan ringkas seluruh halaman

Arahan terbaru pengguna: seluruh halaman terlalu besar, perlu mengikuti tampilan halaman lain. Kartu keluaran sekarang memakai border ringan, judul/status kecil, metadata tanpa kotak bertumpuk, input 38 px dan tombol 36 px. Simpan/Kirim berada dalam satu baris. Format dan judul artikel berdampingan di desktop. Ringkasan LPJ menjadi satu panel dengan tiga kolom; tabel, form bukti, kondisi kosong dan penyelesaian memakai jarak lebih rapat. Tautan kembali admin yang berulang dihapus.

Navigasi Keluaran/LPJ menampilkan satu bagian setiap kali, berdasarkan hash URL, sambil mempertahankan komponen/form yang terpasang agar draf tidak hilang. Klik Keluaran menampilkan empat keluaran; klik LPJ menampilkan ringkasan/bukti/penyelesaian. Pada mobile, tabel bukti tetap dapat digeser dan memiliki petunjuk gulir.

QA tool Playwright pada port 5177: desktop 1366 px dan mobile 390 px diperiksa visual; lebar dokumen sesuai viewport. Form bukti dapat dibuka/dibatalkan, artikel teks berhasil disimpan, Kirim tetap terkunci untuk perubahan belum tersimpan dan aktif setelah save, tombol Selesaikan LPJ admin tetap nonaktif ketika ada bukti perlu revisi. Draf artikel dan nomor bukti tetap sama setelah berpindah bagian dua arah. Tidak ada pageerror tercatat.

Screenshot aktual: `output/qa-pelaporan/compact-output-desktop.png`, `compact-output-mobile.png`, `compact-lpj-desktop.png`, `compact-lpj-mobile.png`, `compact-admin-lpj.png`. Tes perpindahan bagian ditambahkan ke `tests/pelaporan.spec.ts`, belum dijalankan terminal. Tidak build, commit, push atau perubahan production pada penyempurnaan UI ini. Bagian navigasi terdahulu di bawah merupakan riwayat tampilan sebelum pemadatan seluruh halaman.

## Lingkungan

Branch `feat/pelaporan-kampus-20261014`, basis GitLab production `fa84daee78dbb0317a33b10e30820ed236663261`. Aplikasi worktree pada **localhost:5177**, PocketBase lokal 8097. Port 5176 tidak dihentikan. Tool Playwright mengendalikan Chrome terisolasi; bukan Playwright CLI. Semua mutasi QA memakai kampus khusus, bukan pembayaran kampus pengguna.

## Hasil browser dan API dalam konteks browser

| Kasus | Hasil yang diamati |
| --- | --- |
| Kampus dibayar masuk dari Beranda | Buka Pelaporan tersedia; empat form dan LPJ dimuat |
| Kampus belum dibayar | Halaman menjelaskan terkunci; POST laporan dan complete LPJ ditolak 409 |
| Kampus mengakses kampus lain | GET pelaporan ditolak 403 |
| Kampus memberi keputusan admin | PATCH Sesuai ditolak 403 |
| Artikel teks | Simpan draf, kirim, muncul di admin; isi terkunci saat menunggu |
| Artikel Word dan PDF | Kedua pilihan tersimpan sebagai versi baru, riwayat sebelumnya tetap tersedia |
| Laporan PDF dan infografis PDF | Unggah, simpan draf dan kirim berhasil |
| MP4 nyata | Fixture browser dapat diunggah; diperiksa ulang setelah penguatan struktur sample |
| Batas video | Fixture metadata 120 detik diterima 201; 120,01 detik ditolak 400. Uji batas metadata terpisah dari fixture video nyata berdurasi pendek |
| Artikel `.DOCX` huruf besar | Tersimpan 201 dan dapat dikirim tanpa perubahan palsu pada form |
| MP4 tanpa tabel sample | Ditolak 400 setelah penguatan validator |
| Unduh berkas kampus lain | Ditolak 403 |
| Berkas bukti LPJ versi lama | Unduh 200 setelah revisi |
| URL LPJ lama | Mengarah ke `/campus/pelaporan#lpj` |
| Notifikasi revisi LPJ | Keputusan 200 dan catatan muncul pada notifikasi kampus |
| Health server 5177 | HTTP 200 pada pemeriksaan akhir |
| PDF palsu | Nama/MIME PDF dengan isi lain ditolak 400 |
| Review/revisi artikel | Catatan admin tampil di kampus, versi perbaikan bertambah tanpa menghapus versi awal |
| Perubahan teks belum disimpan | Tombol Kirim dinonaktifkan dan petunjuk Simpan perubahan tampil |
| Simpan laporan bersamaan | Dua permintaan dengan expectedVersion sama menghasilkan 201 dan 409; hanya satu versi bertambah |
| Retry laporan | operationId yang sama menghasilkan 201 tanpa menggandakan versi |
| Storage lokal gagal | Simulasi direktori storage tidak dapat ditulis menghasilkan 503; path dipulihkan, versi aktif tetap sama dan berkas sebelumnya masih 200 |
| LPJ tambah/review/revisi | Bukti tersimpan, nominal tampil, catatan revisi bisa diperbaiki dan riwayat file tersedia |
| Retry bukti LPJ | Dua POST identik dengan operationId sama menghasilkan satu entri, bukan dua |
| LPJ pending | Tombol Selesaikan LPJ nonaktif |
| LPJ selesai | Setelah Sesuai dan aksi admin, tambah bukti ditolak 409 |
| LPJ dibuka kembali | Admin mengisi alasan; bukti dapat direvisi, kesiapan LPJ T2 dibatalkan |
| Complete vs tambah bersamaan | Tambah ditolak 409, complete 200; status akhir selesai dengan nol bukti pending dan t2Ready true |
| Empat keluaran Sesuai | Status pelaporan tahunan lengkap tampil di kampus |
| Versi baru setelah lengkap | Status kelengkapan kembali false, riwayat tetap ada |
| Mobile 390 px | Tampilan diperiksa visual; document scrollWidth 380, viewport 390; tidak melebar horizontal |
| Error JavaScript halaman kampus | Tidak ada pageerror yang tercatat selama sesi QA |

Screenshot lokal ignored: `output/qa-pelaporan/kampus-desktop.png`, `kampus-mobile.png`, `mobile-viewport.png`, `admin-desktop.png`. Folder yang sama menyimpan fixture video QA.

## Review kode dan perbaikan

Review independen menemukan risiko mengirim versi lama saat artikel sedang diedit, duplikasi retry LPJ, validasi video yang terlalu ringan, serta cakupan tes tertulis yang kurang. Perbaikan mencakup penjagaan unsaved, operationId/fingerprint LPJ, pemeriksaan sample MP4, ekstensi DOCX tanpa membedakan huruf besar/kecil, dan penambahan tes periode/gate/transaksi. QA terkait dijalankan ulang melalui tool browser sebagaimana tabel.

Kegagalan awal simpan draf ditemukan dan diperbaiki: konstruksi record audit/notifikasi harus merupakan record baru, bukan update record yang belum ada.

## Pemetaan Excel dan batas

- 1.7: akses Pelaporan setelah pembayaran T1.
- 9.1: empat keluaran terpisah dengan review/riwayat.
- 9.2 dan N5: upload laporan tersedia; form narasi terstruktur menunggu template pengelola.
- 9.3: PDF infografis tersedia; generator menunggu template resmi.
- 9.4: upload MP4 maksimal 40 MB/120 detik, tidak membuat video.
- 9.5: teks web, DOCX dan PDF.
- 9.6: LPJ transaksi terbuka setelah pembayaran, revisi/riwayat/penyelesaian tersedia.
- 9.7: empat keluaran Sesuai menentukan kelengkapan; tidak mengunci seluruh akun atau otomatis membuat pengajuan tahun berikutnya.
- 7.5–7.6: penyelesaian LPJ admin menjadi prasyarat T2; paket dokumen/pengajuan/pembayaran T2 penuh tetap di luar tahap ini.

Tes/check/lint/build terminal **belum dijalankan** sesuai AGENTS.md. Tes tertulis bukan klaim lulus. Tidak commit, push, PR, merge, deploy, maupun migrasi production. Batas ukuran maksimum dan konflik SK memiliki validasi/tes tertulis; jangan menyamakan pemeriksaan kode dengan seluruh kasus browser yang belum tercatat pada tabel. Pemeriksaan video tidak melakukan decoding frame; lihat runbook.

## Perbaikan navigasi bagian

Navigasi Keluaran program/LPJ memakai Button bersama, ikon, bingkai panel dan warna bagian aktif berdasarkan hash URL. Mobile menumpuk dua tombol agar label tetap utuh. QA Playwright pada 5177 memastikan klik LPJ mengarah ke #lpj, bagian berada 112 px di bawah atas viewport sehingga tidak tertutup header, dan lebar halaman 380 px pada viewport 390 px. Screenshot: output/qa-pelaporan/navigasi-desktop.png dan navigasi-mobile.png. Tes/build terminal dan publikasi tidak dilakukan untuk perubahan tampilan ini.


## Koreksi: satu halaman form

Arahan terakhir pengguna membatalkan pemisahan bagian. Keluaran dan LPJ kembali tampil bersama dalam satu halaman; tombol bagian hanya menavigasi hash/scroll. Tampilan ringkas dipertahankan. QA tool Playwright di 5177 memastikan kedua bagian tetap visible setelah klik LPJ. Tes tertulis diperbarui agar mengharapkan kedua bagian visible. Tes/build terminal dan publikasi tidak dilakukan.

## Susunan kolom file dan status

Tautan pindaian memakai ikon file, border ringan dan batas lebar; nama panjang dipotong visual dengan nama lengkap pada title dan teks tautan. Riwayat memakai susunan vertikal ringkas. Kolom Status menampilkan badge, catatan, lalu Button Perbaiki bukti dengan ikon edit. QA tool Playwright di 5177 memastikan tombol membuka form bukti QA-NOTIFIKASI yang benar dan tidak mencatat pageerror. Screenshot: output/qa-pelaporan/lpj-file-status-rapi.png. Tes/build terminal dan push belum dilakukan.

## Kartu dan menu sebelum pembayaran

Kartu Pelaporan di Beranda disembunyikan sampai paidAt terisi dan paidSen positif; grid memakai dua kolom sebelum pembayaran dan tiga sesudahnya. Dropdown akun memakai canReport dengan syarat pembayaran yang sama. QA Playwright pada 5177 memastikan kampus QA belum dibayar tidak memiliki kartu maupun menu Pelaporan; kampus QA dibayar memiliki keduanya. URL langsung tetap menampilkan penjelasan akses terkunci dan API tetap memeriksa pembayaran.
