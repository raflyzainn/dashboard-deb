# Halaman notifikasi Kampus dan Admin

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

Implementasi 8 September 2026. Route: `/campus/notifications` dan `/admin/notifications`. Akses lewat sidebar, drawer mobile, atau ikon lonceng header. Badge dan penanda lonceng menunjukkan notifikasi belum dibaca untuk penerima aktif.

## Pemicu

| Aktivitas | Penerima | Tujuan detail |
|---|---|---|
| Admin meminta revisi atau memberi catatan indikator | Kampus pemilik indikator | Indikator kampus |
| Admin menutup feedback | Kampus pemilik feedback | Indikator kampus |
| Kampus memperbarui aktual/catatan indikator | Admin | Detail kampus |
| Kampus mengunggah versi proposal | Admin | Detail kampus, proposal tersedia di tab Proposal |
| Kampus mengirim pertanyaan | Admin | Detail pertanyaan |
| Admin memberi atau memperbarui jawaban | Kampus penanya | Detail pertanyaan |

Notifikasi dibuat dalam transaksi yang sama dengan mutasi terkait. Kegagalan penyimpanan tidak boleh meninggalkan notifikasi untuk perubahan yang batal. Menutup feedback yang sudah ditutup tidak membuat notifikasi tambahan.

## Tampilan dan status baca

Daftar diurutkan dari yang terbaru dan memiliki filter Semua/Belum dibaca. Pengguna dapat menandai satu atau semua notifikasi sebagai dibaca. Membuka tautan detail menandai notifikasi tersebut dibaca sebelum navigasi. Kegagalan penyimpanan mempertahankan status sebelumnya dan menampilkan error.

`Notification` memuat `id`, `campusId`, `recipient`, `title`, `body`, `href`, `createdAt`, `readAt`, dan penanda opsional `simulated`. Kampus hanya memuat notifikasi penerima Kampus dengan `campusId` miliknya. Admin hanya memuat notifikasi penerima Admin. `readNotifications` memvalidasi kepemilikan sebelum menulis dan bersifat idempotent.

## Contoh data dan upgrade browser lama

Seed awal menyediakan notifikasi dari feedback/pertanyaan demo, ditambah sepuluh contoh berlabel Simulasi: lima untuk Kampus demo dan lima untuk Admin. Contoh mencakup revisi, proposal, panduan, serta diskusi, dengan campuran status dibaca dan belum dibaca.

`notificationSeedVersion` menandai bahwa contoh tambahan sudah dipasang. Database lama mendapat contoh tersebut satu kali saat `load` berikutnya. ID contoh stabil mencegah duplikasi. Array notifikasi yang sudah ada, status baca, indikator, pertanyaan, dan Blob proposal dipertahankan. Tidak perlu menekan Reset data demo; cukup muat ulang halaman.

## Batasan dan transisi

Ini notifikasi dalam aplikasi dengan penyimpanan browser lokal. Belum ada pengiriman email, push, penerima akun server, sinkronisasi lintas perangkat, atau pembaruan otomatis antartab. Tombol Muat ulang membaca ulang database lokal. Simulasi Admin mewakili satu identitas; produksi memerlukan penerima per akun terverifikasi, aturan akses backend, dan kebijakan retensi.

Kode: `src/lib/data/service.ts`, `seed.ts`, `src/routes/(app)/_components/Notifications.svelte`, dan `src/lib/components/Shell.svelte`. Tes domain memeriksa penerima, status baca, idempotensi, dan upgrade database tanpa kehilangan dokumen. Tes browser memeriksa alur pertanyaan/jawaban, navigasi detail, filter, persistensi, serta layout mobile.
