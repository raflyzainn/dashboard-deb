# Pembacaan API per halaman

10 September 2026. Menggantikan snapshot `/api/bootstrap` pada frontend P2/P3/P4 lokal. Endpoint bootstrap dihapus. Login/PIC backend P1 tersedia; lihat [P1 lokal](POCKETBASE-P1.md). Opsi QA tetap khusus development dan mockup sudah dihapus.

## Alur aktif

Login/restorasi pilihan akun meminta `/api/session`, yang hanya berisi sesi, kemampuan tulis preview, profil kampus sendiri dan angka ringkasan navigasi. Layout kemudian memanggil endpoint untuk halaman yang benar-benar dibuka. Membuka URL FAQ secara langsung tidak melewati pembacaan dashboard.

| Halaman | Endpoint baca | Data yang dibaca |
|---|---|---|
| Beranda | `/api/views/dashboard` | Kampus, definisi/aktual indikator, feedback dan proposal untuk statistik; empat aktivitas terbaru; pertanyaan dan like untuk panel forum |
| Kampus mitra | `/api/views/campuses` | Kampus/lokasi, indikator, feedback dan proposal untuk tabel capaian |
| Akun kampus | `/api/views/accounts` | Daftar kampus shell; roster PIC persisten melalui `/api/admin/accounts` dengan pagination server |
| Detail kampus | `/api/views/campus-detail?campus=...&tab=...` | Data kampus terpilih, sesuai tab Ringkasan/Indikator/Proposal/Feedback |
| Peta persebaran | `/api/views/map` | Kampus/lokasi dan data capaian yang digunakan kartu peta |
| Indikator DEB | `/api/views/indicators` | Definisi, nilai aktual, feedback, pengajuan dan identitas kampus |
| Proposal | `/api/views/proposals` | Identitas kampus dan metadata versi proposal; file PDF tetap diminta ketika dibuka |
| Forum | `/api/views/questions` | Kampus penulis, pertanyaan, jawaban, like dan relasi FAQ |
| Detail pertanyaan | `/api/views/question-detail?question=...` | Pertanyaan terpilih beserta jawaban, like dan relasi FAQ; identitas kampus penulis |
| Pusat bantuan | `/api/views/faq` | FAQ saja |
| Notifikasi | `/api/views/notifications` | Notifikasi milik akun dan identitas kampus |
| Review kampus | `/api/views/review` | Pengajuan, kampus, definisi/aktual indikator dan feedback |
| Master indikator | `/api/admin/masters`, `/api/admin/master-audit` | Katalog admin dan audit terpaginasikan, tetap terpisah |

Sidebar mengambil `/api/navigation` saat berganti halaman dan setelah mutasi. Isinya hanya jumlah pending review, revisi, notifikasi belum dibaca, dan profil kampus sendiri. Hitungan memakai query berukuran satu record dengan `fields: id` dan total record, bukan mengunduh seluruh riwayat.

## State, refresh dan kegagalan

- `app.data` hanya menampung data halaman aktif. Slot kosong mempertahankan kompatibilitas komponen presentasi; bukan cache lintas halaman dan tidak dikirim oleh API sebagai dataset global.
- Pergantian halaman mengganti dataset, bukan menggabungkan data halaman sebelumnya. Respons terlambat tidak boleh menimpa halaman atau akun yang sudah berganti.
- Gagal membuka halaman baru menampilkan keadaan gagal dan tombol coba lagi, bukan data dari halaman sebelumnya. Gagal memuat ulang halaman yang sama mempertahankan data yang terakhir berhasil dan menandainya stale.
- Mutasi yang berhasil memuat ulang endpoint halaman aktif serta ringkasan navigasi. Endpoint tulis, transaksi, validasi dan idempotency key P3/P4 tetap sama.
- Tab detail kampus menggunakan query URL agar kebutuhan pembacaannya berubah bersama tab. Query filter lokal yang tidak mengubah kebutuhan data tidak memicu unduhan ulang.

## Batas dan verifikasi

Setiap endpoint tetap memakai `previewEndpoint` dan client PocketBase milik akun, bukan superuser. View khusus Admin ditolak untuk Campus. ID detail divalidasi dan difilter dengan `pb.filter`; aturan PocketBase tetap membatasi kepemilikan, draft dan notifikasi. Tidak ada perubahan schema, seed, email, atau deployment.

Halaman yang memang menampilkan agregat banyak kampus (dashboard, tabel kampus, peta) masih membaca record yang diperlukan untuk perhitungan tersebut. Pagination/aggregate server khusus statistik dapat menjadi optimasi berikutnya; perubahan ini memisahkan kebutuhan setiap halaman dan menghapus pengambilan seluruh koleksi pada setiap navigasi.

Repository `load()` lama tetap dipakai oleh tooling/tes backend untuk membandingkan hasil, tidak dipanggil frontend atau endpoint halaman. Suite historis `pocketbase-read.spec.ts` dan `workflows.spec.ts` masih berisi kontrak fixture lama dan tidak termasuk `npm run test:e2e`; jangan menjalankannya pada database pengguna. Acuan browser aktif: `local-read`, `p4-read`; P1 memakai konfigurasi terpisah `playwright.p1.config.ts` dalam konfigurasi Playwright.

Pengujian: unit memeriksa koleksi yang benar-benar di-query dan penolakan role/scope; `test:pb` memeriksa hasil nyata pada 8096 tanpa mutasi bisnis; Playwright memeriksa navigasi, payload FAQ, respons terlambat, retry, P1/P4, dan refresh sesudah mutasi yang disimulasikan melalui intersepsi request.

Hasil lokal: `npm run check` 0 error/0 warning; 21 tes unit, 6 tes backend (termasuk induk), dan 11 tes Playwright lulus. Percobaan browser pertama menyelesaikan 10 kasus tetapi memiliki request intersepsi peta yang belum selesai ketika tes berakhir; penantian kesiapan peta diperbaiki dan suite berikutnya selesai bersih. Tidak ada mutasi bisnis untuk verifikasi ini. Perubahan disertakan dalam branch feat/p1-auth-campus-accounts dengan target PR development.
