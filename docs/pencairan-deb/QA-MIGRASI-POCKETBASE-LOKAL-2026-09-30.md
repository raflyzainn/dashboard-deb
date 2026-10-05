# QA migrasi pengajuan PocketBase lokal

Tanggal sesi: 30 September 2026. Branch: `feat/rab-dummy-all-campuses`.

## Kesimpulan dan batas bukti

Alur lokal diuji melalui tool Playwright pada aplikasi `http://127.0.0.1:5176` dengan PocketBase `127.0.0.1:8097`. Pengujian mencakup interaksi UI, permintaan API dari browser yang sudah login, pemeriksaan dokumen hasil unduhan, dan tampilan mobile. Temuan di bawah sudah diperbaiki dan skenario terkait diulang. Ini bukan klaim seluruh kemungkinan kasus atau kesiapan produksi.

Build, typecheck, lint, dan test suite terminal **belum dijalankan**, mengikuti AGENTS.md. Tidak ada commit, push, deploy, transaksi pembayaran, atau email nyata. Perintah maintenance migrasi/seed berhasil dijalankan ulang tanpa menambah field yang sudah ada; itu bukan hasil test suite.

## Perubahan yang diuji

- Mesin aturan pengajuan, parser Excel, alokasi, template dokumen, dan UI yang sudah ada digunakan kembali. Dummy dan PocketBase menggunakan mesin bersama, dengan penyimpanan masing-masing.
- Tidak ada collection baru. Empat field ditambahkan: `disbursements.submissionStatus`, `applicationData`, `rab_versions.campusStep`, dan `revision`.
- Data dibatasi berdasarkan kampus, bukan akun pengisi. Dua akun satu kampus menggunakan pengajuan yang sama.
- Mutasi memakai transaksi batch dan pemeriksaan revisi. Input lokal dipertahankan ketika server menolak perubahan yang kedaluwarsa.
- Data dokumen, versi berkas, riwayat pemeriksaan, catatan, dan rekening memakai collection yang sudah tersedia.
- Mode lokal membatasi alamat PocketBase dan lokasi instance, serta tidak memakai kredensial storage produksi.

## Matriks hasil browser

| Skenario | Hasil nyata |
| --- | --- |
| Login dua akun satu kampus | Akun 901 dan 902 melihat data kampus QA 1 yang sama dalam context terpisah. |
| Isolasi kampus | GET dan PATCH kampus QA 1 dari akun 903 ditolak HTTP 403. |
| Konflik dua pengisi | Perubahan pertama tersimpan; penyimpanan formulir lama ditolak 409, input akun kedua tetap ada dan data pertama tidak tertimpa. |
| Dua mutasi serentak | Dua request checklist dengan revisi sama menghasilkan 200 dan 409. |
| Koneksi terputus | Isian tetap tersedia saat offline; penyimpanan ulang setelah online berhasil. |
| Upload RAB penuh | Fixture Excel empat item diterima, total Rp20 juta sesuai SK. |
| Pembagian dan autosave | Jumlah 6 dari 10 per item tersimpan; T1 Rp12 juta, T2 Rp8 juta; akun lain melihat hasilnya. |
| Jumlah pecahan | Alokasi 1,992 ditolak server 400; edit admin dengan angka pecahan menonaktifkan Simpan. |
| Batas termin | Draf alokasi seluruh dana ke T1 dapat disimpan untuk dikerjakan, tetapi melanjutkan ke T2 ditolak 400 karena melebihi 70%. |
| Progres langkah | Langkah mendatang terkunci sebelum Lanjut; langkah yang pernah dibuka tetap dapat dikunjungi setelah reload. |
| Larangan melewati pemeriksaan | Salinan draf baru menampilkan blocker pemeriksaan RAB; submit langsung ditolak 400. Lanjut bertahap sampai T2 berhasil. |
| Ekspor tiga Excel | Berkas benar-benar diunduh dan dibaca dengan ExcelJS di browser: total 20/12/8 juta, jumlah 10/6/4 pada empat item. |
| Koreksi admin | Pada RAB 100%, input T1 terkunci. Total Rp28 juta vs SK Rp20 juta menonaktifkan persetujuan; koreksi kembali Rp20 juta menjadi versi baru. Reset mengembalikan isian edit ke awal. |
| Formulir bersama | Data Program, Administrasi, kop, bukti rekening, dan nomor PKS tersimpan serta dapat dibuka kembali. |
| Rekening kampus | Surat kuasa menjadi tidak diperlukan dalam pemeriksaan pengajuan QA 1. |
| Rekening kuasa | Template dapat diunduh dan ditampilkan; unggahan diterima; perubahan rekening memunculkan peringatan kuasa harus diperbarui. |
| Tanggal dokumen | Invoice bertanggal 17 Juni 2026 tidak valid karena harus setelah tanggal PKS. |
| Pembuatan dokumen | PKS, permohonan, kuitansi, dan invoice dibuat dari data bersama. Preview PKS menunjukkan program dan pembagian 60%/40% yang diuji. |
| Checklist | Centang PKS tersimpan setelah respons sukses dan reload. |
| Pengajuan dan revisi | Kirim, catatan revisi admin, pembuatan ulang dokumen, dan kirim ulang berhasil; riwayat pengajuan tercatat setelah perbaikan. |
| Persetujuan | Seluruh sembilan butir wajib disetujui; kuasa tidak perlu; status selesai dan progres 10/10. |
| Pembatalan keputusan | Pembatalan persetujuan PKS mengembalikan status menunggu; unggah pindaian ditolak 400 sampai disetujui kembali. |
| Dokumen final | POST pembuatan versi final berhasil 200. Isi final tetap sama setelah perubahan sementara pengaturan PF; penanda DRAF dibuang dan nilai/penandatangan tetap tersimpan. |
| Pindaian dan penerimaan asli | Unggah pindaian PKS berhasil; flag penerimaan memiliki aktor/tanggal yang dapat ditampilkan. Fixture PDF hanya contoh, bukan dokumen sah. |
| Mobile | Pada viewport 390 x 844, halaman kampus/admin tidak meluber secara horizontal; tabel memiliki scroll sendiri dan panel keputusan terbaca. |
| Data lama | Halaman dan API satu kampus lama berhasil dibuka; tidak dipaksa memakai alur baru. |
| Dummy | Login admin dan tabel perbandingan kampus-007 di port 5182 tetap terbuka. |

## Temuan dan perbaikan

1. Pembacaan internal ketika membuat dokumen sempat menaikkan revisi dan memicu konflik sendiri. Pembacaan PocketBase sekarang tidak menulis transaksi.
2. Sebagian preview tidak memuat blob atau MIME yang benar. Adapter memuat berkas versi yang diminta beserta MIME dan memeriksa kepemilikan versi terhadap dokumen.
3. Riwayat submit sempat tidak terdeteksi karena membandingkan panjang array yang sama setelah mutasi. Panjang awal kini disimpan sebelum aksi. Pengajuan QA pertama sebelum perbaikan tidak dianggap bukti riwayat berhasil.
4. Dokumen final sempat dibuat ulang dari pengaturan PF terbaru. Final sekarang berasal dari berkas versi yang disetujui, hanya menghapus penanda draf. Unduhan sebelum/sesudah perubahan sementara PF dibandingkan dan identik.
5. Pembatalan keputusan sebelumnya dapat menyisakan status selesai. Status kini kembali menunggu dan unggahan final/pindaian dibatasi lagi.
6. Flag penerimaan berkas sempat tanpa tanggal/aktor; helper backend yang sudah ada diekstrak dan digunakan bersama.
7. Pembuatan versi final melalui tombol admin sempat ditolak 405. Rute yang diperlukan kini ditangani dan hasil versi final diverifikasi.
8. Ada risiko data PF berubah di antara render dan penyimpanan dokumen. Fingerprint sumber PF dibandingkan sebelum simpan dan saat persetujuan. Pembuatan dokumen setelah perubahan ini berhasil; balapan pada sela render yang tepat belum dipaksakan dalam browser.
9. Submit langsung dapat melewati progres pemeriksaan RAB setelah koreksi. Validasi bersama kini menuntut langkah RAB selesai; penolakan 400 dibuktikan melalui browser.

## Bukti yang dapat diulang

Gunakan tool browser, bukan runner shell. Baca kondisi data di [runbook](RUNBOOK-PENGAJUAN-LOKAL.md) sebelum mengulang:

- `scripts/qa/pocketbase-local-conflicts.playwright.js`: lulus saat QA 1 berstatus revisi; memerlukan pengajuan dapat diedit.
- `scripts/qa/pocketbase-local-kuasa.playwright.js`: lulus; membuat versi RAB baru pada QA 2 dan sengaja menguji input tidak valid.
- `scripts/qa/pocketbase-local-exports.playwright.js`: lulus pada pembagian QA 1 sebesar 20/12/8 juta.
- `scripts/qa/pocketbase-local-journey.playwright.js`: skrip checkpoint alur awal; sempat berhenti saat menemukan bug. Alur diteruskan dan diperiksa lewat interaksi browser setelah perbaikan. Tidak diklaim lulus utuh sebagai satu eksekusi.
- Screenshot sesi: `.playwright-mcp/qa-local-admin-mobile.png` dan `.playwright-mcp/qa-local-campus-mobile.png`; artefak lokal, bukan berkas publikasi.

## Pemeriksaan data dan batas cakupan

Pada pemeriksaan penutup, satu reload browser terhenti dengan `ERR_ABORTED` dan penantian locator pada tab baru melewati 30 detik. Pembacaan halaman berikutnya menunjukkan halaman tersambung, versi RAB 5, dan total 20/12/8 juta tampil. Kejadian ini dicatat sebagai keterbatasan kestabilan/waktu pemuatan sesi dev; tidak dinyatakan sebagai pengujian performa yang lulus.

Perbandingan read-only dengan backup menunjukkan record awal pada campuses, sk_awards, disbursements, rab_versions, rab_lines, documents, document_versions, reviews, notes, dan bank_checks tidak dihapus atau berubah pada kolom semula. Satu program_settings Tahun Kedua diisi untuk QA; data QA, audit, serta revisi aplikasi bertambah. Jumlah collection bisnis tetap 37.

Backup tersedia sebelum migrasi, tetapi pemulihan belum diuji. Runtime sesi Node 25.5; Node 22 belum diuji terpisah. Penyimpanan objek dapat meninggalkan berkas tanpa referensi bila batch gagal; pembersihan otomatis belum dibuat. Template kuasa contoh masih perlu persetujuan naskah resmi PF sebelum produksi.

Poin rapat 1 tentang RAB sebagai langkah pertama tetap ditunda sesuai instruksi pengguna; urutan SK -> Data Program -> RAB -> Administrasi -> PKS dipertahankan. Poin 15-16 tidak diterapkan. Konversi massal data lama, pembayaran, dan LPJ tidak termasuk adapter pengajuan baru. Tidak ada klaim migrasi produksi selesai.
