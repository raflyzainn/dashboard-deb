# P2 — kontrak pembacaan lokal

Frontend hanya memiliki adapter HTTP. Mock service, Dexie, migrasi IndexedDB, reset demo dan fallback seed dihapus. Generator roster, koordinat dan PDF dipindahkan ke `scripts/fixtures/` untuk seeder/test; record PocketBase existing tidak dihapus. Geometri peta, kategori forum, warna dan komponen tetap merupakan kode presentasi.

## Identitas preview, bukan autentikasi production

Aktivasi membutuhkan `DEB_LOCAL_PREVIEW_ENABLED=true`, dev server SvelteKit, peer dan hostname loopback, request same-origin dan header `X-DEB-Preview: 1`. Server memeriksa marker instance melalui PocketBase sebelum membaca kredensial privat lokal. `DEB_LOCAL_INSTANCE_DIR` hanya boleh menunjuk instance development atau fixture di bawah `.local/pocketbase/tests/`; port dan jenis marker harus cocok. Header forwarded dari browser bukan sumber alamat peer.

`X-DEB-Preview-Account` hanya menerima key akun seed yang ada di file kredensial lokal, misalnya key akun kampus atau dua admin. Hasil autentikasi user harus aktif, bertanda simulated, memiliki legacyId/key dan role yang sesuai. Ini sengaja memungkinkan impersonasi QA lokal; bukan login pengguna nyata dan tidak boleh dibuka lewat tunnel/LAN. Endpoint ditolak pada build production meskipun flag env diaktifkan.

Daftar pemilih membaca master kampus melalui akun `admin-1`, lalu menggabungkannya dengan key akun seed. Tidak ada password/email/token dalam daftar. Bila akun referensi tidak aktif, provisioning belum lengkap atau password telah berbeda, tampilkan error setup. Setelah dipilih, identitas aktual berasal dari record akun PocketBase, bukan role/campusId dari browser.

## Endpoint

| Method/path | Hasil |
|---|---|
| GET `/api/dev/accounts` | `{ accounts: [{ key, name, role }] }` |
| GET `/api/bootstrap` | `{ session, data, locations, capabilities: { readOnly: true }, loadedAt }` |
| GET `/api/proposals/[id]/file` | PDF dengan pemeriksaan akses user dan token file singkat di sisi server |

Semua respons memakai `Cache-Control: no-store, private`. Endpoint data mengabaikan role/campusId query palsu. Request tanpa identitas/header yang diperlukan ditolak. Akun nonaktif/invalid ditolak; record/file milik kampus lain menghasilkan 404; kegagalan backend/konfigurasi menghasilkan error, tidak men-trigger seed.

Bootstrap memakai pagination lengkap untuk semua koleksi, bukan halaman pertama saja. Scope indikator, feedback, proposal, pengajuan, aktivitas dan notifikasi mengikuti rules user; forum/master bersama. Data disimpan hanya di state memori UI. sessionStorage berisi key pilihan akun pada key terpisah; IndexedDB lama tidak dibaca/dihapus.

## Perilaku UI

Pemilih akun menggunakan kartu radio yang dapat diakses keyboard, pencarian nama, tab Kampus/Administrator, jumlah akun aktual, pesan tanpa hasil, dan ringkasan pilihan. Daftar dibatasi tinggi agar tetap mudah digunakan di mobile. Pada desktop/laptop form kanan muat tanpa scroll halaman; hanya daftar kampus yang dapat digulir. E2E memeriksa batas viewport 1366×768, 1280×720, dan 1536×864.

Data dimuat saat memilih akun, refresh browser dan tombol Muat ulang data, tanpa polling. Refresh gagal mempertahankan snapshot terakhir akun yang sama dengan penanda stale. Pergantian akun/logout membatalkan request dan membersihkan snapshot; respons lama tidak boleh mengisi akun baru. Pemulihan pilihan akun ditunggu sebelum guard halaman melakukan redirect.

Jumlah kampus/indikator mengikuti database. Koordinat harus finite dan dalam area peta Indonesia (longitude 94.5–141.5, latitude -11.5–6.5); lokasi invalid/null tidak dibuatkan marker palsu. Total kampus/ringkasan wilayah tetap memperhitungkan kampus tanpa marker. Penanda approximate tetap berasal dari data.

Edit, submit/review, feedback, upload, like, pertanyaan/jawaban, CRUD FAQ dan tandai dibaca nonaktif. Tombol reset dihapus. Adapter juga menolak seluruh entrypoint mutasi lama; handler state tidak mengeksekusi callback mutasi. Membuka notifikasi hanya navigasi. Filter, pencarian, tab, lihat/unduh PDF, diff dan zoom/pan tetap aktif.

## Verifikasi dan sisa pekerjaan

Tes unit memeriksa adapter/generation guard, larangan mutasi/fallback, guard dev/origin/peer, domain, peta, fixture dan diff. Tes PocketBase P0 tetap berjalan. E2E P2 menggunakan Edge, frontend 5179 dan fixture backend 8097; jangan menjalankannya bersamaan dengan `test:pb`.

P1 tetap BELUM, bukan digantikan oleh preview. P3 tetap BELUM. Jangan membuka rules publik atau menambahkan superuser data endpoint untuk melewati batas tersebut. Langkah berikutnya adalah autentikasi production atau workflow P3 dengan scope terpisah; tidak ada deploy/PR ke main pada P2.
