# Pelaporan: schema dan QA lokal

Branch pelaporan berasal dari GitLab production `fa84daee78dbb0317a33b10e30820ed236663261`. Rancangan disetujui pengguna 14 Oktober 2026.

## Menjalankan

Gunakan `.env.local` dan instance PocketBase bertanda, sesuai launcher existing. `DEB_DEV_PORT=5177` memilih port frontend khusus pekerjaan ini; default proyek tetap 5176. Jangan menghentikan layanan lain pada 5176. PocketBase tetap lokal 8097. Credentials, penanda instance dan objek berada di direktori ignored; jangan memasukkannya ke Git.

`npm run dev` menjalankan aplikasi pada port tersebut. Skrip launcher tidak melakukan migrasi atau seed otomatis.

## Migrasi aditif

Jalankan secara sengaja pada instance QA bertanda:

```powershell
node --import tsx scripts/pocketbase/pelaporan-local.mjs --seed
```

Skrip menolak URL selain `http://127.0.0.1:8097`, memeriksa marker/direktori, menyimpan snapshot schema sebelum perubahan, lalu:

- Membuat collection `report_versions`, dengan aturan akses langsung null. Indeks unik per SK/jenis/versi dan operationId.
- Menambah field `note`, `revision`, `history`, `operationId`, `inputHash` pada `lpj_entries`; indeks operationId unik hanya untuk nilai tidak kosong, sehingga record lama tetap valid.
- Dengan `--seed`, membuat dua kampus dan akun QA khusus (`campus-951` dibayar, `campus-952` belum dibayar). Seed tidak mengubah pembayaran kampus pengguna dan tidak menimpa fixture yang sudah ada.

Transaksi memakai `app_revisions` serta REST batch existing. Fitur memerlukan batch yang sudah aktif seperti alur pengajuan existing. Mutasi laporan, audit dan notifikasi bersifat atomik. Mutasi LPJ dan penyelesaiannya memakai fence yang sama.

Skrip ini hanya untuk lokal. Rilis memerlukan penerapan schema aditif setara pada target yang disetujui, sebelum aplikasi baru diaktifkan. Migrasi/konfigurasi production belum dijalankan dan memerlukan instruksi terpisah. Jangan menjalankan provisioning penuh sebagai pengganti migrasi aditif.

Jika schema aplikasi perlu dikembalikan, pertahankan collection/field tambahan beserta datanya; jangan menghapus laporan/bukti yang sudah tersimpan. Snapshot schema berada di direktori instance lokal `reporting-schema-*`.

## Data dan batas

Laporan terkait SK pencairan melalui snapshot pengajuan, atau satu SK yang tidak ambigu. Referensi dikunci pada metadata pencairan saat draf pertama disimpan. Beberapa SK tanpa referensi yang dapat dipastikan menghasilkan konflik, bukan memilih tahun/SK secara acak.

LPJ lama tidak dikonversi otomatis. Revisi mempertahankan file lama dalam riwayat. Pembayaran harus memiliki tanggal serta nominal positif untuk membuka operasi tulis, termasuk record legacy. Penyelesaian tidak otomatis: admin harus menyatakan selesai setelah semua bukti Sesuai. Membuka kembali wajib alasan dan membatalkan prasyarat LPJ T2.

Video diperiksa berdasarkan struktur MP4, durasi movie/track, deskripsi sample dan rentang data sample. Pemeriksaan ini tidak melakukan decoding setiap frame atau transkode. MP4 dengan metadata tidak lengkap/struktur fragment yang tidak didukung perlu diekspor ulang sebagai MP4 standar. Dokumen menggunakan pemeriksaan PDF/Office existing.

Objek disimpan dengan key unik sebelum transaksi metadata. Bila transaksi metadata gagal, versi lama tetap tersedia; objek yang tidak direferensikan dapat tertinggal, mengikuti pola storage immutable existing. Jangan menghapus objek tanpa inventaris referensi.

## Acuan verifikasi

QA memakai tool Playwright di 5177, bukan runner terminal. Tes tertulis di `tests/report-file.test.ts`, `tests/pelaporan.test.ts`, `tests/lpj-completion.test.ts`, dan `tests/pelaporan.spec.ts`; belum dieksekusi terminal. Fixture MP4 dibuat dari canvas lokal melalui MediaRecorder browser, tanpa data pengguna.

Hasil nyata: [QA pelaporan](../QA-PELAPORAN-KAMPUS-2026-10-14.md).
