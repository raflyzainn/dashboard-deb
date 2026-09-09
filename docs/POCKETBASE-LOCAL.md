# PocketBase lokal DEB — P0

Fondasi backend sudah tersedia; **website masih memakai Dexie dan login demo**. Menjalankan PocketBase/seeder belum menghubungkan halaman website ke database. P1 menangani sesi/login nyata, P2 mengaktifkan pembacaan, P3 menangani workflow tulis.

## Setup dan menjalankan

Prasyarat: Node.js 22.13+ (22.x), npm, internet saat instalasi pertama. Windows memakai PowerShell; Linux/macOS memerlukan `unzip`. Runtime dipin ke PocketBase **0.40.3** dan SDK **0.28.0**. Binary resmi diunduh dari GitHub Releases dan diperiksa SHA-256 terhadap `checksums.txt` rilis yang sama.

```powershell
npm ci
npm run pb:preview
npm run pb:setup
npm run pb:serve
```

Biarkan terminal server terbuka. Pada terminal kedua:

```powershell
npm run pb:seed
npm run dev
```

- Dashboard PocketBase: `http://127.0.0.1:8096/_/`.
- Website mockup: `http://127.0.0.1:5176`.
- Kredensial superuser dan akun QA: `.local/pocketbase/credentials.json`. Buka secara lokal, jangan kirim file ini atau menyalinnya ke chat/PR. File dibuat dengan ACL pemilik pada Windows atau mode `0600` pada Unix. Folder diabaikan Git, **tetapi checkout berada di OneDrive: Git ignore tidak mencegah sinkronisasi cloud**. Jangan gunakan kredensial/data production di sini; untuk data sensitif gunakan checkout di luar folder sinkronisasi.
- Database dan PDF: `.local/pocketbase/pb_data/`. Persistent antarrestart, tidak ikut Git. Fixture tes memakai `.local/pocketbase/tests/foundation-*` pada port **8097**, bukan database development.
- Binary: `.local/pocketbase/bin/0.40.3/`. PocketBase tidak disematkan ke fungsi Vercel.

`pb:setup` menerapkan schema dan membuat superuser lokal secara create-only; belum mengisi data aplikasi. Setup ulang tidak mereset password. `pb:serve` menolak port terpakai, tidak mengambil alih server lain. Hentikan dengan Ctrl+C sebelum menjalankan migrasi/setup ulang. Jangan menjalankan binary tanpa flags dari runner: direktori hook dan penanda instance diperlukan untuk seed dan validasi.

## Schema dan migrasi

Sumber schema: `db-schema/pb_migrations/`; validasi record dan penanda lokal: `db-schema/pb_hooks/`. Ada 13 koleksi:

`users`, `campuses`, `indicator_definitions`, `campus_indicators`, `deb_submissions`, `indicator_feedback`, `proposal_versions`, `questions`, `question_answers`, `question_likes`, `faq_entries`, `activities`, `notifications`.

```powershell
npm run pb:preview
# Stop pb:serve terlebih dahulu:
npm run pb:migrate
npm run pb:serve
```

Preview hanya menampilkan inventaris migrasi, **bukan diff migrasi yang pending**; tidak membuka/mengubah database. `test:pb` membuktikan fresh apply dan rerun. PocketBase juga menerapkan migrasi baru saat `serve`; review perubahan migrasi sebelum menyalakan server. `--automigrate=false` mencegah perubahan Dashboard menghasilkan file migrasi otomatis. Jangan mengedit schema manual lewat Dashboard; tambahkan migrasi forward baru setelah baseline ini dibagikan. Migrasi awal sengaja tidak menyediakan rollback destruktif; gunakan backup yang telah diverifikasi untuk pemulihan.

Schema mengikuti mockup: 30 indikator numerik, tanpa periode, baseline/aktual nonnegatif dan target positif. Nol valid; field numerik PocketBase yang kosong menjadi nol, bukan nilai "belum diisi". Semantik kosong, indikator resmi, periode dan rumus perlu diputuskan ulang sebelum produksi. Capaian mock tetap `min(aktual / target * 100, 100)` dan rata-rata indikator.

Relasi dan indeks menjaga satu akun per kampus, indikator per kampus/definisi, versi proposal/pengajuan unik, satu pending per kampus, jawaban resmi tunggal, like unik, sumber FAQ opsional unik, serta deduplikasi notifikasi per event/penerima. Snapshot mencakup salinan definisi/satuan/target; snapshot dan field historis proposal tidak dapat ditimpa lewat save normal. Relasi historis tidak menggunakan cascade delete; tidak ada operasi hapus riwayat untuk akun aplikasi.

## Seeder lokal dan akun

`pb:seed` dijalankan manual; tidak dijalankan oleh startup, build, deployment, atau migrasi. Pemeriksaan URL hanya menerima origin loopback/port DEB, tanpa path, kredensial, query, atau redirect. Penanda instance dari proses PocketBase harus cocok dengan file instance lokal sebelum autentikasi superuser dan penulisan. `PB_URL` yang terisi ke host/port lain menyebabkan seed ditolak, bukan dialihkan diam-diam.

Seed menggunakan baseline `createSeed()` repo, bukan isi IndexedDB pengguna. Isi awal:

| Data | Jumlah |
|---|---:|
| Kampus / definisi indikator / nilai indikator | 40 / 30 / 1.200 |
| Akun kampus / admin aplikasi | 40 / 2 |
| Pengajuan / feedback / versi proposal PDF | 6 / 10 / 52 |
| Pertanyaan / jawaban / like / FAQ | 6 / 3 / 70 / 2 |
| Aktivitas / notifikasi | 40 / 31 |

Jumlah notifikasi lebih banyak daripada mock role-based karena setiap notifikasi admin dibuat untuk kedua akun secara terpisah. `simulated=true` menandai fixture; lokasi diberi `locationApproximate=true`. Nama kampus mengikuti roster, tetapi nilai, dokumen, akun, dan transaksi tetap contoh development.

Seeder mencari `legacyId`, membuat yang belum ada, dan tidak memperbarui record lama. Password dihasilkan acak dan disimpan sebelum create akun, sehingga seed terputus dapat dilanjutkan. Rerun tidak mengaktifkan kembali akun nonaktif, mereset password, atau memperbarui nilai master yang telah diedit. Konflik unik di luar `legacyId` akan gagal dengan error, bukan mengambil alih record. Tidak ada perintah reset database otomatis.

ID PocketBase dipetakan ke seluruh relasi, snapshot, lokasi dan segmen tautan notifikasi. Mapper lokasi menyediakan ID asli + latitude/longitude; **peta UI lama belum memakai mapper ini**, dan baru dipindahkan pada P2.

```powershell
npm run pb:account -- disable campus-040@deb.local.test
npm run pb:account -- enable campus-040@deb.local.test
npm run pb:account -- reset-password campus-040@deb.local.test
```

Tooling akun hanya berlaku pada instance DEB lokal yang ditandai. Reset password menghasilkan password baru di file kredensial privat, tidak dicetak. File `pending-password-reset.json` adalah catatan pemulihan lokal bila update terputus; jangan dibagikan. Untuk superuser, gunakan kredensial setup awal; hilangnya file kredensial tidak menyebabkan tooling mengambil alih/reset otomatis. Pemulihan lewat email/mailer belum disiapkan dan masuk P1.

## Batas keamanan dan kontrak server

- Semua read rule mensyaratkan akun aktif. Master dan forum dibaca bersama; data kerja hanya pemilik kampus/admin. Profil akun dan notifikasi hanya pemilik, termasuk antaradmin.
- Create/update/delete koleksi untuk akun biasa dikunci (`null`) pada P0, termasuk admin aplikasi. Ini sengaja: workflow atomik, pending lock, review, audit dan event belum diimplementasikan. Superuser untuk tooling tidak mewakili admin aplikasi dan melewati rules.
- PDF field protected, MIME PDF, maksimal 10 MiB. Repository memeriksa akses record memakai client user dan mengambil file dengan token singkat. Respons unauthorized dapat berupa 404; gagal list rule dapat menghasilkan daftar kosong 200, bukan selalu 403.
- `src/lib/server/pocketbase.ts` memakai `PB_URL` dan kredensial privat, tanpa URL fallback proyek lain atau authStore global. Salin `.env.example` bila menyiapkan integrasi server berikutnya; runtime lokal saat ini menggunakan file kredensial hasil setup, tidak membaca password kosong dari contoh env.
- Repository memverifikasi user lewat `authRefresh`, menolak client superuser, membaca semua halaman record, dan memetakan field yang diizinkan saja. Session DTO berisi `id/name/role/campusId`; tidak ada token/password/email dalam snapshot UI.
- Tidak ada endpoint bisnis baru, sesi cookie, atau perubahan `dataService = createMockService()` pada P0. Jangan memanggil superuser repository untuk mengakali read rule.

## Pengujian

```powershell
npm run check
npm test
npm run build
npm run test:pb
npm run test:e2e
```

`test:pb` menjalankan binary nyata dengan database baru pada 8097, menguji migrasi/preview, jumlah seed dan idempotensi, akun anonim/nonaktif, Campus A/B, dua admin, kunci mutasi, indeks/validasi, PDF privat/palsu/oversize, riwayat immutable, mapper dan pagination. Proses fixture dihentikan pada akhir tes; direktori fixture tetap diabaikan Git untuk diagnosis. Kredensial tidak dicetak.

E2E browser tetap menguji mockup, **bukan** login/backend end-to-end. Tidak boleh menandai fitur UI PocketBase selesai hanya berdasarkan tes P0.

## Alur Git dan pekerjaan lanjutan

Feature branch berasal dari `development`; push dan PR hanya menargetkan `development`. `main` dibekukan untuk mockup yang direview pengguna. P0 tidak mengubah GitHub default branch atau pengaturan deployment.

Production belum ditentukan: host, pemilik instance, backup, storage, mailer, data resmi, periode, dan transaksi workflow masih harus ditetapkan. Jangan memakai runner/seeder lokal untuk production.

Referensi mekanisme: [migrasi native](https://pocketbase.io/docs/js-migrations/), [API rules](https://pocketbase.io/docs/api-rules-and-filters/), [protected files](https://pocketbase.io/docs/files-handling/), [rilis PocketBase](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.3), [rilis SDK](https://github.com/pocketbase/js-sdk/releases/tag/v0.28.0).
