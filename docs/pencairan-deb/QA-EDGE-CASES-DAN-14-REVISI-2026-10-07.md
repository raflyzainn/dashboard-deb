# Perbaikan edge case dan pemeriksaan 14 revisi — 7 Oktober 2026

Lingkungan: frontend `http://127.0.0.1:5176`, PocketBase lokal 8097. Pemeriksaan memakai tool Playwright, konteks terpisah, Admin PF lokal dan akun kampus QA 903/904. Perubahan data hanya pada pengajuan sintetis Kampus QA Lokal 2; QA3 dipakai untuk logout. Sesi browser pengguna dipertahankan. Tidak melakukan transfer bank nyata, perubahan production, commit, atau push.

## Hasil 14 revisi

| No. | Hasil pemeriksaan saat ini |
|---|---|
| 1 | Browser: ganti provinsi mengosongkan kabupaten; pilih Jakarta → Jakarta Selatan → Tebet → Tebet Timur menghasilkan kode pos 12820. |
| 2 | Browser: alamat lengkap dapat diedit. Reload dan respons workspace mempertahankan alamat manual dan kode pos manual 12821. |
| 3 | Browser: judul program dikosongkan sementara, navigasi ke RAB tetap berhasil; judul kemudian dipulihkan. Kelengkapan tetap diperiksa saat submit. |
| 4 | Browser: unduh template berhasil. Workbook memiliki Petunjuk sebagai sheet pertama, RAB 100%, Contoh Pengisian, Ringkasan. Pemeriksaan isi menemukan petunjuk dan lembar contoh. |
| 5 | Browser: item hasil upload diedit manual, autosave dan reload mempertahankan nama baru. |
| 6 | Browser: impor memperbarui harga item lama dan menambah Total station; impor ulang berkas sama tetap dua item. |
| 7 | Browser: tabel alokasi Termin 1/2 dapat digunakan; nominal tersimpan Rp10.800.000 dan Rp9.200.000, total Rp20.000.000. Navigasi saat alokasi belum tersimpan memunculkan konfirmasi. |
| 8 | Browser: label Foto Buku Rekening tampil, menerima PDF/PNG/JPG. Input terkunci di luar lingkup revisi. |
| 9 | Browser: Administrasi membuka submenu Rekening Penerima, Penandatangan Kampus, Identitas Surat dan Kop, PKS, Dokumen. |
| 10 | Browser dengan respons GET disimulasikan nomor PF kosong: placeholder “masih menunggu surat dari PF” tampil. Pemeriksaan kode menemukan kelanjutan tanpa nomor PF dan permintaan/notifikasi PF. **Pengiriman notifikasi PF pada pengajuan baru tanpa nomor belum diuji ulang end-to-end hari ini**; tidak mengubah nomor PF pengajuan yang sudah disetujui hanya untuk QA. |
| 11 | QR aktual diekstrak dari DOCX hasil endpoint dan diperiksa visual: tanpa logo PF. Pemindaian kamera fisik belum diuji. |
| 12 | Browser: empat pratinjau PDF PKS/permohonan/invois/kuitansi tampil dari dokumen hasil pengajuan. Unduhan PDF PKS berhasil, 5.064.831 byte. |
| 13 | Browser/API: hanya Program, RAB, PKS yang dibuka pada putaran revisi ini. Perubahan rekening di luar lingkup ditolak 400. Kirim perbaikan berhasil, dokumen dibuat ulang, seluruh input kembali terkunci. |
| 14 | Browser: permintaan edit beralasan menunggu persetujuan admin, kemudian hanya bagian yang disetujui terbuka. API tanpa alasan ditolak 400; revisi usang ditolak 409. |

Tidak ditemukan regresi pada skenario yang dijalankan. Tabel ini bukan klaim bahwa seluruh kombinasi data, notifikasi, perangkat, dan production telah diuji.

## Perbaikan yang diterapkan

- Unggahan memeriksa signature isi dan ekstensi; MIME dinormalisasi. Office ZIP dibatasi sebelum dekompresi: maksimal 1.000 entri, 16 MiB per entri, 32 MiB total; macro ditolak. Unduhan menambahkan nosniff/CSP sandbox, Office/CSV sebagai attachment.
- Key objek unggahan/lampiran memakai UUID. Upload versi, pemeriksaan, isian, flag penerimaan, lampiran dan pembayaran memakai transaksi database bersama audit dan pemeriksaan revisi pada jalur layanan yang diubah.
- Guard pembayaran berlaku di layanan bersama, memeriksa pemeriksaan dokumen, tanda tangan/asli, sumber terbaru dan komposisi lampiran. Pembayaran menyertakan expectedRevision; retry identik tidak membuat pencatatan ulang. Audit dan notifikasi pembayaran masuk batch yang sama.
- Pengajuan berbayar menolak mutasi dokumen, revisi, RAB dan lampiran di batas API; transaksi layanan utama memeriksa ulang lock. Kebijakan koreksi pembayaran/bukti transfer admin tetap ada.
- Unggahan tanda tangan terikat sumber generated terbaru; unggahan baru menghapus flag asli diterima. Lampiran memakai versi aktif dan memeriksa ulang sumber setelah PDF dirakit, sebelum batch disimpan. operationId membuat retry lampiran idempotent.
- Tanggal kalender tidak nyata ditolak. Nama item grid lama tidak dianggap total hanya karena awalan Total/Jumlah; identitas subkegiatan dipertahankan pada impor datar.
- Logout gagal menampilkan error tanpa berpura-pura mengakhiri sesi; cookie dibersihkan sebelum revokasi backend. Konversi PDF memiliki batas antrean/ukuran/halaman dan timeout pada pemuatan/render utama.
- Ditemukan regresi akses Notifikasi kampus: tautannya tersedia tetapi allowlist layout mengalihkan ke Beranda. Rute notifications ditambahkan ke allowlist yang sudah ada.

## Bukti alur akhir dan edge case

1. HTML bernama palsu.pdf ditolak di UI dengan pesan isi tidak sesuai ekstensi. PDF sintetis dengan MIME kiriman text/html diterima sebagai application/pdf untuk empat surat.
2. Seluruh sepuluh butir disetujui melalui UI admin; empat pindaian diterima; empat asli dicatat diterima.
3. Simpan lampiran melalui UI: HTTP 201, tujuh halaman, nomor 1, id `8c4809490cd94a5`, SHA-256 `7d8760b55877ccfaf103f765adb6e1f24b9842208bbbf56d82e33ed232a212a5`. Retry operationId sama dua kali tetap satu lampiran.
4. Pembayaran simulasi Rp10.800.000, tanggal 2026-10-07, referensi QA-SIMULASI-20261007 tampil sebagai Sudah dibayar. Kampus setelah reload melihat Dana dibayar dan proses selesai. Retry identik dengan revisi 189 mengembalikan 200; referensi berbeda dari revisi sama mengembalikan 409. Revisi akhir tetap 190.
5. Sebelum tanda tangan/lampiran lengkap, pembayaran tanggal valid ditolak 400. Tanggal 2026-02-31 ditolak 400.
6. Setelah dibayar, PATCH pengajuan serta POST dokumen/lampiran ditolak 409. Tanpa sesi, GET workspace mengembalikan 401; API health 200. Pemeriksaan isolasi kampus saat audit awal menghasilkan 403 untuk workspace/RAB kampus lain.
7. Logout dengan respons 500 simulasi: sesi dipertahankan, pesan kegagalan terlihat. Setelah intersepsi dilepas, logout normal dan reload kembali ke /login.
8. Beranda desktop 1280×720 memiliki scrollHeight 720; mobile 390×844 memiliki scrollWidth 390. Breadcrumb Beranda tetap tersedia dari Pencairan Dana.
9. Parser grid diperiksa di browser setelah perubahan terakhir: dua item Total station/Jumlah material terbaca tanpa masalah, subtotal tidak masuk item.
10. Setelah perbaikan allowlist, `/campus/notifications` benar-benar terbuka, breadcrumb Notifikasi tampil dan satu notifikasi pembayaran simulasi hari ini terlihat. Dua notifikasi nomor PF yang terlihat bertanggal 6 Oktober; itu bukti historis, bukan pengiriman ulang hari ini. Retry pembayaran tidak menambah notifikasi pembayaran kedua.

Bukti lokal di `output/qa-edge-2026-10-07/`: Template_RAB_DEB.xlsx, PKS-QA.pdf, campus-documents.png, campus-mobile.png, admin-paid.png, qr-actual.png. Artefak berada pada direktori output yang tidak dilacak Git.

## Batas dan tindak lanjut sebelum rilis

- Tidak menjalankan tes terminal, check, lint, atau build sesuai AGENTS.md. Kasus regresi ditambahkan pada tests/pencairan-edge-cases.test.ts dan logout.test.ts, **belum dieksekusi**. Tidak ada klaim build atau test suite lulus.
- QA ini memakai PocketBase lokal; bukan bukti dummy/build development atau deployment production. Server dummy terpisah sempat dicoba tetapi port tidak dapat diakses dan proses dihentikan.
- Belum menguji dua admin secara simultan, storage/DB gagal di tengah operasi, Office zip bomb aktual, PDF terenkripsi/rusak, jaringan lambat, beban besar, atau pergantian role saat sesi aktif. Pemeriksaan konflik revisi memakai request berurutan.
- Transaksi lampiran/unggahan dapat menyisakan objek storage tanpa referensi apabila batch DB gagal; objek tidak terlihat sebagai arsip valid. Pembersihan objek yatim belum ditambahkan.
- Mutasi RAB lama dilindungi lock saat masuk API, tetapi seluruh operasi lama belum dipindahkan ke transaksi bersama. Konkurensi RAB lama versus pembayaran perlu QA khusus. Pembangkitan/verifikasi dokumen memiliki jalur penyimpanan lain yang belum seluruhnya atomik.
- Timeout PDF membatasi tahap asinkron utama; tidak menjamin penghentian pekerjaan CPU sinkron atau render browser yang sudah macet.
- Sebelum rilis, ulangi notifikasi PF nomor kosong end-to-end dan matriks gangguan/konkurensi pada staging yang menyerupai target. Tidak menjamin production bebas error.
