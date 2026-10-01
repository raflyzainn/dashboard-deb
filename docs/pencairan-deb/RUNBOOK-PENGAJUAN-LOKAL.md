# Runbook pengajuan lokal untuk sesi berikutnya

## Mulai di sini

1. Ikuti AGENTS.md, README, PANDUAN-CODEX, dan kewajiban membaca docs.
2. Baca MIGRASI-POCKETBASE-LOKAL.md, ARSITEKTUR-PENGAJUAN-LOKAL.md, dan laporan QA tanggal 30 September 2026.
3. Baca Git status/diff sebelum mengubah apa pun. Branch kerja `feat/rab-dummy-all-campuses`. Implementasi migrasi belum di-commit/push.
4. Jangan menganggap build lama commit d5ee93e membuktikan migrasi ini. Build/check/test terminal migrasi belum dijalankan; tunggu izin pengguna.

## Menjalankan aplikasi

Target aktif: `.local/pocketbase/tests/production-copy-1790039926295`, PocketBase `http://127.0.0.1:8097`, aplikasi `http://127.0.0.1:5176`.

```sh
npm run dev:local
```

Skrip membaca target dari `.env.local`, memeriksa marker instance dan alamat loopback, menjalankan PocketBase bila belum hidup, lalu Vite dalam mode `pocketbase-local`. Jendela helper disembunyikan. Jika port dipakai proses lain, periksa prosesnya; jangan mematikan semua Node/PocketBase.

Setelah laptop mati: jalankan perintah di atas, kemudian buka login melalui tool browser dan periksa halaman benar-benar terhubung. Baris Vite ready saja belum bukti halaman berhasil.

`npm run dev` tetap mode dummy. Port yang telah dipakai pada sesi ini adalah 5182; ikuti port aktual yang ditampilkan Vite. Jangan menganggap dummy dan local berbagi database: keduanya berbagi UI/mesin aturan, tetapi penyimpanannya berbeda.

## Migrasi dan akun QA

Migrasi sudah diterapkan. Jangan reset database untuk melanjutkan QA.

```sh
npm run pb:journey-local
```

Perintah maintenance ini hanya menambahkan empat field yang belum ada, mengaktifkan batch lokal maksimal 2.000 request, dan membuat record QA yang belum ada. Tidak menghapus/mengganti data kampus lama. Definisi field berasal dari `deb-schema.ts`. Saat menambah akun pertama kali, kredensial ditulis ke berkas instance yang dilindungi ACL; tidak dicetak.

Perintah memakai loader `tsx` yang sudah terpasang untuk membaca skema TypeScript, sehingga tidak bergantung pada native TypeScript stripping Node terbaru. Sesi QA memakai Node 25.5.0; runtime Node 22.x yang tercantum pada package.json belum diuji terpisah.

Login lewat pilihan akun lokal, tanpa menyalin password ke chat/dokumentasi:

| Pilihan | Kampus | Kegunaan |
| --- | --- | --- |
| campus-901 | QA Lokal 1, d63eb34c38656b4 | Pengisi utama |
| campus-902 | QA Lokal 1, d63eb34c38656b4 | Bukti data bersama dan konflik |
| campus-903 | QA Lokal 2, 9a2b695c255c938 | Pembatasan akses dan rekening kuasa |
| admin-1 | Admin PF lokal yang sudah ada | Pemeriksaan dan pengaturan PF |

Gunakan browser context terpisah untuk akun yang diuji bersamaan. Pilihan akun yang berbeda dalam context/cookie yang sama bukan dua sesi independen.

## Kondisi data setelah QA

QA UX 1 Oktober: QA Lokal 2 sudah dibuatkan empat dokumen versi 2 dan dikirim, sehingga kini **menunggu PF**, menggantikan kondisi draf/revisi pada catatan 30 September di bawah. Lihat [laporan QA UX](QA-UX-KAMPUS-2026-10-01.md) untuk hambatan yang masih ditemukan.

Pembaruan 1 Oktober: selain dua kampus QA, 17 kampus yang sebelumnya belum memiliki pencairan kini memakai alur baru dengan SK dummy Rp75 juta dan pengajuan kosong. Lihat [rincian pembukaan dan QA](BUKA-KAMPUS-LOKAL-2026-10-01.md). Universitas Pertamina dapat dicoba melalui `campus-006`. Default Tahun Kedua bersifat simulasi lokal.

- Kampus QA 1: RAB Rp20 juta, T1 Rp12 juta, T2 Rp8 juta. Sudah mengalami revisi, kirim ulang, persetujuan, pembatalan persetujuan sementara, dan persetujuan kembali. PKS memiliki contoh unggahan pindaian (file sk-dummy.pdf dipakai hanya sebagai fixture). Checklist PKS berisi beberapa centang pengujian.
- Kampus QA 2: beberapa versi unggahan/koreksi. Pernah diuji total Rp28 juta vs SK Rp20 juta, lalu dikembalikan Rp20 juta melalui versi koreksi baru. Tanggal invoice sudah diperbaiki dan surat kuasa diperbarui. Empat dokumen pernah dibuat; pengujian terakhir membuat salinan draf RAB untuk membuktikan pengajuan tidak bisa melewati pemeriksaan langkah RAB. Langkah RAB sudah dilanjutkan sampai Termin 2, tetapi dokumen perlu dibuat ulang karena versi RAB berubah. Belum dikirim kembali ke admin.
- Pengaturan Tahun Kedua sebelumnya kosong. Diisi lewat halaman admin lokal dengan penandatangan/jabatan QA serta masa perjanjian 17 Juni-31 Desember 2026 dan laporan 31 Januari 2027. Perubahan sementara nama PF untuk uji snapshot sudah dikembalikan.
- Record kampus/SK/pencairan/RAB/dokumen/keputusan lama dibanding backup tidak berubah. Satu record program_settings berubah untuk QA; audit dan revisi aplikasi bertambah.
- Jangan memakai fixture pengujian sebagai bukti dokumen resmi.

## Menjalankan QA

Pakai `browser_run_code_unsafe` dengan `filename` skrip pada `scripts/qa/pocketbase-local-*.playwright.js`. Skrip ini **bukan** izin menjalankan runner dari terminal.

Baca prasyarat tiap skrip. Journey/conflicts memerlukan draf atau status revisi; akun QA 1 sekarang selesai sehingga perlu keputusan revisi melalui admin sebelum mengulang skenario perubahan data. Ekspor dapat diuji pada status selesai. Kuasa membuat versi RAB baru di kampus QA 2. Pengujian tidak otomatis menghapus hasilnya.

Untuk walkthrough manual:

1. Login kampus; SK dan Data Program tetap mendahului RAB.
2. Upload contoh Excel penuh; periksa 100%; Lanjut; bagikan jumlah; Lanjut untuk sisa T2.
3. Isi administrasi, kop, rekening, penandatangan, nomor/tanggal surat; pilih jenis rekening.
4. Isi nomor PKS kampus; PF mengisi nomor PKS PF dan pengaturan program melalui halaman yang sudah ada.
5. Buat empat dokumen, periksa preview, lalu ajukan dari Ringkasan.
6. Login admin context lain; periksa tiap butir. Revisi harus memiliki alasan. Persetujuan memakai data/revisi terbaru.
7. Sesudah semua sesuai, unduh final dan unggah contoh pindaian; admin dapat mencatat asli diterima.

## Backup dan pemulihan

Backup sebelum migrasi: `.local/pocketbase/maintenance/before-journey-20260930-212824`.

Berisi snapshot SQLite `data.db` dan `auxiliary.db`, folder `objects`, serta metadata backup. Kredensial/secret tidak disalin ke dokumentasi.

Pemulihan memerlukan menghentikan PocketBase **8097 yang tepat**, memastikan direktori target sesuai marker, lalu memulihkan kedua database dan objek dari backup yang sama. Pertahankan kredensial instance. Jangan menggabungkan database lama dengan objek dari versi lain atau menyalin saat server masih menulis. Pemulihan belum dijalankan pada sesi ini.

## Batas dan tindak lanjut

- Tidak ada migrasi produksi, deploy, email nyata, pembayaran, commit, atau push.
- Pengajuan lama tidak otomatis dikonversi. Tidak ada tebakan jumlah dari nominal historis.
- Lampiran pembayaran dan LPJ belum dipindahkan ke adapter perjalanan baru; cakupan yang disetujui sampai pengajuan, review, final, dan pindaian.
- Build/typecheck/test terminal belum dijalankan. Template resmi kuasa dan finalisasi naskah PF harus disepakati sebelum produksi.
- Backup tersedia; restore belum diuji. Gangguan di tengah penulisan objek dapat meninggalkan objek tanpa referensi; belum ada pembersihan otomatis.
- Jangan menimpa perubahan lain yang sudah ada sebelum migrasi, khususnya page-data.ts, audit.ts, state.svelte.ts, halaman campus/pencairan, laporan login mitra, serta spreadsheet pengguna.

## Pemisahan branch (1 Oktober 2026)

Integrasi PocketBase lokal dikerjakan pada branch feat/pencairan-pocketbase-local. Branch feat/rab-dummy-all-campuses tetap menunjuk versi dummy d5ee93e. Audit kedua remote tidak menemukan commit integrasi lokal pada branch dummy, sehingga tidak diperlukan revert. Database, objek unggahan, kredensial dan .env lokal tidak dipublikasikan; mengikuti runbook untuk menjalankan salinan lokal. Build terakhir sebelum perubahan validasi langsung berhasil, tetapi typecheck masih memiliki 134 error yang telah dicatat. Build belum diulang setelah perbaikan peringatan ganda; QA browser perubahan tersebut tercatat pada laporan UX.
