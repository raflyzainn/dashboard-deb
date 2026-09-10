# P4 lokal — master bersama dan penyelesaian peralihan UI

Status implementasi: 10 September 2026. Lingkungan hanya frontend **5176** dan PocketBase **8096**. P1 autentikasi operasional tetap BELUM; P4 keseluruhan SEBAGIAN sampai autentikasi, data resmi, dan deployment diselesaikan.

## Keputusan data

- Semua kampus menggunakan definisi, kategori, satuan, **baseline, dan target yang sama**. Admin mengaturnya satu kali pada master, bukan per kampus.
- Aktual, catatan, feedback, dan pengajuan tetap milik masing-masing kampus.
- Master adalah sumber otoritatif baseline/target. Field lama pada `campus_indicators` masih dipertahankan sebagai salinan kompatibilitas; perubahan master menyelaraskan salinan tanpa menimpa aktual/catatan.
- Rumus `min(current / target * 100, 100)` dan data awal masih simulasi. P4 tidak mengesahkan kamus indikator atau kelulusan DEB.

## Alur Admin

`/admin/master-indicators` menyediakan pencarian katalog, tambah/edit draft, aktivasi, penghapusan master belum terpakai, serta 50 perubahan audit terbaru. Seluruh audit tetap tersimpan tanpa pemotongan 50 record.

Indikator baru selalu draft. Baseline harus finite/nonnegatif dan target finite/positif. Draft hanya tersedia untuk Admin pada endpoint master; tidak masuk bootstrap bisnis, perhitungan, isian kampus, atau snapshot pengajuan. Aktivasi membuat satu isian per kampus dengan aktual nol dan catatan kosong. Indikator aktif tidak dapat kembali menjadi draft.

Aktivasi dan edit indikator aktif ditolak jika ada pengajuan pending. Selesaikan review secara normal; jangan mengubah keputusan existing untuk membuka kunci. Pengubahan nama/kategori/satuan/baseline/target akan terdeteksi sebagai perubahan dibandingkan pengajuan lama. Snapshot versi lama tidak diperbarui.

Daftar/detail kampus menyediakan tambah/edit profil dan lokasi. Kampus baru otomatis memperoleh seluruh indikator aktif tanpa akun otomatis; provisioning akun menunggu P1. Kedua koordinat boleh kosong, atau harus valid dalam cakupan peta Indonesia. `hasLocation` membedakan lokasi kosong dari nilai numerik nol PocketBase. Penanda lokasi perkiraan tetap tersedia.

Hapus kampus/indikator ditolak jika ada relasi bisnis. Tidak ada cascade delete. Audit menyimpan entity ID sebagai teks sehingga penghapusan draft tidak menghilangkan bukti perubahan.

## API dan schema

| Method/path | Operasi |
|---|---|
| GET `/api/admin/masters` | Semua definisi termasuk draft dan 50 audit terbaru, Admin saja |
| POST `/api/admin/campuses` | Tambah kampus serta isian seluruh indikator aktif |
| PATCH/DELETE `/api/admin/campuses/[id]` | Edit profil/lokasi atau hapus jika belum dipakai |
| POST `/api/admin/definitions` | Buat draft definisi bersama |
| PATCH/DELETE `/api/admin/definitions/[id]` | Edit definisi atau hapus jika belum dipakai |
| POST `/api/admin/definitions/[id]/activate` | Aktivasi atomik untuk seluruh kampus |

Seluruh mutasi tetap melalui workflow PocketBase dalam transaksi yang sama dengan audit dan receipt `Idempotency-Key`. Edit/hapus/aktivasi wajib membawa `revision`; versi kedaluwarsa menghasilkan 409. Role dan identitas berasal dari akun QA terverifikasi di server. Direct collection writes tetap dikunci, termasuk untuk Admin aplikasi. Draft dan audit tidak terbaca oleh Campus melalui rules PocketBase.

Field baru: baseline/target/status/revision pada `indicator_definitions`, revision/hasLocation pada `campuses`, sumber kampus `admin`, dan koleksi `master_audit` dengan actor/waktu/before/after. Tidak ada tabel target khusus per kampus.

Migrasi P4 adalah forward-only:

1. `1789086400_deb_shared_masters.js`: penambahan field/master audit.
2. `1789086500_deb_master_audit_fields.js`: perbaikan pembentukan FieldsList dan rules audit secara eksplisit.
3. `1789086600_deb_shared_master_backfill.js`: memuat ulang record setelah schema baru untuk mengisi nilai shared existing.

Migrasi memeriksa kesamaan baseline/target existing per definisi; konflik atau tidak adanya sumber nilai menghentikan migrasi. Tidak memilih salah satu kampus atau menghitung rata-rata. Ketiga migrasi diperlukan karena migrasi awal sudah diterapkan lokal; file historis tidak ditulis ulang.

## UI, refresh, dan batas autentikasi


Jumlah kampus, jumlah indikator, dan kategori berasal dari backend. Kampus tanpa marker tetap masuk total wilayah; nama provinsi kosong tidak dihitung sebagai satu provinsi. Data kosong dan error tidak membuat fallback contoh.

Setelah mutasi/navigasi, bootstrap dimuat ulang. Refresh gagal mempertahankan data akun yang sama dengan penanda stale; ganti akun membatalkan request dan membersihkan state. Tidak ada polling/realtime. Route eksplisit dan `ssr = false` dipertahankan sampai sesi server P1 tersedia.

Pemilih akun QA tetap dibatasi development loopback. Build production tetap menolak endpoint preview; jangan menghapus gate tersebut untuk mencoba deployment. P1, mailer, hosting, batas request upload 10 MiB, pengesahan data, dan penerimaan operasional masih terbuka.

## Backup dan pemulihan

`npm run pb:backup` hanya berjalan saat PocketBase 8096 dihentikan. Perintah memeriksa SQLite, menyalin database/file beserta hook/migrasi ke `.local/pocketbase/maintenance/`, membandingkan SHA-256 dan hash record, serta menulis manifest. Ini perintah manual; tidak dipanggil oleh startup/build/test standar.

Untuk pemulihan: hentikan PocketBase dan frontend; cocokkan manifest backup, simpan salinan kondisi sekarang, lalu pulihkan `pb_data` **beserta versi kode/schema yang kompatibel**. Gunakan kredensial lokal yang sesuai dan pastikan akses file, hitungan record, serta workflow sebelum membuka frontend kembali. Pemulihan ke backup sebelum P4 membutuhkan kode sebelum P4; jangan memakai UI P4 terhadap schema lama. Jangan menyalin database SQLite aktif dengan file biasa. Prosedur pemulihan production belum diuji.

Data IndexedDB lama tidak diimpor atau dihapus. Semua seed tetap manual dan create-only. Database, kredensial, backup, dan bukti screenshot diabaikan Git.

## Pengujian

- `npm test`: adapter, konflik/revisi, perhitungan, perubahan master terhadap snapshot, serta peta.
- `npm run test:pb`: akses dan nilai shared pada 8096 existing; tanpa seed/reset atau perubahan bisnis yang berhasil.
- `npm run test:e2e`: smoke P3 dan regresi baca P4 pada 5176 existing. Respons kosong/error disimulasikan hanya pada jaringan konteks browser, bukan dengan mengosongkan database.
- `npm run test:pb:master-rollback`: **manual saat 8096 berhenti**, setelah backup. Menjalankan test JSVM lewat migrasi temporer yang wajib melempar sentinel rollback. Semua perubahan pengujian, termasuk pengajuan pending sementara, dibatalkan dalam transaksi luar. Hash record sebelum/sesudah wajib sama. Tidak membuka server lain atau endpoint pengujian.
- Mutasi UI QA dilakukan melalui MCP Playwright Chrome. Aktivasi/target global tidak disimpan permanen untuk kebutuhan QA; pengujian suksesnya menggunakan rollback native.

Hasil aktual, data QA yang dipertahankan, dan batas bukti dicatat pada log P4 di checkpoint.
