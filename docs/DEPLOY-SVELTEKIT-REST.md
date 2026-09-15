# Deployment tanpa kode tambahan di PocketBase

Aturan bisnis dijalankan oleh API SvelteKit. PocketBase menyimpan data/file, memverifikasi password, menjalankan transaksi melalui Batch API, dan **mengirim email melalui Mail settings**. Penyiapan production hanya membutuhkan URL serta akses superuser PocketBase; tidak perlu memasang folder hook di server.

## Environment SvelteKit

| Variabel | Production |
| --- | --- |
| `PB_URL` | Origin HTTPS PocketBase |
| `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` | Kredensial superuser target; khusus server |
| `DEB_LOCAL_PREVIEW_ENABLED` | `false` |
| `DEB_LOCAL_INSTANCE_DIR` | Hapus; khusus sandbox lokal |
| `DEB_PUBLIC_URL` | Origin HTTPS website tanpa slash akhir |
| `DEB_INVITATION_KEY` | Secret acak minimal 32 karakter, sama pada seluruh instance SvelteKit |

**Tidak perlu** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_SENDER`, `POSTMARK_WEBHOOK_KEY`, `DEB_MAIL_MODE`, atau `CRON_SECRET` di environment SvelteKit. Hapus konfigurasi email lama tersebut jika masih ada. Simpan secret hanya pada environment server, tanpa prefix `PUBLIC_*`/`VITE_*`, dan jangan commit nilainya.

## SMTP Postmark di dashboard PocketBase

Buka **Settings → Mail settings** dan isi:

| Pengaturan | Nilai |
| --- | --- |
| Sender name | Pertamina Foundation |
| Sender address | `noreply@pertaminafoundation.org`, jika pengirim ini sudah diizinkan Postmark |
| Use SMTP mail server | Aktif |
| SMTP server host | `smtp.postmarkapp.com` |
| Port | `587` |
| Username | Server API Token Postmark |
| Password | Server API Token yang sama |
| TLS / Enable TLS (PocketBase 0.40.3) | `false` / nonaktif untuk port 587: koneksi standar menaikkan enkripsi melalui STARTTLS |

Jika lead memberikan **SMTP Token**, isikan Access Key sebagai username dan Secret Key sebagai password. Server API Token dan SMTP Token adalah dua jenis kredensial berbeda; jangan menebak nilainya. Untuk Server API Token, Postmark memakai stream transactional default **`outbound`** ketika header stream tidak disertakan. Tidak perlu menambah header khusus untuk default ini. [Dokumentasi resmi Postmark](https://postmarkapp.com/developer/user-guide/send-email-with-smtp).

Simpan lalu gunakan **Send test email** pada dashboard dengan penerima yang disetujui. SMTP diatur sekali di PocketBase; aplikasi tidak membaca password SMTP yang disembunyikan API Settings.

Pada PocketBase 0.40.3, `smtp.tls=true` memilih koneksi TLS langsung. Untuk port 587, gunakan `false`; library mailernya memakai STARTTLS ketika server mendukungnya. Ini berbeda dari menonaktifkan enkripsi STARTTLS. Rujukan: [mailer PocketBase](https://github.com/pocketbase/pocketbase/blob/v0.40.3/tools/mailer/smtp.go) dan [mailer Mailyak](https://github.com/domodwyer/mailyak/blob/master/mailyak.go).

## Penyiapan melalui API superuser

1. Backup database dan file melalui dashboard. Hentikan seluruh instance aplikasi lama dan tunggu request aktif selesai sebelum memperbarui schema. Jangan menjalankan versi revisi global bersama versi revisi per collection: kedua versi tidak berbagi pengaman transaksi yang sama. Jika target lama masih menjalankan hook, operator server perlu menghentikannya, atau gunakan target PocketBase standar yang bersih. Hak superuser API tidak dapat menghapus file hook pada server lama.
2. Gunakan PocketBase dengan Batch API; versi yang diuji **0.40.3**. Dari komputer yang dapat mengakses target, isi `PB_URL`, kredensial superuser, serta `DEB_PUBLIC_URL` di environment terminal. Jalankan:

   ```sh
   npm run pb:provision
   npm run pb:provision -- --apply
   ```

3. Perintah mengimpor `db-schema/collections.json` tanpa menghapus collection lain atau record bisnis, mengaktifkan Batch API, dan mengatur **Application URL** PocketBase ke website DEB. Penambahan utama: `users.sessionVersion`, `app_revisions`, dan collection auth **`email_challenges`**. Schema revisi terbaru menambahkan `app_revisions.scope` dan mengganti index unik `sequence` dengan `(scope, sequence)`; riwayat lama tetap tersimpan dengan scope kosong. Selesaikan provisioning sebelum menyalakan versi aplikasi baru. Jangan menjalankan seed QA di production. Database kosong tetap memerlukan data kampus/PIC asli.
4. Provision production menolak akun `simulated`, mengaktifkan rate limit native jika sebelumnya mati, dan merotasi secret token native `users`. Semua pengguna perlu masuk kembali. Provision ulang production juga membatalkan token login native yang sedang berlaku; lakukan saat maintenance.
5. Template reset password `email_challenges` mengarah ke `{APP_URL}/login?token={TOKEN}` dan token berlaku 30 menit. Template lifecycle `users` tidak membagikan token: seluruh perubahan akun PIC harus lewat SvelteKit. Jangan mengembalikan template bertoken pada `users`.
6. Deploy SvelteKit sebagai server Node, bukan static export. Isi env server, kemudian restart/redeploy. Uji staging sebelum membuka akses pengguna.

## Cara kerja aktivasi dan pemulihan

SvelteKit memeriksa email PIC dan membuat undangan serta record bukti email dalam satu transaksi. Aplikasi meminta **request-password-reset bawaan PocketBase pada `email_challenges`**, sehingga PocketBase sendiri mengirim email memakai SMTP dashboard. Record tersebut terpisah dari akun `users`, tidak memiliki role/campus/akses data bisnis.

Saat tautan dibuka, SvelteKit memverifikasi token melalui API konfirmasi native PocketBase. Password acak deterministik khusus server memungkinkan pembukaan ulang tautan jika respons konfirmasi sebelumnya hilang. Setelah bukti valid, SvelteKit menerbitkan tiket aplikasi yang terikat undangan/PIC/revisi. Membuka tautan belum mengaktifkan akun kampus.

Saat password baru disimpan, pemeriksaan PIC, perubahan akun, pembatalan undangan, penghapusan record bukti, dan audit dilakukan dalam satu transaksi Batch API. Token palsu ditolak; dua konfirmasi bersamaan hanya boleh berhasil satu kali. Penggantian PIC atau password membatalkan undangan lama.

**Status email:** “Menunggu aktivasi” berarti permintaan pengiriman telah diterima PocketBase, bukan bukti email sudah tiba. Pengiriman native bersifat asynchronous; periksa Logs PocketBase dan Activity Postmark untuk kegagalan SMTP/bounce. Pengguna dapat meminta tautan baru setelah jeda 60 detik. Tidak ada worker email/cron SvelteKit atau webhook delivery Postmark pada implementasi ini.

## Transaksi dan batas operasional

Setiap pemanggil transaksi wajib menyebutkan collection yang dibutuhkan. Aplikasi mengambil satu revisi terbaru per scope collection sebelum membaca snapshot, lalu menyertakan insert revisi unik untuk setiap collection yang dibaca atau ditulis dalam Batch API yang sama. Collection insert-only yang tidak jadi ditulis tidak membutuhkan fence. Konflik pada salah satu fence membuat seluruh batch rollback dan dihitung ulang. `workflow_operations` menjaga retry dengan idempotency key yang sama. Kegagalan transport tidak dianggap sukses sampai hasil dapat dipastikan.

Transaksi pada collection terpisah tidak lagi berebut satu revisi global. Operasi yang berbagi collection tetap dapat saling retry meskipun record-nya berbeda, termasuk workflow yang sama-sama membaca `users`; ini belum merupakan isolasi per kampus. Batas Batch API 2.000 mencakup seluruh operasi bisnis **dan** seluruh insert fence, sehingga kapasitas mutasi berkurang sesuai jumlah scope yang dilindungi.

Logout mencabut **seluruh sesi akun tersebut**, termasuk perangkat lain, dengan merotasi `sessionVersion` dan `tokenKey` native PocketBase dalam satu transaksi. Cookie dihapus setelah commit berhasil; kegagalan backend mengembalikan error agar pengguna dapat mencoba lagi. Cookie tanpa sesi atau sesi yang sudah tidak valid tetap dapat dibersihkan. Password akun tidak diubah, sehingga pengguna dapat login kembali seperti biasa.

Edit superuser langsung melewati validasi bisnis SvelteKit. Lakukan dalam maintenance; jangan mengedit/menghapus `app_revisions` atau `workflow_operations` saat aplikasi menulis. Mutasi saat ini membaca snapshot collection bisnis, sehingga uji beban sesuai ukuran data production tetap diperlukan.

Batas upload PDF aplikasi 10 MiB; batas request platform hosting tetap berlaku lebih dahulu. Pastikan server PocketBase dapat menjangkau SMTP Postmark dan SvelteKit dapat menjangkau API PocketBase. Rotasi `DEB_INVITATION_KEY` membatalkan tiket/sesi yang sudah diterbitkan.

## Lokal dan QA

`npm run pb:setup` membuat instance lokal standar dan mengimpor schema lewat REST. `npm run mail:serve` menyalakan Mailpit; `npm run mail:local` mengatur **SMTP PocketBase lokal** ke `127.0.0.1:1025`. Jangan menjalankan perintah itu terhadap production. Sandbox QA otomatis memakai Mailpit. Data/kredensial QA tidak digunakan pada production.

`db-schema/pb_migrations` disimpan sebagai riwayat. Setup aktif tidak menjalankan migrasi native tersebut. Panduan P0–P4 lama merupakan catatan historis; gunakan panduan ini untuk deployment saat ini.

Tes pencabutan sesi, replay token native, migrasi index, serta transaksi serentak memakai database disposable. Pastikan port lokal 8097 kosong, lalu jalankan:

```sh
npx tsx --test --test-concurrency=1 tests/pocketbase/logout.test.ts tests/pocketbase/transactions.test.ts
```
