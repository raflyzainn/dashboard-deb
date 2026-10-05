# Migrasi alur pengajuan ke PocketBase lokal

## Mulai sesi berikutnya dari sini

Status 30 September 2026: implementasi lokal tersedia dan QA browser selesai untuk skenario dalam laporan. Build/check/test terminal belum dijalankan. Tidak ada commit, push, atau perubahan produksi.

- Branch kerja: `feat/rab-dummy-all-campuses`; perubahan belum untuk produksi.
- Target yang dipilih pengguna: instance lokal yang sudah ada, `127.0.0.1:8097`, direktori `.local/pocketbase/tests/production-copy-1790039926295`.
- Backup sebelum perubahan: `.local/pocketbase/maintenance/before-journey-20260930-212824`. SQLite online backup untuk `data.db` dan `auxiliary.db`, ditambah salinan `objects`. Kredensial tetap pada instance asal; tidak ditulis dalam dokumentasi.
- Mode dummy 5182 dipertahankan. Aplikasi backend lokal memakai 5176.
- Dilarang menyentuh produksi, mengirim email nyata, pembayaran, commit/push tanpa instruksi berikutnya.
- Pengujian melalui tool browser; build dan tes terminal menunggu instruksi eksplisit.

## Rencana yang disetujui

- [x] Audit database lokal: 37 collection aplikasi, 40 kampus, 54 akun, 23 pencairan, 24 versi RAB, 2.203 baris RAB.
- [x] Backup database dan berkas lokal.
- [x] Migrasi empat field, tanpa collection baru.
- [x] Jalankan backend lokal dengan pengaman alamat dan penyimpanan.
- [x] Akun QA bersama per kampus; akses lintas kampus ditolak.
- [x] RAB: upload, alokasi, autosave, progres, ekspor, koreksi admin.
- [x] Administrasi, PKS, dokumen, checklist, pengajuan akhir.
- [x] Pemeriksaan/revisi admin dan dokumen bertanda tangan.
- [x] Konflik perubahan, sinkronisasi lintas akun, kegagalan koneksi.
- [x] QA browser dan dokumentasi serah-terima; keterbatasan dicatat pada laporan.

## Kontrak penyimpanan

Collection lama dipertahankan. `disbursements.submissionStatus` dan `applicationData` menyimpan status serta formulir/checklist/progres pengajuan. `rab_versions.campusStep` dan `revision` menyimpan progres dan revisi RAB. Jumlah termin memakai `rab_lines.flags`; versi dokumen tetap `document_versions`; riwayat tetap `audit`, `reviews`, dan `notes`.

Data lama tidak diberi alokasi jumlah hasil tebakan. Pengajuan tanpa penanda alur baru tetap melalui backend lama. Akun QA dan unggahan baru dipakai untuk membuktikan alur terbaru.

## Catatan keputusan implementasi

- Gunakan kembali aturan alur mockup sebagai mesin bersama yang menerima sumber penyimpanan, nilai SK, dan konteks aktor. Penyimpanan PocketBase harus tetap memakai collection relasional; jangan menyimpan seluruh database dummy sebagai satu JSON.
- Seluruh mutasi alur baru harus melalui transaksi dengan `app_revisions`, bukan rangkaian write yang bisa meninggalkan sebagian pengajuan tersimpan.
- UI harus mempertahankan input ketika konflik; server tidak otomatis menimpa perubahan akun lain.

## Pemulihan

Hentikan layanan lokal 8097 sebelum pemulihan. Pulihkan kedua database beserta folder `objects` dari backup yang sama, dengan tetap mempertahankan kredensial instance. Jangan memulihkan hanya satu berkas database sementara proses PocketBase masih berjalan. Pastikan path target berada di direktori instance lokal di atas.

## Hasil QA

Lihat [laporan QA](QA-MIGRASI-POCKETBASE-LOKAL-2026-09-30.md). Setiap klaim dibatasi pada skenario yang dicatat di sana.

## Dokumen lanjutan

- [Arsitektur dan kontrak penyimpanan](ARSITEKTUR-PENGAJUAN-LOKAL.md): berkas yang digunakan ulang, field, transaksi, dan snapshot.
- [Runbook sesi berikutnya](RUNBOOK-PENGAJUAN-LOKAL.md): startup, akun QA, kondisi data, backup, dan batas pengujian.
- [Laporan QA](QA-MIGRASI-POCKETBASE-LOKAL-2026-09-30.md): bukti per fitur, temuan yang diperbaiki, dan hal yang belum diuji.

## Batas penerapan

Pembaruan 1 Oktober 2026: [17 kampus tanpa pengajuan dibuka](BUKA-KAMPUS-LOKAL-2026-10-01.md) atas permintaan pengguna, memakai SK dummy Rp75 juta dan isian kosong. Jadi alur baru kini juga tersedia pada kampus-kampus tersebut, bukan hanya dua kampus QA awal.

Aktif hanya dalam mode `pocketbase-local` pada pengajuan yang memiliki `submissionStatus`. Dua kampus QA memakai alur baru. Record kampus lama tanpa penanda tetap memakai layanan lama; tidak ada konversi massal maupun tebakan pembagian jumlah lama. Mengaktifkan alur untuk produksi bukan bagian pekerjaan ini. Urutan SK -> Data Program -> RAB -> Administrasi -> PKS tetap dipertahankan sesuai penundaan poin 1 oleh pengguna; poin 15-16 belum dikerjakan.
