# Digitalisasi DEB

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

Pilih akun kampus/admin pada halaman masuk, lalu **Buka ruang kerja**. Password/token PocketBase tidak dikirim ke browser; sessionStorage hanya menyimpan key pilihan akun. Ini preview QA lokal, **bukan autentikasi production**. Semua orang yang dapat mengakses preview lokal dapat memilih akun admin seed. P1 tetap diperlukan sebelum deployment.

## Kemampuan P2

- Membaca dashboard, kampus/detail, indikator, pengajuan/review, feedback, proposal/PDF, forum/jawaban/like, FAQ, aktivitas, notifikasi dan lokasi peta.
- Membuka/mengunduh PDF serta membandingkan teks dua versi dari file protected PocketBase.
- Pencarian, filter, tab, navigasi notifikasi, dan zoom/pan peta tetap aktif.
- Tombol **Muat ulang data** mengambil kondisi terbaru PocketBase; tidak ada polling.
- Semua aksi tulis dinonaktifkan sampai P3, termasuk like dan status baca notifikasi. Membuka notifikasi tidak menandainya dibaca.
- Peta memakai ID dan koordinat PocketBase. Kampus tanpa lokasi valid tetap dihitung sebagai kampus, tetapi tidak mendapatkan marker palsu.
- Backend mati menampilkan error/retry, bukan data contoh pengganti. Refresh gagal mempertahankan data akun yang sama dengan penanda pembaruan gagal; pindah akun menghapus state/PDF lama.
- Data browser lama tidak dibaca dan tidak dihapus otomatis.

Rumus capaian tetap `min(current / target * 100, 100)`; progres kampus adalah rata-rata indikator yang diterima dari database. Baseline adalah konteks awal. Pengesahan indikator, periode, rumus, dan koordinat operasional masih terpisah.

## Pengujian

| Perintah | Kegunaan |
|---|---|
| `npm run check` | TypeScript dan Svelte |
| `npm test` | Adapter HTTP, guard preview, domain, fixture, peta dan perbandingan teks |
| `npm run test:pb` | Schema, rules, seed dan repository terhadap binary PocketBase nyata |
| `npm run test:e2e` | Microsoft Edge headless, frontend 5179 + fixture PocketBase 8097 |
| `npm run build` | Build adapter Vercel |
| `npm run preview` | Build lokal 4176; akses preview akun sengaja ditolak karena bukan dev server |

Jalankan tes backend dan E2E bergantian karena keduanya memakai port fixture 8097. E2E membuat database/file/akun QA terisolasi, bukan memakai backend development pengguna di 8096. Artefak disimpan dalam folder yang diabaikan Git. Chromium dapat dipakai jika konfigurasi channel Edge disesuaikan.

## Batas deployment dan Git

`main` tetap mockup review dan tidak disentuh. Feature branch dibuat dari `development`; push dan PR hanya ke `development`.

Adapter Vercel dan Node 22.x dipertahankan, tetapi P2 **belum untuk deployment pengguna**. Endpoint preview menolak production, flag nonaktif, request nonlokal/lintas origin, dan instance backend yang tidak cocok. Tidak ada fallback ke mock bila preview ditolak. P1 dan P3 menyusul; pengaturan hosting tidak diubah.

## Dokumentasi

- [Setup PocketBase lokal dan keamanan](docs/POCKETBASE-LOCAL.md)
- [Kontrak PocketBase](docs/POCKETBASE.md)
- [Checkpoint migrasi dan status tahapan](CHECKPOINT-MIGRASI-POCKETBASE.md)
- [Asal roster kampus](docs/DAFTAR-KAMPUS.md)
- [Perbandingan proposal](docs/PERBANDINGAN-PROPOSAL.md)

Dokumen fitur lama tentang workflow edit/review/upload merupakan referensi rancangan P3; pada P2 tombol-tombol tersebut nonaktif.
