# Digitalisasi DEB

> Update 10 September 2026: pembacaan frontend sudah [dipisah per halaman](docs/API-PER-HALAMAN.md). Endpoint bootstrap dihapus; bagian lama yang menyebut bootstrap adalah arsitektur sebelumnya.

**Update P1 lokal (10 September 2026):** login email/password, PIC persisten dan aktivasi melalui email tersedia. Buka `/login`; opsi QA tetap khusus development. `npm run mail:serve` membuka inbox pengujian di http://127.0.0.1:8025. SMTP eksternal tetap TODO. Lihat [panduan P1](docs/POCKETBASE-P1.md). Mockup login dihapus.

**Riwayat P4 lokal (10 September 2026):** Admin dapat mengelola kampus/lokasi serta master indikator dengan **baseline dan target yang sama untuk semua kampus**. Aktual/catatan dan riwayat pengajuan tetap per kampus. Definisi baru disimpan sebagai draft; aktivasi dan edit indikator aktif dikunci selama ada pengajuan pending. Lihat [kontrak P4](docs/POCKETBASE-P4.md) dan [checkpoint](CHECKPOINT-MIGRASI-POCKETBASE.md). P1 tetap BELUM; P4 keseluruhan SEBAGIAN sampai autentikasi, data resmi dan deployment selesai.

P3 lokal sudah aktif: semua pembacaan dan mutasi bisnis melalui API SvelteKit ke PocketBase. Gunakan frontend **http://127.0.0.1:5176** dan backend **http://127.0.0.1:8096**, sesuai `.env`. Akun QA lokal tetap digunakan; P1 login production ditunda. Lihat [kontrak P3](docs/POCKETBASE-P3.md). Bagian P2 di bawah merupakan konteks historis.

Dashboard DEB untuk Admin Pertamina Foundation dan kampus mitra. Pada P2, **seluruh data bisnis dibaca dari PocketBase**. Tidak ada mock service, Dexie, IndexedDB runtime, mode demo alternatif, atau fallback data lokal.

Data yang sudah di-seed di PocketBase tetap dipertahankan dan masih merupakan contoh, bukan data operasional resmi. Seeder/test fixture terpisah di `scripts/fixtures/`, tidak digunakan frontend.

## Menjalankan lokal

Prasyarat: Node.js 22.x (minimal 22.13), npm, dan PocketBase lokal DEB dari setup P0.

```powershell
npm ci
# Untuk checkout baru saja, salin .env.example menjadi .env tanpa menimpa konfigurasi yang sudah ada.
npm run pb:setup
npm run pb:serve
```

Pada terminal kedua, jalankan `npm run pb:seed` **hanya jika memerlukan data awal**, lalu `npm run dev`. Seeder manual aman diulang dan tidak menimpa perubahan. Server yang sudah berjalan tidak perlu di-setup ulang.

Konfigurasi privat aplikasi:

```dotenv
PB_URL=http://127.0.0.1:8096
DEB_LOCAL_PREVIEW_ENABLED=true
```

Website: **http://127.0.0.1:5176**. Dashboard PocketBase: **http://127.0.0.1:8096/_/**. Gunakan kredensial superuser dari file privat lokal untuk dashboard PocketBase, bukan akun kampus. Jangan bagikan atau commit file tersebut.

Untuk QA, buka **Akun QA lokal** pada login, pilih kampus/admin, lalu **Buka ruang kerja**. Password/token PocketBase tidak dikirim ke browser; sessionStorage hanya menyimpan key pilihan akun. Ini preview QA lokal, **bukan autentikasi production**. Semua orang yang dapat mengakses preview lokal dapat memilih akun admin seed. P1 tetap diperlukan sebelum deployment.

## Kemampuan aktif P4 lokal

- Membaca dashboard, kampus/detail, indikator, pengajuan/review, feedback, proposal/PDF, forum/jawaban/like, FAQ, aktivitas, notifikasi dan lokasi peta.
- Membuka/mengunduh PDF serta membandingkan teks dua versi dari file protected PocketBase.
- Pencarian, filter, tab, navigasi notifikasi, dan zoom/pan peta tetap aktif.
- Tombol **Muat ulang data** mengambil kondisi terbaru PocketBase; tidak ada polling.
- Seluruh aksi tulis P3 aktif sesuai role dan status workflow. Membuka notifikasi menandainya dibaca; kontrol menunggu pemuatan/penyimpanan selesai sebelum dapat digunakan kembali.
- Peta memakai ID dan koordinat PocketBase. Kampus tanpa lokasi valid tetap dihitung sebagai kampus, tetapi tidak mendapatkan marker palsu.
- Backend mati menampilkan error/retry, bukan data contoh pengganti. Refresh gagal mempertahankan data akun yang sama dengan penanda pembaruan gagal; pindah akun menghapus state/PDF lama.
- Data browser lama tidak dibaca dan tidak dihapus otomatis.

Rumus capaian tetap `min(current / target * 100, 100)`; progres kampus adalah rata-rata indikator yang diterima dari database. Baseline adalah konteks awal. Pengesahan indikator, periode, rumus, dan koordinat operasional masih terpisah.

## Pengujian

| Perintah | Kegunaan |
|---|---|
| `npm run check` | TypeScript dan Svelte |
| `npm test` | Adapter HTTP, guard preview, domain, fixture, peta dan perbandingan teks |
| `npm run test:pb` | Pemeriksaan akses baca/file dan penolakan mutasi tanpa izin pada 8096; tanpa seed/reset |
| `npm run test:e2e` | Chrome headless, smoke P3 dan regresi baca P4 pada frontend 5176 existing |
| `npm run build` | Build adapter Vercel |
| `npm run preview` | Build lokal 4176; akses preview akun sengaja ditolak karena bukan dev server |

Perintah tes standar memakai server lokal existing 5176/8096 dan tidak menjalankan fixture, migrasi, seed, atau reset. Tes mutasi interaktif dilakukan melalui MCP Playwright Chrome pada 5176. Suite fixture lama tetap menjadi referensi pengujian tetapi tidak dipilih perintah standar. Artefak diabaikan Git.

## Pemeliharaan manual

Setelah PocketBase dihentikan, `npm run pb:backup` membuat backup database/file terverifikasi. `npm run test:pb:master-rollback` menguji master melalui transaksi native yang seluruhnya dibatalkan; hash record sebelum/sesudah harus identik. Keduanya tidak dijalankan oleh tes standar dan tidak membuka server tambahan. Lihat [prosedur backup/pemulihan](docs/POCKETBASE-P4.md).

## Batas deployment dan Git

`main` tetap mockup review. Branch P4 berbasis pekerjaan P3; target integrasi tetap `development`. Tidak ada merge atau deployment dalam pekerjaan P4 lokal.

Adapter Vercel dan Node 22.x dipertahankan, tetapi P3 lokal **belum untuk deployment pengguna**. Endpoint preview menolak production, flag nonaktif, request nonlokal/lintas origin, dan instance backend yang tidak cocok. Tidak ada fallback ke mock. P1 dan persiapan deployment masih terpisah.

## Dokumentasi

- [Setup PocketBase lokal dan keamanan](docs/POCKETBASE-LOCAL.md)
- [Kontrak PocketBase](docs/POCKETBASE.md)
- [Checkpoint migrasi dan status tahapan](CHECKPOINT-MIGRASI-POCKETBASE.md)
- [Asal roster kampus](docs/DAFTAR-KAMPUS.md)
- [Perbandingan proposal](docs/PERBANDINGAN-PROPOSAL.md)

Workflow edit/review/upload sudah aktif pada P3 lokal. Data QA tersimpan di PocketBase, bukan di IndexedDB.
