# Review Kampus: tinjauan dan konfirmasi DEB

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

Halaman `/admin/verifikasi` memisahkan pekerjaan Admin dari pengisian indikator kampus. Menu Admin bernama **Review Kampus**; tautan lama `/admin/indicators` dialihkan ke halaman ini. Detail kampus tetap menyediakan indikator baca saja dan feedback untuk pendampingan.

## Alur

1. Kampus memperbarui indikator, lalu memilih **Kirim untuk verifikasi**. Konfirmasi menyimpan seluruh nilai sebagai satu versi pengajuan.
2. Data indikator dikunci selama pengajuan menunggu review. Admin menerima notifikasi yang membuka pengajuan terkait.
3. Admin menelusuri pengajuan berdasarkan nama/wilayah dan status, membaca indikator serta catatan, dan memberikan feedback per indikator.
4. **Minta Revisi** wajib memiliki catatan. Kampus menerima notifikasi, dapat memperbaiki data, dan mengirim pengajuan versi berikutnya.
5. **Konfirmasi data** hanya tersedia setelah feedback revisi aktif ditandai selesai. Pengajuan menjadi Terverifikasi dan masuk riwayat. Kampus menerima notifikasi keputusan.
6. Pembaruan setelah konfirmasi ditampilkan sebagai perubahan belum dikirim. Persetujuan sebelumnya tetap melekat pada versi pengajuan lama, bukan otomatis pada nilai baru.

Keputusan hanya memverifikasi data pengajuan, bukan menghitung kelulusan atau menetapkan kelas DEB. Target dan indikator masih simulasi. Alur terinspirasi dari referensi demo pengguna; nama, komponen ringkasan, gaya hijau, dan susunan detail mengikuti desain aplikasi ini.

## Penyimpanan dan pembatasan

`DebSubmission` menyimpan versi, status, snapshot indikator, waktu kirim, pemeriksa, waktu keputusan, serta catatan. Mutasi memakai transaksi IndexedDB yang sama dengan aktivitas dan notifikasi. Service menolak pengajuan dari Admin, keputusan dari Kampus, perubahan nilai selama pending, dan keputusan berulang. Pengajuan kampus lain tidak dimuat oleh sesi kampus.

Upgrade data browser lama menambahkan enam pengajuan simulasi kampus lain sekali saja tanpa mereset nilai, proposal, atau feedback. Pengajuan kampus demo sendiri selalu berasal dari aksi kirim pengguna. Versi baru tidak menimpa snapshot sebelumnya.

Prototype memakai IndexedDB dan sesi demo; belum ada backend atau otorisasi server. Alur antarperan berjalan di browser/origin yang sama. Implementasi produksi perlu membawa transaksi dan pemeriksaan akses ini ke server. Belum ada konsep periode pelaporan resmi pada model pengajuan.

## Validasi

- `tests/verification.test.ts`: batas peran, penguncian pending, revisi/pengajuan ulang, snapshot historis, notifikasi, keputusan bersamaan, dan migrasi tanpa reset.
- `tests/browser/verification.spec.ts`: siklus dua peran, pengalihan route lama, riwayat setelah refresh, dan layout/navigasi ponsel.
