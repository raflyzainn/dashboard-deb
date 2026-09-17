# P3 — workflow tulis PocketBase lokal

> **Status aktif P4 lokal (10 September 2026):** master kampus/lokasi dan indikator bersama tersedia. Baseline/target sama untuk seluruh kampus; aktual/catatan tetap per kampus. P1 masih BELUM. Acuan aktif: [POCKETBASE-P4.md](POCKETBASE-P4.md). Uraian P0/P2/P3 atau prototype di bawah dipertahankan sebagai riwayat; pernyataan mock/Dexie/read-only lama bukan kondisi runtime sekarang.

P3 mengaktifkan seluruh mutasi aplikasi melalui API SvelteKit dan custom route PocketBase. P1 login/sesi production tetap ditunda. Akun QA lokal, marker instance, pemeriksaan loopback/same-origin dan gate development P2 tetap berlaku. Tidak ada fallback Dexie, reset backend dari UI, email/push, polling, atau deployment production.

## Alur dan otorisasi

```text
UI → DataService HTTP → /api/* SvelteKit → token user QA
   → /api/deb/workflows/{operation} → transaksi PocketBase
```

Endpoint SvelteKit mengikuti tabel P3 dalam checkpoint. Adapter tidak menerima actor/role dari komponen. Header pemilih akun hanya berlaku untuk development lokal; token PocketBase tidak diberikan ke browser. Custom route hanya menerima auth collection `users`, memeriksa record akun aktif/simulated, role dan kepemilikan dalam transaksi. Admin aplikasi bukan superuser. Rules create/update/delete koleksi tetap `null`; otorisasi custom route ditegakkan secara eksplisit karena operasi internal tidak menjalankan API rules.

Bootstrap mengembalikan `capabilities.readOnly: false`. UI menerapkan batas role dan pending, tetapi backend tetap memeriksa ulang. Data/file/error menggunakan `Cache-Control: no-store, private`.

## Transaksi dan retry

Setiap mutasi memakai `Idempotency-Key`, diteruskan tanpa perubahan sampai PocketBase. Migrasi `1789000000_deb_workflows.js` menambahkan koleksi internal `workflow_operations` dengan indeks unik `(actor, key)`. Kunci, nama operasi, hash payload kanonis dan hasil disimpan bersama perubahan bisnis. Upload memasukkan isi PDF dalam hash. Semua akses publik koleksi internal dikunci.

Operasi dengan kunci/payload sama mengembalikan hasil terdahulu; payload berbeda dengan kunci sama ditolak 409. Adapter mempertahankan kunci untuk retry setelah jaringan/5xx gagal selama sesi halaman yang sama. Operasi baru setelah sukses mendapatkan kunci baru. Pergantian akun membatalkan request dan membuang hasil terlambat, termasuk saat hashing file. Kunci retry di memori bukan mekanisme pemulihan antrean setelah tab ditutup.

Nomor versi, satu pending, pemeriksaan snapshot, perubahan feedback, aktivitas, penerima notifikasi dan receipt operasi diproses dalam `runInTransaction` menggunakan `txApp`. Indeks unik baseline tetap berlaku. Reorder FAQ membaca urutan terbaru dan menulis urutan konsisten dalam transaksi; ID digunakan untuk memecah urutan sama. Tidak ada layanan eksternal dipanggil dalam transaksi.

## Aturan workflow

- Kampus mengubah aktual/note indikator sendiri; finite/nonnegatif, note maksimal 5.000 karakter. Pending mengunci perubahan; perubahan aktual/note menandai revisi open menjadi responded.
- Submit memerlukan seluruh indikator master; nol adalah nilai valid. Snapshot menyimpan nilai dan salinan nama/kategori/satuan/target. Approved tanpa perubahan ditolak. Review hanya pending; revisi memerlukan catatan, snapshot stale ditolak, approval menunggu feedback revisi ditutup.
- Feedback hanya ditulis Admin. Catatan biasa closed; revisi open. Close idempotent dan tidak menggandakan event.
- Proposal memakai multipart PDF maksimal 10 MiB; ekstensi, MIME dan signature diperiksa server. File native PocketBase protected dan metadata historis immutable. Proxy file tetap memeriksa akses akun untuk preview, download dan diff. Dukungan batas upload hosting produksi belum diuji karena P3 hanya lokal.
- Pertanyaan hanya oleh Kampus; judul maksimal 180 dan isi maksimal 5.000 karakter; kategori mengikuti katalog aplikasi. Admin membuat/memperbarui satu jawaban resmi. Like memakai PUT/DELETE state tujuan, unik per kampus.
- FAQ hanya dikelola Admin; promosi membutuhkan jawaban, satu sumber tidak ganda, salinan jawaban tidak ikut berubah saat jawaban forum diedit. FAQ manual/edit/reorder/delete tersedia; menghapus FAQ tidak menghapus pertanyaan sumber.
- Notifikasi dibuat untuk setiap akun penerima aktif; dua Admin memiliki status baca terpisah. Membuka detail menandai dibaca dahulu. ID asing pada aksi batch menyebabkan seluruh aksi ditolak; semua hanya menjangkau akun aktif.

Pemicu notifikasi: perubahan indikator, proposal baru, pertanyaan baru dan pengajuan menuju Admin; feedback baru/ditutup, jawaban dan keputusan review menuju kampus terkait. Aktivitas kampus dibuat untuk pemicu yang sama. Like, kurasi FAQ dan status baca tidak mengirim notifikasi tambahan. Data lokal tetap berlabel simulated.

## UI dan penanganan kegagalan

Setelah commit, UI memuat ulang bootstrap. Kegagalan mutasi mempertahankan input dan menampilkan error. Commit berhasil tetapi reload gagal ditampilkan sebagai tersimpan dengan data stale; tidak mengulang mutasi. Respons akun lama tidak mengisi akun baru. Perpindahan halaman memuat ulang bootstrap; refresh/tombol Muat ulang tetap tersedia. Tidak ada polling/realtime otomatis. Kontrol mutasi dinonaktifkan selama loading/busy. Daftar FAQ memakai key ID agar reorder tidak menukar identitas tombol.

## Setup dan verifikasi

Backup database/file lokal sebelum menerapkan migrasi forward. Hentikan proses PocketBase yang telah diverifikasi sebelum `npm run pb:migrate`, lalu jalankan `npm run pb:serve`. Jangan menjalankan seed ulang untuk mengaktifkan P3. Migrasi tidak mengubah data existing pada 13 koleksi bisnis.

Jalankan `npm run check`, `npm test`, `npm run test:pb`, `npm run test:e2e`, dan `npm run build`. Perintah standar hanya menggunakan PocketBase **8096** dan frontend **5176** existing, tanpa migrasi/seed/reset atau server alternatif. `test:pb` menguji akses dan penolakan operasi tanpa izin; `test:e2e` memakai Chrome untuk smoke UI tanpa menulis data. Pengujian workflow tulis dilakukan melalui MCP Playwright Chrome pada 5176. Suite fixture lama disimpan sebagai referensi, tidak dipilih oleh perintah standar setelah instruksi pengguna. Bukti historis konkurensi/rollback fixture dan bukti terbaru lingkungan utama dibedakan dalam checkpoint.
