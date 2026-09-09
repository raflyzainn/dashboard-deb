# Checkpoint migrasi dashboard-deb ke PocketBase

Tanggal baseline: 9 September 2026. Status berdasarkan pemeriksaan source code lokal, bukan pemeriksaan instance PocketBase atau deployment.

Dokumen ini menjadi daftar kerja dan pencatat progres migrasi dari data lokal/dummy ke PocketBase. **Belum ada fitur DEB yang terhubung ke PocketBase pada baseline ini.** Pembuatan dokumen tidak mengubah aplikasi, memasang SDK, membuat koleksi, atau memindahkan data.

## 1. Pola proyek pembanding

Folder `demo-aplikasi-desa-energi-berdikari-main` tidak digunakan sebagai referensi. Proyek lain tidak semuanya memiliki backend yang identik:

| Proyek | Bukti source yang diperiksa | Pola yang relevan |
|---|---|---|
| PF Series | [client server](../pf-series-1/src/lib/server/pocketbase.js), [login API](../pf-series-1/src/routes/api/auth/login/+server.js), folder `db-schema/` | API SvelteKit, `createUserPB(token)` dan `createAdminPB()`. URL memakai `VITE_PB_URL`, akses istimewa memakai `PB_SUPER_TOKEN` privat. |
| ElectronicMonevPF | [client server](../ElectronicMonevPF/src/lib/server/pocketbase.js), folder `src/routes/api/` | Factory user/admin serupa PF Series; handler API memanggil PocketBase dari server. |
| pfprojects | [client server](../pfprojects/src/lib/server/pocketbase.js), [hooks](../pfprojects/src/hooks.server.js) | `PB_URL`, autentikasi superuser melalui email/password privat, sesi aplikasi terverifikasi, role/status akun diperiksa server. Otorisasi dan pembatasan cakupan ada di service server. |
| pffriends | [client server](../pffriends/src/lib/server/pocketbase.js), folder `src/routes/api/` dan `scripts/pocketbase/` | `PB_URL`, factory user terpisah dari superuser, kredensial privat, pengelolaan schema melalui script. |
| dashboard-sesama | [README](../dashboard-sesama/README.md), [package.json](../dashboard-sesama/package.json) | Alur Google Sheets → generator → JSON server; bukan acuan PocketBase. |

Arsitektur DEB yang dituju mengikuti pola bersama proyek PocketBase tersebut:

```text
Halaman Svelte → state → DataService HTTP → /api/* SvelteKit
                                              ↓
                              sesi + role + validasi + scope
                                              ↓
                              client PocketBase khusus server
                                              ↓
                                   koleksi dan file PocketBase
```

Usulan konvensi DEB: `PB_URL`, client user per request, dan client admin terpisah dengan `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` privat seperti PFriends. Ini pilihan rancangan, belum konfigurasi aktif. Jangan mencampur skema sesi Planner dengan token user PocketBase tanpa adapter yang jelas. Akun Admin PF adalah user aplikasi ber-role `admin`, bukan akun `_superusers`.

Semua endpoint harus menentukan identitas dari sesi server. `actor`, `role`, `campusId`, penulis, penerima notifikasi, dan waktu dari browser bukan sumber otorisasi. Jika memakai superuser, aturan koleksi dilewati: pengecekan kepemilikan dan field yang boleh berubah wajib dilakukan sebelum operasi server. Gunakan client user ketika sesuai agar aturan koleksi ikut berlaku.

## 2. Kondisi DEB yang harus diganti

| Sumber sekarang | Temuan | Target |
|---|---|---|
| [service.ts](src/lib/data/service.ts) | `dataService = createMockService()`, Dexie `deb-prototype-v1`, satu snapshot `state/main` dan tabel Blob `files` | Adapter HTTP dan koleksi terpisah; PocketBase menjadi sumber data utama |
| [state.svelte.ts](src/lib/state.svelte.ts) | `deb-demo-session` di sessionStorage; login memilih role, kampus terkunci ke `DEMO_CAMPUS` | Login akun nyata, sesi server, state UI hanya menampung hasil API |
| [types.ts](src/lib/types.ts) | `DemoSession`, `Snapshot`, kontrak `DataService` | DTO sesi nyata dan mapper record/relasi PocketBase ke data UI |
| [seed.ts](src/lib/data/seed.ts) | 30 definisi contoh, angka baseline/target/aktual, aktivitas, forum, FAQ, notifikasi dan proposal contoh | Referensi yang disahkan dan transaksi pengguna nyata |
| [campuses.ts](src/lib/data/campuses.ts) | Roster 40 kampus dari daftar pengguna/dokumen, masih ditulis di kode | Master `campuses`; roster ini kandidat impor, bukan seluruhnya nama dummy |
| [map.ts](src/lib/map.ts) | Koordinat perkiraan kota, hubungan kampus dibentuk dari urutan `campus-001` dst. | Lokasi terverifikasi berelasi ke ID kampus PocketBase |
| [verification.ts](src/lib/verification.ts) dan service | Snapshot pengajuan/keputusan tersimpan lokal; ada `demoSubmissions()` | Riwayat pengajuan dan keputusan server yang tidak kehilangan snapshot |
| [layout aplikasi](src/routes/(app)/+layout.svelte) dan [layout root](src/routes/+layout.ts) | Guard browser; SSR dimatikan untuk demo | Guard server untuk halaman/API; tinjau ulang SSR dan inisialisasi browser |
| [Shell.svelte](src/lib/components/Shell.svelte) dan [login](src/routes/login/+page.svelte) | Reset demo, ganti peran dan label simulasi | Navigasi sesi nyata; kontrol demo hanya pada mode demo terisolasi |

Dokumen [POCKETBASE.md](docs/POCKETBASE.md) tetap menjadi referensi kontrak. Checklist ini menambahkan pelacakan pengajuan verifikasi, peta, notifikasi, serta kriteria selesai. [Audit implementasi](docs/AUDIT-IMPLEMENTASI-DEB.md) memuat beberapa temuan historis yang sudah berubah; gunakan source terkini untuk status roster, forum, notifikasi dan verifikasi.

## 3. Cara mencatat progres

Status: `BELUM` → `PROSES` → `SEBAGIAN` → `SELESAI`; gunakan `TERHAMBAT` beserta alasannya bila ada dependensi. `—` berarti tidak berlaku, bukan selesai.

Pada matriks berikut, isi kolom Baca/Tulis/Uji dengan `BELUM`, `PROSES`, atau `OK`. Baca berarti UI benar-benar menerima data PocketBase. Tulis berarti perubahan tersimpan di PocketBase, bukan sekadar UI berubah. Uji berarti alur dan akses diuji terhadap backend. Catat commit, lingkungan, tanggal, serta bukti pengujian pada log bagian 10.

Fitur baru boleh `SELESAI` bila semua kolom yang berlaku `OK`, tidak memakai fallback dummy, dan hasil terlihat dari sesi/browser lain yang berhak. Schema yang sudah dibuat saja belum berarti fitur selesai. Data dummy yang dimasukkan ke PocketBase membuktikan integrasi, bukan kesiapan data produksi.

## 4. Matriks fitur dan data

Semua nama koleksi berikut merupakan usulan; belum dibuat. Tulis master dapat melalui script/admin PocketBase, tidak harus menambah layar CRUD baru.

| ID | Fitur / data | Koleksi target | Baca | Tulis | Uji | Status |
|---|---|---|---|---|---|---|
| M01 | Login, sesi, logout, role dan kampus akun | `users` (auth) | BELUM | BELUM | BELUM | BELUM |
| M02 | Daftar/detail kampus, profil penulis forum | `campuses` | BELUM | BELUM | BELUM | BELUM |
| M03 | Katalog indikator, kategori, satuan, deskripsi | `indicator_definitions` | BELUM | BELUM | BELUM | BELUM |
| M04 | Baseline, target, aktual dan catatan kampus | `campus_indicators` | BELUM | BELUM | BELUM | BELUM |
| M05 | Kirim DEB, antrean review, keputusan dan riwayat | `deb_submissions` | BELUM | BELUM | BELUM | BELUM |
| M06 | Feedback indikator, respons dan penutupan revisi | `indicator_feedback` | BELUM | BELUM | BELUM | BELUM |
| M07 | Upload proposal, metadata dan versi | `proposal_versions` | BELUM | BELUM | BELUM | BELUM |
| M08 | Lihat/unduh PDF dan perbandingan dua versi | File pada `proposal_versions` | BELUM | — | BELUM | BELUM |
| M09 | Forum bersama, kategori, pencarian pertanyaan/jawaban | `questions`, `question_answers` | BELUM | BELUM | BELUM | BELUM |
| M10 | Like per kampus dan peringkat pertanyaan | `question_likes` | BELUM | BELUM | BELUM | BELUM |
| M11 | Promosi/tambah/edit/urut/hapus FAQ | `faq_entries` | BELUM | BELUM | BELUM | BELUM |
| M12 | Aktivitas kampus dan ringkasan aktivitas Admin | `activities` | BELUM | BELUM | BELUM | BELUM |
| M13 | Notifikasi, badge belum dibaca, tandai dibaca | `notifications` | BELUM | BELUM | BELUM | BELUM |
| M14 | Dashboard, progres, jumlah proposal dan tindak lanjut | Agregasi M02–M07, M12–M13 | BELUM | — | BELUM | BELUM |
| M15 | Sebaran kampus, lokasi dan ringkasan wilayah | Lokasi di `campuses` + agregasi M04 | BELUM | BELUM | BELUM | BELUM |

Ringkasan baseline: **0 dari 15 area selesai**. Perbarui angka ini bersamaan dengan matriks, bukan berdasarkan jumlah koleksi.

### Detail schema dan batas akses

| Koleksi | Field/relasi minimum yang direncanakan | Batasan penting |
|---|---|---|
| `users` | email/password auth, name, role `campus/admin`, campus, active | Campus terhubung satu kampus; tidak boleh mengubah role/campus/active sendiri. Rancangan awal satu akun per kampus mengikuti kontrak lama; validasi kebutuhan sebelum provisioning. |
| `campuses` | name, initials, acronym, region, city, source, province, island, latitude, longitude, legacyId opsional | Identitas penulis forum dapat dibaca akun login; hindari mengirim profil sensitif jika kelak ditambahkan. Validasi lokasi sebelum impor. |
| `indicator_definitions` | name, category, unit, description, kode stabil | Read-only bagi Campus. Katalog resmi dan tipe indikator perlu disahkan sebelum produksi. |
| `campus_indicators` | campus, definition, baseline, target, current, note | Unik `(campus, definition)` untuk model sekarang; Campus hanya mengubah current/note miliknya. Bila periode ditambahkan, sesuaikan kunci unik. |
| `deb_submissions` | campus, version, status, snapshot indikator JSON, submittedBy, submittedAt, reviewedBy, reviewedAt, decisionNote | Unik `(campus, version)`, satu pengajuan pending per kampus. Snapshot immutable; keputusan hanya Admin. Snapshot menyimpan definisi/target yang diperlukan agar riwayat tidak berubah ketika master diedit. |
| `indicator_feedback` | campus, indicator, author, text, requiresRevision, state | `open/responded/closed`; Admin membuat/menutup, workflow pembaruan indikator mengubah respons. Konsistensi campus dengan indicator wajib dicek. |
| `proposal_versions` | campus, version, file, filename, size, changes, uploadedBy | Unik `(campus, version)`; file PDF dan metadata versi lama immutable. Pemilik kampus dan Admin saja yang boleh mengakses. |
| `questions` | campus, author, title, body, categoryIds | Forum bersama untuk semua akun login; hanya Campus membuat. Kategori harus lolos validasi katalog. |
| `question_answers` | question, author, body | Satu jawaban resmi per question, hanya Admin menulis/memperbarui. |
| `question_likes` | question, campus | Unik `(question, campus)`; Campus hanya mengelola miliknya. Hitungan mengikuti seluruh forum, bukan hanya penulis sendiri. |
| `faq_entries` | question opsional, teks question/answer, order | Admin mengelola. Sumber question unik bila terisi; FAQ manual tanpa sumber tetap boleh lebih dari satu. Simpan salinan konten. |
| `activities` | campus, actor, eventType, text, relasi sumber | Dibuat server dari workflow, dibaca pemilik atau Admin. Retensi ditetapkan terpisah; jangan menyalin pemotongan global 200 item mock sebagai penghapusan audit produksi. |
| `notifications` | recipientUser, campus, eventType, sourceId, title, body, target, readAt | Penerima adalah akun nyata; status baca per akun, termasuk antaradmin. Deduplikasi per event/penerima; hanya pemilik menandai dibaca. |

Gunakan field waktu bawaan record bila sesuai dan mapper ke `createdAt/updatedAt` DTO. Waktu keputusan/pengajuan ditetapkan server. Relasi PocketBase dipetakan ke `campusId`, `definitionId`, dan `questionId` UI. ID lama bukan ID PocketBase: simpan `legacyId` bila impor diperlukan, lalu petakan seluruh relasi, snapshot, lokasi dan tautan notifikasi. Khusus peta, hapus asumsi ID berdasarkan urutan array.

## 5. Tahapan implementasi

### P0 — Fondasi dan keputusan data

- [ ] Tentukan instance DEB development dan production, versi PocketBase yang dipakai, pengelola schema, serta penyimpanan file; jangan memakai database proyek pembanding sebagai target tanpa keputusan eksplisit.
- [ ] Tetapkan katalog indikator, baseline/target, arti nilai kosong, rumus capaian dan kebutuhan periode. Angka serta rumus demo belum menjadi aturan resmi.
- [ ] Validasi roster 40 kampus dan lokasi; siapkan data master yang dapat diimpor ulang tanpa duplikasi.
- [ ] Tetapkan provisioning akun Campus/Admin, penonaktifan, dan pemulihan password. SSO bukan prasyarat migrasi kecuali kemudian diminta.
- [ ] Tambahkan dependency `pocketbase`, `.env.example` tanpa secret, validasi konfigurasi server, dan petunjuk setup.
- [ ] Buat `src/lib/server/pocketbase.ts`, service/repository server, dan mapper DTO.
- [ ] Buat schema versioned di `db-schema/` serta script dalam `scripts/` dengan preview/dry-run dan apply yang jelas. Pin dan uji kompatibilitas mekanisme migrasi terhadap versi target.
- [ ] Definisikan rules, indeks unik, field wajib, validasi dan kebijakan hapus relasi; cegah hilangnya riwayat karena cascade yang tidak disengaja.
- [ ] Buat fixture backend terisolasi: Admin, Kampus A, Kampus B; pisahkan seed pengujian dari data operasional.

### P1 — Autentikasi dan akses

- [ ] Tambahkan `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` dan `src/hooks.server.ts`; isi `event.locals` dari sesi terverifikasi.
- [ ] Gunakan cookie sesi HttpOnly, SameSite, Secure pada HTTPS, serta konfigurasi localhost yang sesuai; validasi origin/CSRF untuk mutasi berbasis cookie.
- [ ] Verifikasi masa berlaku sesi dan status akun; pencabutan akses harus berlaku pada request berikutnya sesuai kebijakan sesi.
- [ ] Ganti pemilihan role di login dan `sessionStorage` sebagai sumber identitas; hapus ketergantungan `DEMO_CAMPUS` pada mode backend.
- [ ] Guard halaman dan setiap endpoint: unauthenticated ditolak, role salah ditolak, Campus A tidak dapat membaca/mengubah data kerja Campus B.
- [ ] Jangan percaya `DemoSession` dari parameter `DataService`. Ubah kontrak agar browser tidak menentukan actor otoritatif; UI menerima profil dari server.
- [ ] Tambahkan provisioning/reset password sesuai keputusan P0; bila memakai email PocketBase, konfigurasi dan uji mailer serta tautan reset di instance DEB.

### P2 — Pembacaan data

- [ ] Tambahkan adapter HTTP, misalnya `src/lib/data/api-service.ts`, dan pemilihan mode eksplisit. Konfigurasi backend gagal harus menampilkan error, bukan otomatis membuat seed.
- [ ] Implementasikan `load()` melalui `/api/bootstrap` atau endpoint per fitur; server membatasi field dan cakupan sebelum mengirim respons.
- [ ] Migrasikan master kampus, definisi, indikator, pengajuan, feedback, proposal, forum, FAQ, aktivitas dan notifikasi sesuai matriks M01–M15.
- [ ] Atur pagination/filter/sort server. Jangan menghitung KPI global dari satu halaman data; gunakan agregasi lengkap atau endpoint ringkasan.
- [ ] Pertahankan forum lintas kampus; indikator/proposal/feedback/aktivitas/pengajuan tetap privat per kampus, notifikasi privat per akun.
- [ ] Migrasikan lokasi peta; koordinat kosong/invalid harus ditangani tanpa membuat posisi palsu.
- [ ] Ganti pesan error penyimpanan browser menjadi pesan jaringan/server yang tepat; sediakan loading, empty state, retry dan input yang tetap tersimpan saat gagal.

### P3 — Mutasi dan workflow

Daftar ini mencakup seluruh metode mutasi pada `DataService` saat baseline. Nama endpoint merupakan rancangan baru, bukan route yang sudah tersedia.

| Metode sekarang | Endpoint usulan | Perilaku yang wajib dipertahankan di server |
|---|---|---|
| `updateIndicator` | `PATCH /api/indicators/[id]` | Angka finite/nonnegatif, note maksimal 5000, milik kampus; tolak saat pending; feedback revisi open → responded. |
| `submitDeb` | `POST /api/submissions` | Validasi isian, simpan snapshot dan versi, cegah pending ganda; pengajuan approved yang belum berubah tidak dikirim ulang. |
| `reviewDeb` | `POST /api/submissions/[id]/review` | Hanya pending; keputusan approved/revision; catatan revisi wajib; tolak snapshot stale dan approval dengan revisi belum ditutup. |
| `addFeedback` | `POST /api/indicators/[id]/feedback` | Admin, teks valid; catatan biasa closed, permintaan revisi open; kampus diturunkan dari indikator. |
| `closeFeedback` | `POST /api/feedback/[id]/close` | Admin; idempotent bila sudah closed. |
| `uploadProposal` | `POST /api/proposals` | Validasi PDF di server, maksimal 10 MB sesuai kontrak sekarang; versi dibuat server, metadata dan file konsisten. |
| `proposalFile` | `GET /api/proposals/[id]/file` | Cek akses setiap permintaan; kirim Blob yang dapat dipakai preview/unduh/diff. |
| `ask` | `POST /api/questions` | Campus, judul maksimal 180, isi maksimal 5000, kategori valid. |
| `answer` | `PUT /api/questions/[id]/answer` | Admin, satu jawaban resmi; pembaruan tidak menggandakan record. |
| `toggleLike` | `PUT/DELETE /api/questions/[id]/like` | Pertahankan UI toggle, tetapi kirim state tujuan agar retry tidak membalik ulang; unik per kampus. |
| `promoteFaq` | `POST /api/questions/[id]/faq` | Harus sudah dijawab, sumber tidak ganda, simpan salinan jawaban. |
| `saveFaq` | `POST /api/faq`, `PATCH /api/faq/[id]` | Admin; tambah/edit dan validasi teks. |
| `moveFaq` | `POST /api/faq/[id]/move` | Admin; pertukaran urutan konsisten saat ada request bersamaan. |
| `deleteFaq` | `DELETE /api/faq/[id]` | Admin; pertanyaan sumber tidak ikut terhapus. |
| `readNotifications` | `POST /api/notifications/read` | Hanya ID milik akun, termasuk aksi semua; tidak menandai notifikasi admin lain. |
| `reset` | Tidak ada endpoint production | Khusus demo; jangan menyediakan reset seluruh data backend dari UI. |

- [ ] Implementasikan setiap metode di tabel dan perbarui kolom Tulis pada matriks secara terpisah.
- [ ] Buat aktivitas/notifikasi dari event server sesuai workflow; jangan menerima teks audit/penerima sebagai keputusan browser.
- [ ] Tetapkan konsistensi untuk operasi multi-record. Beberapa request REST berurutan dari SvelteKit bukan transaksi database.
- [ ] Uji mekanisme atomik yang tersedia pada versi PocketBase target (misalnya batch transaksional yang sesuai atau operasi server PocketBase). Tetap gunakan indeks unik dan kontrol konflik untuk kondisi baca-lalu-tulis; batch saja tidak menyelesaikan perlombaan nomor versi.
- [ ] Bila transaksi lintas record/event tidak memungkinkan, desain status operasi dan retry/outbox yang tahan kegagalan. Jangan menampilkan sukses saat data utama belum tersimpan; jangan menggandakan versi/notifikasi saat request diulang.
- [ ] Uji dua reviewer, dua upload bersamaan, submit bersamaan, reorder FAQ dan like bersamaan.
- [ ] Lindungi file di PocketBase juga; proxy API saja tidak cukup jika URL file langsung masih publik. Uji akses langsung tanpa sesi dan dari kampus lain.
- [ ] Sesuaikan batas request upload pada deployment frontend dengan PDF 10 MB; pilih jalur upload terotorisasi lain bila batas platform tidak mencukupi, lalu uji end-to-end.

### P4 — Peralihan UI, data dan deployment

- [ ] Pastikan dashboard, detail kampus, indikator, verifikasi, proposal, forum, FAQ, notifikasi dan peta semuanya menggunakan adapter backend.
- [ ] Hapus pembacaan seed dan fallback contoh dari mode backend; jangan menampilkan angka tetap 40/30 sebagai fakta bila master backend berbeda.
- [ ] Pisahkan penyimpanan demo dan cache backend. Jika Dexie dipertahankan sebagai cache, beri namespace akun/lingkungan, invalidasi saat logout, dan jangan menjadikannya sumber kebenaran.
- [ ] Putuskan penanganan data kerja lokal yang sudah ada. Default: tidak mengimpor transaksi dummy. Bila unggahan/isian lokal nyata perlu diselamatkan, buat ekspor terpilih beserta Blob, preview, mapping ID, deduplikasi, dan laporan impor.
- [ ] Nonaktifkan login pilih role, ganti peran bebas, reset demo dan label simulasi pada mode operasional setelah data resmi siap.
- [ ] Pertahankan route eksplisit `src/routes/(app)/campus/*` dan `admin/*`; tinjau `ssr = false` tanpa memindahkan file ke routing dinamis.
- [ ] Tambahkan mekanisme refresh lintas pengguna yang jelas: refetch setelah mutasi/navigasi dan polling bila dibutuhkan. Realtime opsional; bila dipilih, periksa otorisasi subscription.
- [ ] Sinkronkan README dan `docs/POCKETBASE.md` dengan arsitektur akhir, konfigurasi, schema dan perintah aktual.
- [ ] Terapkan schema dan konfigurasi development, uji, lalu siapkan backup database/file dan prosedur pemulihan sebelum penerapan production.
- [ ] Verifikasi deployment frontend dan schema/backend secara terpisah. Rollback aplikasi harus kompatibel dengan schema; jangan kembali diam-diam ke dummy atau menghapus data PocketBase.

## 6. Cakupan halaman yang harus diperiksa

| Halaman | Dependensi matriks |
|---|---|
| `/login`, `/`, layout aplikasi | M01 |
| `/campus/dashboard`, `/admin/dashboard` | M02–M07, M12–M14 |
| `/admin/campuses`, `/admin/campuses/[id]` | M02–M08, M12, M14 |
| `/campus/indicators`, `/admin/indicators` | M03–M06 |
| `/admin/verifikasi` | M02–M06 |
| `/campus/proposal`, `/admin/proposal` | M02, M07–M08 |
| `/campus/questions`, `/admin/questions`, detail `[id]` keduanya | M02, M09–M10 |
| `/campus/faq`, `/admin/faq` | M11 |
| `/campus/notifications`, `/admin/notifications`, lonceng/badge | M13 |
| `/admin/sebaran` | M02, M04, M14–M15 |

## 7. Yang tidak perlu dipindah menjadi tabel

- Komponen tampilan, warna, ikon, layout, geometri peta Indonesia pada `indonesia-map.ts`, serta state pencarian/modal tetap di frontend.
- `domain.ts` dan helper `verification.ts` yang murni menghitung dapat dipakai ulang; keputusan bisnis yang mengubah data tetap divalidasi server. Rumus resmi harus disepakati sebelum produksi.
- `proposal-diff.ts`, `pdf-text.ts` dan `ProposalCompare.svelte` tetap dapat membandingkan teks di browser; kedua PDF harus berasal dari akses backend yang sah.
- Katalog kategori forum di `forum.ts` dapat tetap menjadi konstanta bersama UI/server jika tidak perlu dikelola Admin; `categoryIds` pertanyaan tetap disimpan di PocketBase.
- `samplePdf`, `createSeed`, `demoSubmissions`, `notificationSeedVersion`, dan `campusRosterVersion` adalah mekanisme fixture/demo, bukan data transaksi production.

Ekspor rekap, model desa binaan, level DEB lanjutan, email/push notifikasi dan diskusi multibalasan adalah pengembangan terpisah bila disepakati. Jangan menganggapnya sudah tersedia hanya karena migrasi database selesai.

## 8. Kriteria verifikasi selesai

- [ ] Jalankan `npm run check`, `npm test`, `npm run build`; catat hasil aktual. Tes mock yang lulus tidak membuktikan integrasi PocketBase.
- [ ] Adaptasikan/tambahkan tes integrasi backend dan browser di `tests/browser/` dengan instance uji; jalankan `npm run test:e2e` untuk alur backend yang dikonfigurasi.
- [ ] Login Admin, Kampus A dan Kampus B di konteks browser terpisah; buktikan persistensi setelah refresh/logout/login dan keterlihatan pada akun yang berhak.
- [ ] Panggil API langsung dengan role/campusId palsu, ID kampus lain dan sesi kedaluwarsa; backend menolak tanpa membocorkan data.
- [ ] Jalankan siklus indikator → submit → revisi → ubah isian → tutup feedback → submit/review sesuai state → approved, termasuk riwayat snapshot.
- [ ] Upload dua PDF nyata, unduh dari sesi lain yang berhak, bandingkan teks, uji file palsu/terlalu besar dan akses file tanpa izin.
- [ ] Uji forum lintas kampus, pencarian teks jawaban, kategori, like unik, jawaban Admin, promosi FAQ dan reorder.
- [ ] Buktikan notifikasi dan status baca per penerima, termasuk dua Admin; refresh tidak menggandakan event.
- [ ] Uji kegagalan backend, retry, konkurensi dan data kosong tanpa fallback dummy; hasil agregasi/peta cocok dengan record backend.
- [ ] Simpan bukti tanpa password/token: commit, lingkungan, akun QA berlabel, perintah/hasil, serta path trace/screenshot jika dibuat.

## 9. Keputusan yang masih terbuka

| Keputusan | Status baseline | Dampak |
|---|---|---|
| URL/versi instance DEB dan pengelolanya | Belum ditetapkan | Konfigurasi, schema, transaksi dan deployment |
| Katalog indikator, rumus, periode dan baseline/target resmi | Belum disahkan dalam migrasi ini | Schema serta validitas hasil dashboard |
| Akun per kampus, jumlah Admin dan provisioning | Rancangan awal satu akun/kampus; perlu validasi | Indeks akun, penerima notifikasi, pemulihan akses |
| Lokasi kampus operasional | Kode masih koordinat perkiraan | Akurasi peta |
| Data lokal yang perlu diselamatkan | Belum dipilih | Kebutuhan ekspor/impor; tidak menghapus data lokal |
| Mekanisme transaksi, retry dan pengiriman event | Belum dipilih/diuji | Integritas versi, review dan notifikasi |

Keputusan ini tidak menghalangi penyiapan adapter dan fixture terisolasi, tetapi harus diselesaikan sebelum memasukkan data operasional dan menyatakan production siap.

## 10. Log checkpoint

| Tanggal | ID/tahap | Perubahan | Baca/Tulis/Uji | Bukti | Sisa pekerjaan |
|---|---|---|---|---|---|
| 2026-09-09 | Baseline | Pemeriksaan source DEB dan pola proyek pembanding; dokumen dibuat | Semua integrasi BELUM | File sumber pada bagian 1–2; tidak ada pengujian runtime backend | P0 lalu P1–P4 |

Salin format ini untuk setiap pekerjaan berikutnya:

```markdown
### YYYY-MM-DD — Mxx / Pn — Judul perubahan

- Status: BELUM / PROSES / SEBAGIAN / SELESAI / TERHAMBAT
- Lingkungan dan commit:
- File/endpoint/koleksi yang berubah:
- Pembacaan PocketBase: BELUM / PROSES / OK
- Penulisan PocketBase: BELUM / PROSES / OK / tidak berlaku
- Verifikasi: perintah, hasil, bukti browser/API dan batas pengujian
- Sumber dummy yang masih digunakan:
- Schema sudah diterapkan pada lingkungan mana:
- Sisa pekerjaan atau keputusan yang dibutuhkan:
```

Checklist selesai harus selalu merujuk hasil implementasi dan verifikasi, bukan hanya rencana atau keberadaan dokumen ini.
