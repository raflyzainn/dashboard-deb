# Diskusi forum kampus dan admin

Pertanyaan awal, jawaban resmi, dan setiap balasan tampil sebagai kartu terpisah dalam urutan percakapan. Pertanyaan awal diberi label; balasan memiliki nomor urut serta kutipan pesan yang ditanggapi.

## Perilaku

- Seluruh kampus dan admin yang aktif dapat membaca forum.
- Sesudah jawaban resmi pertama tersedia, hanya kampus pemilik pertanyaan dan admin yang dapat mengirim balasan.
- Balasan tidak dapat diedit atau dihapus. Koreksi dikirim sebagai pesan baru.
- Balasan kampus mengubah status menjadi **Menunggu tanggapan admin**. Balasan admin mengubahnya menjadi **Sudah dijawab**. Pertanyaan tanpa jawaban resmi tetap **Belum dijawab**.
- Memperbarui jawaban resmi tidak menutup permintaan tanggapan. FAQ tetap merupakan salinan jawaban resmi, bukan seluruh diskusi.
- Notifikasi dalam aplikasi dikirim kepada pihak lawan diskusi: admin aktif atau akun aktif kampus penanya. Pengirim dan kampus lain tidak menerima notifikasi tersebut. Tidak ada email diskusi.
- Pembaruan forum berlangsung setiap 5 detik; badge notifikasi setiap 15 detik. Tab tersembunyi menghentikan polling; kegagalan koneksi memperpanjang jeda hingga 60 detik.

## Penyimpanan dan API

Migrasi `1789430400_deb_question_replies.js` menambahkan koleksi `question_replies`, serta `replyCount` dan `lastReplyRole` pada pertanyaan. Data pertanyaan, jawaban resmi, dan FAQ lama dipertahankan.

- `GET /api/questions/:id/replies`: 50 pesan terbaru dalam urutan menaik.
- Parameter `before` mengambil pesan lebih lama, `after` mengambil pesan lebih baru. Cursor adalah nomor urut pesan; keduanya tidak boleh dikirim bersamaan. Respons: `{ items, hasMore }`.
- `POST /api/questions/:id/replies`: `{ body, replyTo? }`, dengan header `Idempotency-Key`. `replyTo` kosong berarti menanggapi jawaban resmi; jika diisi harus mengacu ke balasan dalam pertanyaan yang sama.
- Isi wajib berupa teks tidak kosong, maksimal 5.000 karakter. Identitas, peran, nomor urut, dan waktu ditentukan backend.
- Balasan, ringkasan pertanyaan, notifikasi, dan receipt idempotensi disimpan dalam satu transaksi. Penulisan langsung ke koleksi terkunci.
- UI mempertahankan draf pada kegagalan pengiriman. Operasi yang statusnya belum pasti menggunakan kunci yang sama saat dicoba ulang.

## Pengujian dan penerapan

Jalankan `npm run test:discussion` untuk pengujian workflow PocketBase dan browser Playwright. Pengujian memakai akun QA lokal pada database sementara, PocketBase **8097**, dan frontend **5177**. Kedua port harus tersedia; data pada instance utama **8096** tidak digunakan untuk kiriman pengujian.

Pemeriksaan tambahan: `npm test`, `npm run check`, dan `npm run build`.

Sebelum deployment, backup database dan berkas, jalankan migrasi baru, lalu deploy hook dan aplikasi yang sesuai. Migrasi bersifat forward-only. Rollback database memerlukan pemulihan backup terverifikasi, bukan menghapus koleksi balasan.

Pada 14 September 2026, migrasi telah diterapkan ke PocketBase lokal utama setelah backup terverifikasi di `.local/pocketbase/maintenance/2026-09-14T07-16-06.384Z-bb861483`. Pemeriksaan Playwright read-only pada pertanyaan yang dilaporkan pengguna berhasil; koleksi balasan tersedia dan tidak ada error JavaScript pada halaman tersebut.

Bukti screenshot pengujian tersimpan lokal di `.qa/discussion-desktop.png` dan `.qa/discussion-mobile.png`. Checklist manual ada pada bagian 10 `docs/CHECKLIST-QA.md`.

Hasil QA lokal 14 September 2026:

- 11 pengujian workflow PocketBase lulus, termasuk otorisasi, idempotensi, rollback notifikasi, pagination, dan pengiriman bersamaan.
- 21 pengujian unit proyek lulus.
- Playwright memakai akun QA kampus penanya, admin, kampus lain, dan admin kedua pada empat sesi terpisah. Balasan otomatis, draf yang dipertahankan, filter status, badge notifikasi, kutipan, serta retry setelah respons sengaja diputus lulus.
- Pagination browser diuji dengan 54 balasan: 50 terbaru dimuat dahulu, empat sisanya dimuat melalui tombol, nomor urut tetap 1–54. Tautan ke balasan pertama berhasil memuat dan menampilkan pesan lama.
- Tampilan desktop dan lebar ponsel 390 px diperiksa; tidak ada horizontal overflow atau error JavaScript.

Hasil ini adalah QA lokal, bukan pengujian deployment production atau autentikasi Microsoft.
