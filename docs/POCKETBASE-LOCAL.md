# PocketBase lokal DEB — P0 dan P2

## Mode aktif: pengujian lokal

Tab **Akun** kampus dan alur wajib ganti password sementara: lihat [panduan serta QA lokal](AKUN-KAMPUS-LOKAL.md).

Pengguna meminta kembali ke mode lokal untuk pengembangan tab Akun kampus. `.env.local` aktif kembali memakai `http://127.0.0.1:8097`, preview lokal aktif, serta kredensial R2 production dikosongkan. Web tetap di `http://localhost:5176`. Dashboard admin lokal sudah terbuka melalui browser. Pengembangan dan pengujian berikutnya tidak boleh memakai production.

## Riwayat: akses langsung production (sudah dinonaktifkan)

Atas permintaan eksplisit pengguna pada 19 September 2026, `.env.local` sekarang memakai `PB_URL=https://deb-api.pertaminafoundation.org` dan `DEB_LOCAL_PREVIEW_ENABLED=false`. Kredensial server dan R2 diwarisi dari `.env`. Web tetap dibuka melalui `http://localhost:5176`, tetapi penyimpanan data dan berkas langsung ke production.

**Edit, unggah, keputusan, dan tindakan lain dari localhost dapat mengubah production sungguhan.** Gunakan akun production yang sah; pemilih admin/kampus lokal tidak aktif. Jangan menjalankan seed, provisioning, migrasi, impor, atau tes mutasi terhadap konfigurasi ini. Pengaturan Microsoft Entra tidak diubah; keberhasilan login interaktif bergantung pada akun serta callback yang terdaftar. Tautan dokumen yang dibuat dari localhost perlu diperiksa sebelum dibagikan karena sebagian generator memakai origin permintaan.

Konfigurasi lama disimpan di `.local/env-local-offline-backup.txt` tanpa rahasia; database salinan tetap tersedia. Bagian salinan lokal di bawah adalah riwayat, bukan koneksi yang sedang digunakan. Tidak ada commit/push untuk pergantian mode ini.

## Salinan production lokal, 19 September 2026

Checkout terbaru menggunakan API SvelteKit dan PocketBase, bukan mode demo IndexedDB pada README lama. Untuk workspace ini, `.env.local` mengarahkan aplikasi ke salinan terpisah:

- Web: `http://localhost:5176`; PocketBase: `http://127.0.0.1:8097`.
- Direktori privat: `.local/pocketbase/tests/production-copy-1789801517464`. Database lama pada 8096 tetap dipertahankan.
- Menjalankan kembali backend salinan: `npx tsx .local/serve-production-copy.ts`, lalu `npm run dev` pada terminal lain. Helper ini bersifat lokal dan tidak disertakan Git.
- Klik **Keluar**, buka `/login`, pilih **Institut Pertanian Bogor**, lalu **Masuk sebagai Kampus**. Pemetaan akun berbeda dari seed lama; jangan menggunakan sesi lama.
- Pemilih login lokal kini juga menyediakan **Admin PF lokal 1**. Klik **Keluar**, pilih akun pada bagian **Masuk sebagai akun lokal**, lalu **Masuk ke ruang kerja**. Akun admin ini menggunakan database lokal dan tidak memerlukan OAuth Microsoft. QA browser: pilihan admin berhasil membuka `/admin/dashboard` dengan navigasi Admin Program.
- ID dan relasi data sumber dipertahankan. Akun preview lokal ditambahkan dengan password acak; autentikasi Microsoft dinonaktifkan dan SMTP diarahkan ke loopback. Ini bukan salinan konfigurasi autentikasi production.
- Lampiran R2 disalin ke penyimpanan disk lokal; kredensial R2 production dikosongkan pada `.env.local`. Unggahan lokal tidak menulis ke bucket production. Impor lampiran belum selesai pada saat catatan ini dibuat; jangan menganggap semua dokumen sudah tersedia.
- Pembacaan sumber berlangsung bertahap, bukan snapshot transaksi serentak. Jangan mengklaim data identik dengan production yang terus berubah.
- Data dan kredensial privat tidak boleh dibagikan atau di-commit. Workspace berada di OneDrive: `.gitignore` tidak mencegah sinkronisasi OneDrive.

QA browser pada 19 September 2026: login IPB melalui pemilih kampus berhasil; Pencairan menampilkan sembilan butir; LPJ menampilkan keadaan belum ada bukti. Kedua endpoint mengembalikan HTTP 200, bukan lagi pesan kampus bukan penerima gelombang pertama. Tes/check/build terminal tidak dijalankan. Verifikasi seluruh lampiran masih tertunda.

Uraian P0–P4 di bawah adalah riwayat; jangan menjalankan seed/provision lama untuk menimpa salinan ini.

### Warna catatan pemeriksa kampus

Kotak status pada Pencairan kampus memakai oranye untuk perlu revisi, hijau untuk sesuai, biru untuk menunggu pemeriksaan/perlu konfirmasi, serta abu-abu untuk belum ada/tidak diperlukan. Label teks tetap ditampilkan, berikut catatan pemeriksa dan tindak lanjut; aturan unggah dan keputusan tidak berubah.

QA browser lokal: RAB Universitas Sebelas Maret menampilkan kotak oranye **Perlu revisi** beserta catatan over budget; RAB IPB menampilkan kotak hijau **Sesuai**. Screenshot: `.playwright-mcp/catatan-revisi-berwarna.png`. Tes terminal tidak dijalankan.

> **Status aktif P4 lokal (10 September 2026):** master kampus/lokasi dan indikator bersama tersedia. Baseline/target sama untuk seluruh kampus; aktual/catatan tetap per kampus. P1 masih BELUM. Acuan aktif: [POCKETBASE-P4.md](POCKETBASE-P4.md). Uraian P0/P2/P3 atau prototype di bawah dipertahankan sebagai riwayat; pernyataan mock/Dexie/read-only lama bukan kondisi runtime sekarang.

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

P0 menyediakan backend; P2 menyambungkan **semua pembacaan website ke PocketBase**, tanpa Dexie atau fallback mock. Data seed database tetap dipertahankan. P1 sesi/login nyata ditunda; pemilih akun seed hanya bekerja di dev server lokal. P3 workflow tulis belum aktif.

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

Untuk checkout baru, salin `.env.example` ke `.env` tanpa menimpa konfigurasi yang sudah ada. Pastikan `PB_URL=http://127.0.0.1:8096` dan `DEB_LOCAL_PREVIEW_ENABLED=true`. Restart Vite setelah mengubah env. Seeder tidak perlu dijalankan bila database sudah berisi data; P2 tidak menghapus data tersebut.

- Dashboard PocketBase: `http://127.0.0.1:8096/_/`.
- Website PocketBase-only: `http://127.0.0.1:5176`.
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

Seed menggunakan baseline `createSeed()` di `scripts/fixtures/seed.ts`, bukan isi IndexedDB pengguna. Generator tidak lagi berada di runtime frontend. Isi awal:

| Data | Jumlah |
|---|---:|
| Kampus / definisi indikator / nilai indikator | 40 / 30 / 1.200 |
| Akun kampus / admin aplikasi | 40 / 2 |
| Pengajuan / feedback / versi proposal PDF | 6 / 10 / 52 |
| Pertanyaan / jawaban / like / FAQ | 6 / 3 / 70 / 2 |
| Aktivitas / notifikasi | 40 / 31 |

Jumlah notifikasi lebih banyak daripada mock role-based karena setiap notifikasi admin dibuat untuk kedua akun secara terpisah. `simulated=true` menandai fixture; lokasi diberi `locationApproximate=true`. Nama kampus mengikuti roster, tetapi nilai, dokumen, akun, dan transaksi tetap contoh development.

Seeder mencari `legacyId`, membuat yang belum ada, dan tidak memperbarui record lama. Password dihasilkan acak dan disimpan sebelum create akun, sehingga seed terputus dapat dilanjutkan. Rerun tidak mengaktifkan kembali akun nonaktif, mereset password, atau memperbarui nilai master yang telah diedit. Konflik unik di luar `legacyId` akan gagal dengan error, bukan mengambil alih record. Tidak ada perintah reset database otomatis.

ID PocketBase dipetakan ke seluruh relasi, snapshot, lokasi dan segmen tautan notifikasi. Mapper lokasi menyediakan ID asli + latitude/longitude; peta UI P2 memakai lokasi database dan tidak menebak ID dari urutan array.

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
- P2 menyediakan `GET /api/dev/accounts`, `GET /api/bootstrap`, dan `GET /api/proposals/[id]/file`. Browser mengirim key preview melalui header khusus; server melakukan autentikasi akun seed dan pemeriksaan scope. Tidak ada endpoint tulis bisnis atau sesi production. Semua respons data/file `no-store`; jangan memakai superuser repository untuk mengakali read rule.

## Pengujian

```powershell
npm run check
npm test
npm run build
npm run test:pb
npm run test:e2e
```

`test:pb` menjalankan binary nyata dengan database baru pada 8097, menguji migrasi/preview, jumlah seed dan idempotensi, akun anonim/nonaktif, Campus A/B, dua admin, kunci mutasi, indeks/validasi, PDF privat/palsu/oversize, riwayat immutable, mapper dan pagination. Proses fixture dihentikan pada akhir tes; direktori fixture tetap diabaikan Git untuk diagnosis. Kredensial tidak dicetak.

E2E browser P2 menjalankan aplikasi pada port 5179 dan backend fixture pada 8097. Tes membaca data/file PocketBase nyata, memeriksa scope, readonly, perubahan database setelah refresh, serta error tanpa fallback. Ini belum menguji autentikasi production P1 atau workflow tulis P3.

## Sinkronisasi jenis RAB lokal — 19 September 2026

Pull kode tidak otomatis memperbarui skema database. Jika halaman pencairan/revisi menampilkan `Failed to create record.`, periksa apakah `documents.kind` sudah memuat `rab_penuh` dan `rab_tahap2`. Kode membuat slot RAB tersebut saat halaman dibuka.

Pada instance lokal `production-copy-1789801517464` (127.0.0.1:8097), kedua pilihan ditambahkan tanpa menghapus pilihan/data lama, setelah backup `before-local-rab-kinds-20260919-160443.zip`. Production tidak disentuh. QA browser pada `/admin/pencairan/zx9sut1o7jm2szn/revisi` berhasil menampilkan kontak kampus dan empat butir revisi, tanpa alert gagal membuat record. Tes terminal tidak dijalankan.

## Edit Profil Program oleh kampus — 19 September 2026

Semua akun berperan `campus` dapat mengubah Profil Program milik kampusnya sendiri tanpa bergantung pada `fillMode`. Tombol Ubah tersedia pada kontak, lokasi, informasi, dan deskripsi program. Admin tetap dapat mengedit. Validasi isian, batas kepemilikan kampus, pembatasan sesi, dan riwayat perubahan tetap berlaku. Aturan `fillMode` pada pencairan/LPJ tidak diubah.

QA browser lokal: akun preview Politeknik Negeri Kupang sebelumnya ditolak 403 karena `fillMode`; sesudah perubahan dapat menyimpan nama mentor melalui formulir dan hasilnya bertahan setelah refresh. Nama asli sudah dipulihkan; audit QA dipertahankan. Enam tombol Ubah tampil. PATCH kampus lain ditolak 403 dan field `fillMode` yang bukan isian profil ditolak 400. Tes terminal tidak dijalankan.

Pemeriksaan regresi tanpa mengubah data, melalui Console browser setelah login sebagai kampus pada localhost (akan gagal bila pembatasan `fillMode` diberlakukan kembali pada kampus mode admin):

```js
await (async () => {
  if (location.hostname !== 'localhost') throw Error('Khusus lokal');
  const key = sessionStorage.getItem('deb-standalone-demo-account');
  const headers = { 'Content-Type': 'application/json', ...(key ? { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': key } : {}) };
  const { session } = await (await fetch('/api/session', { headers })).json();
  if (session?.role !== 'campus') throw Error('Masuk sebagai kampus');
  const response = await fetch(`/api/campuses/${session.campusId}/program`, { method: 'PATCH', headers, body: '{}' });
  if (response.status !== 200) throw Error(`Edit profil ditolak: ${response.status}`);
  return 'Akses edit profil sendiri tersedia';
})();
```

## Alur Git dan pekerjaan lanjutan

Catatan QA 19 September 2026 setelah pull `554c98c`: migrasi RAB share, relasi dokumen review, dan aturan baca audit diterapkan hanya pada salinan lokal setelah backup `before-production-schema-554c98c-20260919-171714.zip`. Sebanyak 21 versi RAB lokal mendapat nilai share memakai heuristik skrip yang sudah ada. Halaman ringkasan revisi dan grant realtime (200) diperiksa melalui browser. Ini pembaruan schema lokal, bukan bukti seluruh isi data sama dengan production terkini.

Alur akun tidak memerlukan field baru di production; lihat [akun kampus](AKUN-KAMPUS-LOKAL.md). Publikasi terbaru mengikuti izin eksplisit pengguna ke GitLab `production`, bukan ketentuan feature branch historis P0 di bawah.

Feature branch berasal dari `development`; push dan PR hanya menargetkan `development`. `main` dibekukan untuk mockup yang direview pengguna. P0 tidak mengubah GitHub default branch atau pengaturan deployment.

Production belum ditentukan: host, pemilik instance, backup, storage, mailer, data resmi, periode, dan transaksi workflow masih harus ditetapkan. Jangan memakai runner/seeder lokal untuk production.

Referensi mekanisme: [migrasi native](https://pocketbase.io/docs/js-migrations/), [API rules](https://pocketbase.io/docs/api-rules-and-filters/), [protected files](https://pocketbase.io/docs/files-handling/), [rilis PocketBase](https://github.com/pocketbase/pocketbase/releases/tag/v0.40.3), [rilis SDK](https://github.com/pocketbase/js-sdk/releases/tag/v0.28.0).
