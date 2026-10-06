# QA development: 14 revisi dan alur pencairan

## Lingkungan dan metode

- Basis development `1048071`, aplikasi `http://127.0.0.1:5176`, PocketBase lokal 8097 dengan marker instance lokal.
- Playwright Node dengan Chrome terlihat, diizinkan eksplisit pengguna karena tool browser tidak tersedia. Pemeriksaan melalui interaksi UI, hasil yang terlihat, screenshot, dan request browser untuk memastikan larangan backend tidak dapat dilewati.
- Tiga kampus QA lokal dan akun alias campus-901/903/904 serta admin-1. Data sintetis, pembayaran simulasi Rp12 juta, bukan transfer bank. Data kampus pengguna dan production tidak diubah.
- Build, lint, check dan test suite tidak dijalankan. Tidak push, commit, atau membuat PR. Pemeriksaan minimum yang dapat diulang tersimpan pada `scripts/qa/browser-document-pdf.playwright.mjs` (default campus-904, dapat diatur dengan QA_CAMPUS_ALIAS; memerlukan pengajuan lengkap yang tidak berstatus revisi). Bukti lokal berada di `.qa/development-14points/` dan tidak termasuk publikasi.

## Hasil terhadap 14 poin

| Poin | Hasil | Bukti/perilaku |
| --- | --- | --- |
| 1 | Lulus skenario lokal | DKI Jakarta -> Jakarta Selatan -> Tebet -> Tebet Timur; kode pos 12820. Mengganti provinsi mengosongkan pilihan turunannya. |
| 2 | Lulus | Alamat lengkap disusun otomatis, dapat diedit, dan tersimpan setelah reload. Kode pos manual juga tersimpan. |
| 3 | Lulus | Data Program belum lengkap tetap dapat dilanjutkan ke RAB; submit akhir tetap memerlukan kelengkapan. |
| 4 | Lulus skenario template | Petunjuk menjadi sheet pertama, template memiliki contoh terisi dan ringkasan. Template kosong tidak mengimpor baris contoh. File contoh lama masih dapat dibaca. |
| 5 | Lulus | Baris RAB dapat diedit manual setelah upload, autosave dan reload mempertahankan hasilnya. |
| 6 | Lulus setelah perbaikan | Matching Kategori + Sub Kategori + Nama memperbarui item lama, menambah item baru, dan mencegah duplikasi pada upload ulang. Autosave/reload dan preservasi alokasi item yang tidak berubah diperiksa. Identitas ambigu ditolak tanpa mengubah tabel. |
| 7 | Lulus skenario yang diuji | Pemilihan termin berupa tabel ringkas, pagination, pembagian tersimpan; nilai negatif, pecahan untuk barang utuh dan jumlah berlebihan ditolak. Tampilan 390 px tidak melebar keluar halaman. |
| 8 | Lulus | Label kampus/admin menggunakan Foto Buku Rekening. Upload terlalu besar atau format salah ditolak. |
| 9 | Lulus | Administrasi memiliki submenu rekening, penandatangan, identitas surat/kop, PKS dan dokumen; dropdown mobile dapat digunakan. |
| 10 | Lulus skenario lokal | Nomor PF belum tersedia tidak menghalangi pengajuan kampus. Placeholder menunggu PF, notifikasi admin, pengisian PF dan notifikasi kampus diperiksa melalui UI. |
| 11 | Lulus visual | QR hitam putih tanpa logo PF. QR asli pada DOCX dipertahankan di PDF dan lookup verifikasi berhasil. Kamera ponsel belum diuji. |
| 12 | Diperbaiki dan lulus skenario lokal | Sebelumnya empat PDF HTTP 503 karena LibreOffice tidak tersedia. Sekarang empat preview/unduhan kampus dan preview/unduhan admin berhasil melalui converter browser. Tidak perlu LibreOffice server. |
| 13 | Lulus | Permintaan revisi Program hanya membuka Program; rekening tetap terkunci di UI/backend. Kirim tanpa perubahan ditolak. Kirim perbaikan mengunci kembali; versi bagian lain dipertahankan. |
| 14 | Lulus pada scope yang tersedia | Alasan wajib, pending belum membuka akses, reject memerlukan catatan, approve membuka bagian yang diminta, submit mengunci kembali. Setelah perbaikan: akses dibatasi per submenu Rekening, Penandatangan, atau Identitas Surat/Kop; edit/upload submenu lain ditolak backend. |

## Alur yang benar-benar diuji

1. Mengisi Program, lokasi, RAB dan pembagian termin, rekening/foto, penandatangan, identitas surat/kop dan PKS melalui UI.
2. Autosave, pindah menu, reload, kegagalan simpan yang disimulasikan dan retry: isian dipertahankan, navigasi ditahan ketika simpan gagal, tanpa popup simpan rutin.
3. Mengajukan tanpa nomor PF, admin menerima notifikasi, admin mengisi nomor, kampus menerima notifikasi dan mengirim kembali dokumen terbaru.
4. Revisi per bagian, request akses beralasan, penolakan/persetujuan dan penguncian kembali.
5. Admin memeriksa dokumen, kampus mengunggah empat PDF bertanda tangan, admin mencatat empat dokumen asli dan lampiran final, lalu pembayaran simulasi. Pembayaran sebelum persyaratan tersebut lengkap ditolak.
6. Sesudah pembayaran, data tidak dapat diedit dan request revisi ditolak backend HTTP 409. Penguncian diperiksa ulang setelah perubahan converter PDF.

## Perubahan pada sesi ini

- Menghapus panel global 'Lengkapi ... bagian sebelum membuat dokumen' sesuai permintaan pengguna. Validasi per bagian dan sebelum submit tetap ada.
- Menghapus pesan ukuran file inline yang duplikat. Batas 2 MB dan format berkas tetap divalidasi; error tampil di snackbar.
- Menghapus konversi LibreOffice server. Preview dan unduhan kampus/admin memakai converter browser yang sudah ada (docx-preview, html2canvas, pdf-lib), tanpa dependensi tambahan.
- Memisahkan footer simulasi dari dokumen lokal: converter mempertahankan QR asli, hanya mode mockup yang menggunakan footer simulasi.
- Label verifikasi diperjelas menjadi SHA-256 berkas sumber. Hash ini milik DOCX sumber, bukan byte salinan PDF browser.

## Temuan awal (historis; sudah diperbaiki kecuali fitur yang ditahan)

- Upload RAB dengan barang yang sudah ada masih menduplikasi: poin 6 belum memenuhi maksud revisi.
- Satuan numerik seperti `22` diterima parser. Tampilan `1 22` berarti kuantitas 1 dan satuan 22, sehingga mudah disalahartikan. Asal file pada screenshot pengguna belum terbukti; contoh resmi yang diperiksa tidak memiliki satuan numerik.
- Label RAB 70%/30% di sidebar tidak selalu sesuai alokasi aktual: skenario sah 60%/40% tetap berlabel 70%/30%.
- Ringkasan status pernah menyebut PKS perlu revisi sementara scope yang dibuka Program. Isian terkunci dan catatan revisi benar, tetapi ringkasan dapat membingungkan.
- Error format buku rekening dari backend menyebut format Word/Excel dan maksimum 40 MB secara umum, padahal kontrol buku rekening mengizinkan PDF/PNG/JPG maksimum 2 MB. Penolakannya bekerja, pesannya belum spesifik.
- Scope Administrasi membuka beberapa submenu sekaligus. Apabila revisi dimaksudkan per field atau per submenu, scope ini belum cukup rinci.
- Pembayaran lokal dapat dilanjutkan walaupun nomor PF kosong; perlu memastikan aturan bisnis apakah admin harus melengkapi nomor tersebut sebelum pembayaran. Ini bukan klaim bahwa aturan itu sudah disepakati.
- Tahap 2 baru ringkasan sisa dana, belum alur transaksi pembayaran Tahap 2. Ekspor RAB termin 2 bukan bukti alur pencairan kedua selesai.

## Perbaikan tambahan dan QA ulang

- Upload RAB diperbarui tanpa duplikasi menggunakan identitas Kategori + Sub Kategori + Nama. Huruf besar/kecil dan spasi berlebih tidak membuat identitas baru. Satuan/harga/jumlah merupakan nilai yang diperbarui; ID baris lama dipertahankan.
- Satuan numerik ditandai invalid dan ditolak sebelum pemeriksaan/import. Tabel pembagian menyebut Jumlah dan Satuan secara terpisah.
- Label sidebar/admin RAB Termin 1 dan Termin 2 menggantikan persentase tetap 70/30.
- Ringkasan revisi menggunakan scope aktual: Data Program ditampilkan sebagai Data Program. Parent Administrasi tidak ditandai revisi ketika hanya Program yang terbuka.
- Pesan unggah foto buku rekening kini menyebut PDF/PNG/JPG maksimum 2 MB, bukan daftar umum 40 MB.
- Request edit Administrasi dipisah per submenu sesuai persetujuan pengguna. Request lama ber-scope Administrasi kini dibatasi pada Rekening; perbandingan baseline lama memproyeksikan field rekening agar tidak menganggap penyempitan scope sebagai perubahan pengguna.
- Promise pratinjau kop memiliki penanganan error dan tidak melaporkan hasil setelah komponen ditutup. Pembatalan request akibat pergantian akun diklasifikasikan sebagai perubahan akun, bukan timeout koneksi. QA pergantian akun yang sebelumnya menghasilkan pageerror kini bersih.
- Pengguna membatalkan penambahan pembayaran Termin 2. Menu pencairan Tahap 2 disembunyikan; URL daftar/detail lama dialihkan ke Tahap 1/detail kampus. Tidak menambahkan endpoint pembayaran Termin 2. Pembagian RAB Termin 2 tetap bagian dari revisi RAB yang diuji.

Hasil Playwright Chrome terlihat:

| Bukti lokal | Hasil |
| --- | --- |
| `fix-findings/results.json` | Merge, upload ulang, autosave/reload, validasi satuan, pemisahan scope, menu/redirect Termin 2: lulus; pageerror kosong. |
| `submenu/results.json` | Request/approve ketiga submenu, penolakan backend untuk edit/upload submenu lain, perubahan di scope yang diizinkan dan kirim ulang: lulus; pageerror kosong. |
| `allocation-merge/results.json` | Upload ambigu mempertahankan data, alokasi item lama tetap 3/1 unit, batas 500 item sesudah merge: lulus; pageerror kosong. |
| `final-findings/results.json` | Ringkasan Data Program, pesan file spesifik, label termin dan pembagian RAB: lulus; pageerror kosong. |
| `pdf-proof/results.json` | QR asli/dummy, lock sesudah pembayaran, penolakan kop PDF dan pergantian akun: lulus setelah perbaikan; pageerror kosong. |

Ini QA perubahan lokal, bukan bukti deployment/transfer nyata. Saat QA awal belum menjalankan build atau publikasi; validasi sebelum PR dicatat di bawah.

## Validasi sebelum PR

- Sesuai izin publikasi pengguna, `npm run build` berhasil dengan exit 0 pada 6 Oktober 2026 (adapter-static). Warning: beberapa chunk client melebihi 500 kB setelah minification.
- `node scripts/qa/browser-document-pdf.playwright.mjs` diulang dengan Chrome terlihat: empat preview dan unduhan PDF berhasil, tanpa pageerror. PKS 17 halaman, permohonan 2, invois 1, kuitansi 1.
- `git diff --check` berhasil. Lint, type check, dan test suite tidak dijalankan.
- Basis lokal dan GitHub `origin/development` identik sebelum membuat branch PR (divergence 0/0).
- Aturan nomor PF wajib sebelum pembayaran belum disepakati; perilaku lama tidak diubah. Pembayaran Termin 2 ditahan dan disembunyikan sesuai permintaan pengguna.

## Bukti PDF setelah perbaikan

`browser-pdf/results.json`: empat preview dan empat unduhan kampus lulus, preview/unduhan admin lulus, pageerror kosong. Fixture menghasilkan PKS 17 halaman, permohonan 2, invois 1, kuitansi 1. Halaman hasil render diperiksa melalui screenshot; tidak ada halaman kosong pada skenario tersebut. QR polos tampil dengan URL verifikasi sumber.

`pdf-proof/results.json`: QA awal mencatat pageerror saat pergantian akun. Setelah penanganan promise kop dan pembatalan request diperbaiki, QA diulang dan tidak mencatat pageerror. QR asli dipertahankan, footer dummy terpisah, lookup QR berhasil, paid tetap terkunci, PDF untuk kop ditolak. Lookup arsip QA3 menyatakan versi lama setelah data pengajuan berubah; bukan bukti bahwa semua arsip adalah versi terbaru.

PDF browser berupa gambar halaman: teks belum selectable/searchable, dan tata letak mengikuti renderer browser. Fixture arsip QA3 masih memiliki placeholder kop pada sumber lama dan tanda tangan permohonan terpisah ke halaman kedua; converter mengikuti sumber tersebut, tidak menulis ulang arsip. Dokumen yang dibuat ulang dari isian lengkap perlu memakai sumber terbaru. Belum membuktikan kesetaraan cetak Microsoft Word, pemindaian QR kamera, atau deployment production.

## Penilaian dari sudut pengguna baru

Alur Tahap 1 dapat dijalankan dari pengisian sampai pembayaran lokal. Temuan duplikasi, label termin, ringkasan revisi, pesan format, dan scope submenu telah diperbaiki dan diperiksa ulang. Pembayaran Tahap 2 ditahan sesuai arahan terbaru pengguna. Ini audit operasional/UX melalui QA, bukan studi usability dengan pengguna baru sesungguhnya.
