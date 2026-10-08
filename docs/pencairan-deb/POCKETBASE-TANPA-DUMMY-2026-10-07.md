# PocketBase tanpa backend dummy - 7 Oktober 2026

## Perubahan aktif

- `npm run dev` dan `npm run dev:local` menjalankan launcher PocketBase lokal yang sama: frontend 5176, PocketBase 8097. Start normal tidak menjalankan seed atau migrasi.
- Layanan frontend selalu memakai HTTP API. Backend dummy, penyimpanan IndexedDB, folder `mockups/`, fixture runtime `src/lib/data/demo/`, endpoint aktivasi demo pada kontrak frontend, PDF SK dummy, dan entrypoint SPA dummy dihapus.
- Komponen pengajuan yang sebelumnya berada di mockups dipindahkan ke `src/lib/components/campus/pencairan/`. Mesin pengajuan membaca snapshot dari koleksi PocketBase dan menyimpan perubahan melalui bridge server yang sudah ada.
- Alur pengajuan ditentukan penanda `disbursements.submissionStatus`, bukan hostname atau mode Vite. Record lama tanpa penanda tetap memakai layanan PocketBase lama. Tidak dilakukan konversi massal.
- Nomor/nilai SK mengikuti database; fallback nominal contoh dihapus. Pratinjau/unduh SK memakai `/api/pencairan/sk` (SK bersama sesuai layanan yang sudah ada).
- Perintah maintenance pembentuk SK dummy untuk kampus yang belum dibuka dihapus. Fixture tes dan seed akun QA yang harus dipanggil secara eksplisit tetap tersedia di scripts; tidak menjadi fallback runtime.
- Build diarahkan ke adapter Cloudflare yang sudah terpasang agar endpoint server ikut tersedia. Belum dilakukan build atau deploy.

## QA browser yang benar-benar dilakukan

Tool Playwright, aplikasi `http://127.0.0.1:5176`, PocketBase `http://127.0.0.1:8097`. Akun lokal `campus-903` dan `admin-1`; kampus QA `9a2b695c255c938`. IndexedDB.open sengaja dibuat melempar error pada kedua konteks QA.

| Pemeriksaan | Hasil |
| --- | --- |
| Login akun lokal dan baca pencairan melalui API | Berhasil; API 200, nilai SK Rp20.000.000, revisi 190 |
| Pembayaran tetap terbaca setelah reload | Berhasil; referensi QA-SIMULASI-20261007 dan status dana dibayar |
| Halaman RAB kampus dan perbandingan RAB admin | Berhasil; versi 7, dua item, total Rp20.000.000, termin Rp10.800.000 dan Rp9.200.000 |
| SK API dan unduhan melalui halaman | API 200 application/pdf; browser menerima SK Kpts-150_06A0000_2026-S1A.pdf |
| Notifikasi dibaca melalui tombol lalu reload | Persisten; jumlah belum dibaca berubah dari 3 menjadi 2 |
| GET pencairan kampus lain | 403 |
| GET pencairan tanpa sesi | 401 |
| PATCH pengajuan yang sudah dibayar | 409, pesan pengajuan terkunci; tidak mengubah isian |
| Header pencairan | Cache-Control no-store, private |
| Simulasi API pencairan 503 melalui route browser | Pesan kesalahan terlihat, tidak muncul pengajuan dummy; pulih setelah route simulasi dilepas dan reload |
| Halaman admin RAB | Tidak ditemukan elemen alert setelah pemuatan |

Screenshot: `output/qa-pocketbase-only-2026-10-07/notifikasi-persisten.png` dan `admin-rab-pocketbase.png`.

## Batas bukti

QA ini memeriksa integrasi lokal setelah penghapusan backend dummy. Tidak mengulang seluruh siklus pengajuan baru sampai pembayaran; siklus QA sebelumnya dicatat terpisah di QA-EDGE-CASES-DAN-14-REVISI-2026-10-07.md. Tidak menjalankan test suite, check, lint atau build terminal sesuai AGENTS.md. Pemeriksaan arsitektur ditambahkan pada tests/http-service.test.ts tetapi belum dijalankan.

Data simulasi yang sudah ada di PocketBase lokal tidak dihapus. Menggunakan PocketBase sebagai sumber tidak menjadikan isi data QA sebagai data resmi. Tidak ada perubahan schema/database pada pekerjaan penghapusan dummy ini, tidak ada push, migrasi production atau deployment. Kesesuaian build Cloudflare dan lingkungan production belum dibuktikan oleh QA lokal ini.
