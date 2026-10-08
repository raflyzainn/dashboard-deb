# QA ulang 14 revisi setelah merge

## Lingkungan

- Kode lokal `099e527e362e94ce861b8c6604b8e63bd5aebee6`, sama dengan referensi `origin/development` yang tersedia saat pemeriksaan. Nama branch lokal masih `fix/pencairan-progress-label`; tidak berpindah branch untuk QA.
- Frontend `http://127.0.0.1:5176`, PocketBase lokal 8097. Playwright Node dengan Chrome terlihat sesuai izin pengguna sebelumnya.
- Kampus QA1/QA2/QA3 dengan data sintetis. QA1 melewati alur baru sampai pembayaran simulasi Rp12 juta; QA2 untuk request edit dan perubahan PF; QA3 untuk arsip PDF dan paid lock. Tidak ada transfer bank nyata atau perubahan production.
- Tidak menjalankan build, lint, type check atau test suite. Tidak commit/push/PR pada pekerjaan QA ini.

## Hasil 14 poin

| Poin | Hasil skenario ulang |
| --- | --- |
| 1 | Lulus: provinsi, kabupaten/kota, kecamatan, desa dan kode pos 12820; perubahan provinsi mereset pilihan turunan. |
| 2 | Lulus: alamat lengkap dibuat setelah memilih desa; edit manual alamat/kode pos bertahan setelah reload. |
| 3 | Lulus: Program kosong dapat dilanjutkan ke RAB. Pengajuan akhir yang belum lengkap tetap ditolak. |
| 4 | Lulus: template resmi memiliki Petunjuk aktif pertama, RAB 100%, Contoh Pengisian dan Ringkasan. Contoh delapan item terbaca; template kosong tidak mengimpor contoh; format lama tetap diterima. |
| 5 | Lulus: input RAB dapat diedit manual, autosave dan reload mempertahankan isian; pindah menu menyimpan perubahan. |
| 6 | Lulus: item manual diperbarui oleh upload template asli, item baru ditambahkan. Upload ulang dan reload tetap dua item. Upload contoh delapan item berulang juga tetap sembilan item termasuk item manual; alokasi lama dipertahankan. |
| 7 | Lulus: tabel pembagian, pagination, batas jumlah negatif/pecahan/berlebihan, tombol semua ke Termin 2, penyimpanan alokasi dan viewport 390 px. |
| 8 | Lulus: Foto Buku Rekening, penolakan file lebih dari 2 MB dan format salah; pesan format menyebut PDF/PNG/JPG 2 MB. |
| 9 | Lulus: submenu Administrasi dapat dibuka dan digunakan untuk Rekening, Penandatangan, Identitas Surat/Kop, PKS dan Dokumen. |
| 10 | Lulus: pengajuan tanpa nomor PF berhasil, placeholder menunggu PF, notifikasi admin/kampus, pengisian PF dan pengiriman dokumen terbaru. Satu POST kirim perbaikan terbukti tersimpan setelah reload. |
| 11 | Lulus skenario QR: QR sumber asli dipertahankan di PDF, lookup valid, footer simulasi dipisahkan. Pemindaian kamera belum diuji ulang. |
| 12 | Lulus: empat preview/unduhan PDF kampus QA3 dan dokumen terbaru QA1; preview/unduhan admin PKS juga berhasil tanpa LibreOffice. |
| 13 | Lulus: revisi Program tidak mengizinkan perubahan rekening, kirim tanpa perubahan ditolak, ringkasan menyebut Program dan kirim ulang berhasil. Data setelah pembayaran terkunci di UI/backend. |
| 14 | Lulus: alasan wajib, pending tetap terkunci, duplikat/approval oleh kampus ditolak, penolakan wajib catatan, ajukan ulang, approval hanya bagian diminta. Tiga submenu Administrasi diuji terpisah; edit/upload submenu lain ditolak. Kirim perbaikan selesai dan status menunggu. |

Identitas merge RAB adalah Kategori + Sub Kategori + Nama (normalisasi huruf besar/kecil dan spasi). Nilai pada Excel terakhir menggantikan jumlah/satuan/volume/harga item yang cocok. Item yang tidak terdapat pada Excel tetap ada. Upload file awal setelah pembaruan mengembalikan Qty 10 sesuai isinya; tidak menjumlahkan menjadi 15 atau menduplikasi baris.

## Alur kampus dan admin

Mengisi Program dan lokasi, RAB dan alokasi 60/40, rekening/foto, penandatangan, surat/kop dan PKS melalui UI; membuat dokumen; mengajukan tanpa nomor PF; admin melengkapi PF; kampus mengirim ulang; admin menyetujui dokumen. Pembayaran masih terkunci sebelum tanda tangan/asli/lampiran lengkap. Kampus mengunggah empat PDF tanda tangan QA, admin mencatat empat asli dan lampiran lalu pembayaran simulasi. Referensi pembayaran bertahan setelah reload; permintaan edit setelah paid ditolak.

Pembayaran Termin 2 tetap ditahan: menu tidak muncul dan URL daftar lama dialihkan. Pembagian RAB Termin 2 tetap tersedia sesuai poin 7.

## Bukti lokal

Bukti berada di `.qa/development-recheck-099e527/`, tidak ikut publikasi:

- `address/results.json`: alamat otomatis/manual, kode pos dan reset, submenu.
- `onboarding-final/results.json`: autosave empat formulir, navigasi/reload, tanpa panel global, pengajuan belum lengkap.
- `rab-template/results.json`: template, gabungan sembilan item, upload ulang, pagination/mobile dan alokasi tersimpan.
- `rab-real/hasil-qa.json`: manual Panel 10 unit, template memperbarui menjadi 5 unit dengan harga Rp3 juta, menambah Baterai satu unit Rp5 juta; tetap dua item setelah upload ulang/reload.
- `submenu/results.json`, `request-reject/results.json`: scope, guard, alasan/penolakan/approval dan penguncian ulang.
- `final-findings/results.json`: revisi Program, format rekening, label/pembagian dan Termin 2 tersembunyi.
- `pdf-proof/results.json`, `admin-pdf/results.json`: QR, paid lock, kop PDF ditolak dan preview/unduh admin.
- `full-ui-final/results.json`, `final-ui/results.json`, `pf-resubmit/results.json`, `payment/results.json`: pengisian, notifikasi PF, respons submit yang selesai, pembayaran dan paid lock.
- Smoke `scripts/qa/browser-document-pdf.playwright.mjs` dijalankan untuk campus-904 dan campus-901: PKS 17, permohonan 2, invois 1, kuitansi 1 halaman; exit 0. Bukti `.qa/browser-document-pdf/` terakhir milik QA1.

Tidak ada pageerror pada hasil akhir skenario yang lulus.

## Catatan pengujian dan batas

- Beberapa percobaan awal timeout karena checkpoint dummy mengandalkan IndexedDB, indikator simpan sementara, atau nilai QA yang sama dengan nilai tersimpan. Checkpoint disesuaikan ke PocketBase dan nilai baru, lalu diulang. Hasil awal tersebut bukan dasar klaim lulus.
- Skrip awal pengiriman PF/request edit terlalu cepat menutup browser. Pengujian ulang menunggu respons POST submit, pesan pengajuan terkirim, dan data setelah reload. Satu pengiriman berhasil; tidak ditemukan bukti bahwa aplikasi mewajibkan dua kali kirim.
- Simulasi kegagalan simpan tidak berhasil mengintersep API lokal. Retry saat jaringan benar-benar gagal tidak dibuktikan ulang pada sesi ini. Pemeriksaan engine dummy-only juga tidak dijalankan.
- PDF berupa gambar halaman, belum selectable/searchable. PKS 17 halaman dan permohonan 2 halaman pada fixture; kesetaraan cetak Word dan kamera QR tidak dibuktikan. Ini batas hasil PDF, bukan kegagalan unduhan.
- Pengujian ini tidak menjamin semua kombinasi data atau production bebas bug. Tidak ditemukan kegagalan fungsional baru pada skenario akhir 14 poin dan alur Termin 1 yang dijalankan.
