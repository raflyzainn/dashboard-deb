# P1 lokal: akun PIC, aktivasi email, dan sesi login

10 September 2026. Backend P1 tersedia dan diuji lokal. Pengiriman eksternal/production masih memerlukan SMTP resmi, domain publik HTTPS, serta verifikasi deployment. Mockup P1 dan opsi Pratinjau login baru sudah dihapus.

## Menjalankan

- Frontend existing: `http://127.0.0.1:5176`; PocketBase existing: `http://127.0.0.1:8096`.
- `npm run pb:serve` menjalankan PocketBase dengan secret undangan lokal yang dibuat otomatis dalam `.local/pocketbase/p1-secret.json`. Jangan menghapus/mengganti secret saat undangan masih digunakan.
- `npm run mail:serve` menjalankan Mailpit loopback; inbox `http://127.0.0.1:8025`, SMTP `127.0.0.1:1025`. Binary Windows v1.31.1 diunduh dari rilis resmi dan diverifikasi terhadap digest SHA-256 aset.
- `npm run mail:local` secara eksplisit mengonfigurasi mailer PocketBase ke Mailpit. Jangan gunakan perintah ini untuk SMTP production.
- `/login` memakai email/password. **Akun QA lokal** menuju `/login?qa=1` dan hanya tersedia pada development loopback.
- `npm run pb:admin` membuat admin aplikasi melalui terminal interaktif. Password diinput tersembunyi dan tidak dicetak/disimpan oleh helper. Superuser PocketBase tidak dipakai sebagai sesi browser.

## Pengelolaan PIC

Buka Kampus mitra > Akun kampus. Daftar memuat roster 40 mitra (source user/document), pagination server 10 baris, pencarian kampus/PIC/email, filter status dan ringkasan seluruh roster. Data awal PIC kosong; nama/email QA tidak menjadi kontak resmi.

Halaman aktivasi menampilkan empat langkah: Email PIC, Periksa email, Buat password, Selesai. Tautan email langsung menampilkan langkah 3. Login mempertahankan ilustrasi daun/bunga dan muat tanpa scroll pada viewport laptop 1366x768/1440x900 serta mobile 390x844.

Nama PIC di bawah nama kampus dan email di kanan. Setelah disimpan keduanya menjadi teks/tautan; pensil membuka editor, silang membatalkan perubahan. Draft tetap tersedia lintas halaman. Admin hanya menyimpan kontak; tidak ada tombol Kirim, checkbox penerima, maupun API pengiriman admin. Menyimpan kontak tidak membuat antrean email.

PIC membuka Aktivasi akun di halaman login, memasukkan email terdaftar, lalu memilih Kirim tautan aktivasi. Server mencocokkan email yang dinormalisasi dengan kontak tersimpan dan nama PIC yang terisi. Email yang belum didaftarkan admin tidak menghasilkan undangan maupun email. Respons tetap sama agar daftar email kampus tidak dapat ditebak. Permintaan berulang dibatasi cooldown 60 detik dan rate limit. Tautan email membawa PIC ke pembuatan password; setelah berhasil, PIC masuk memakai email/password tersebut.

Status: email kosong (merah), belum aktivasi/antrean/menunggu aktivasi (kuning), gagal dikirim (merah), aktif (hijau). Muat ulang status sesudah worker berjalan, biasanya dalam satu menit. Status terkirim berarti SMTP menerima pesan, bukan jaminan inbox penerima.

## Data dan keamanan

- Koleksi baru: `campus_contacts`, `account_invitations`, `account_audit`, `auth_limits`. Akses langsung ke koleksi tersebut ditutup; administrasi melalui endpoint yang memeriksa role.
- Kontak menyimpan hubungan kampus/akun dan revisi. Email unik diperiksa terhadap kontak lain dan akun autentikasi. Batch penyimpanan transaksional dan memeriksa revisi.
- Aktivasi memperbarui akun kampus existing tanpa mengganti ID; hubungan pengajuan, proposal dan aktivitas tetap utuh. Akun yang diaktifkan dikeluarkan dari pemilih QA.
- Tautan JWT ditandatangani secret server, terikat ke undangan, tujuan dan revisi kontak. Masa berlaku 30 menit; sekali pakai. Membuka tautan hanya memeriksa; password disimpan dan tautan dihabiskan secara atomik saat konfirmasi.
- Kirim ulang membatalkan undangan lama. Perubahan kontak membatalkan undangan yang masih ada; edit nama tidak mereset akun aktif. Mengganti/mengosongkan email aktif memerlukan konfirmasi, menonaktifkan akun dan merotasi tokenKey sehingga akses lama terputus.
- Password minimal 8 karakter dengan angka dan huruf kapital, maksimum 128; diproses PocketBase. Endpoint reset/verifikasi/perubahan email bawaan untuk users ditutup agar tidak melewati aturan alur DEB.
- Cookie `deb_session`: HttpOnly, SameSite=Lax, Secure pada HTTPS, 8 jam tanpa memperpanjang expiry otomatis. Setiap request API memverifikasi token dan akun lewat authRefresh; kegagalan layanan sementara menghasilkan 503. Logout menghapus cookie. Reset password/penggantian email mencabut token lama.
- API bisnis menggunakan identitas server, termasuk scope kampus dan role. QA hanya pada dev loopback dengan flag/header khusus. Workflow nyata menerima akun aktif terverifikasi.
- Rate limit: login 10 percobaan per kombinasi IP/identitas dalam 15 menit (akun QA lokal dikecualikan); permintaan email 20 per alamat/jam dan 60 per IP/jam; pemeriksaan/konfirmasi token 60 per IP/15 menit. Permintaan email yang tidak terdaftar memberikan respons umum. Di arsitektur proxy saat ini IP yang terlihat PocketBase dapat merupakan IP server SvelteKit, sehingga beberapa pengguna dapat berbagi kuota IP. Batas permintaan email dilonggarkan untuk pengujian; cooldown pengiriman 60 detik tetap berlaku. Respons 429 menyebutkan sisa waktu tunggu.
- Antrean persisten diproses cron PocketBase setiap menit, maksimal 40 pekerjaan/batch. Claim memakai lease 5 menit. SMTP di luar transaksi; status diselesaikan dengan membaca record terbaru. Maksimal 3 percobaan, jeda 1 lalu 2 menit, kemudian status gagal. SMTP tidak menjamin exactly-once saat koneksi putus setelah penerimaan pesan; retry bisa menghasilkan salinan email dengan tautan yang sama.

## API

| Endpoint SvelteKit | Fungsi |
|---|---|
| GET `/api/auth/me` | Profil sesi atau null |
| POST `/api/auth/login`, `/logout` | Login/password dan hapus cookie |
| POST `/api/auth/request` | Minta aktivasi atau pemulihan |
| POST `/api/auth/inspect`, `/confirm` | Periksa undangan; simpan password/aktifkan akun |
| GET `/api/admin/accounts?q=&status=&page=` | Daftar PIC, pagination dan statistik |
| POST `/api/admin/accounts/save` | Batch kontak, revisi dan konfirmasi reset |

Endpoint baca bisnis existing dipertahankan; pembungkus endpoint menerima sesi nyata maupun konteks QA lokal. `/api/session` tetap menyediakan profil dan ringkasan navigasi aplikasi. Cookie mutasi harus berasal dari origin yang sama.

## TODO pengguna: SMTP eksternal

`TODO(P1-SMTP)` tersedia pada `.env.example` dan mailer `db-schema/pb_hooks/accounts.js`.

Siapkan host/port/TLS, username/password SMTP, nama/alamat pengirim, konfigurasi domain pengirim sesuai provider, dan URL website HTTPS yang bisa diakses kampus. Masukkan SMTP melalui Settings > Mail settings PocketBase. Set `DEB_MAIL_MODE=external`, `DEB_PUBLIC_URL=https://domain-resmi`, dan `DEB_INVITATION_KEY` acak minimal 32 karakter pada environment proses PocketBase. Secret tidak boleh memakai prefix PUBLIC_/VITE_ dan tidak masuk Git. Tidak ada fallback diam-diam ke sendmail/inbox lokal bila konfigurasi eksternal belum lengkap.

## Pengujian dan migrasi

Backup database/file sebelum migrasi terverifikasi pada `.local/pocketbase/maintenance/2026-09-10T07-24-54.135Z-dc55b2a2`. Migrasi field rekonsiliasi melengkapi pendaftaran field native pada instance lokal; tidak menghapus koleksi/data bisnis.

- `npm test`: unit kontrak dan domain.
- `npm run test:pb`: regresi read/akses existing 8096 tanpa mutasi bisnis.
- `npm run test:e2e`: regresi browser existing 5176 melalui opsi QA eksplisit.
- `npm run p1:sandbox`: salinan backup terverifikasi pada direktori baru, frontend 5177/PocketBase 8097. Tidak seed/reset instance kerja.
- `npm run test:p1`: aktivasi mandiri, penolakan email belum terdaftar, cooldown, SMTP lokal/retry, tautan kedaluwarsa/dibatalkan/sekali pakai, cookie, penggantian email, pemulihan, batas akses dan penulisan akun nyata pada salinan.
- `npm run test:e2e:p1`: setelah test:p1, uji browser admin/PIC/aktivasi/login/logout dan viewport laptop/mobile. Mulai dari sandbox baru untuk menjalankan ulang seluruh rangkaian browser.

Port 5177/8097 khusus pengujian; jangan gunakan sebagai aplikasi kerja. Password uji hanya pada salinan. Pengguna menyiapkan kontak kampus nyata sendiri pada 5176. Pengiriman perubahan menggunakan branch `feat/p1-auth-campus-accounts` dengan target PR `development`; deployment production belum diverifikasi.

Hasil verifikasi awal: 21 unit test, 6 regresi PocketBase existing, 7 tes backend P1 pada salinan, 8 Playwright regresi existing, dan 2 Playwright backend P1 lulus. Check menghasilkan 0 error/0 warning. Saat verifikasi tersebut, seluruh 15 tabel bisnis existing memiliki jumlah record dan SHA-256 isi yang sama dengan backup pra-migrasi; kontak P1 pada instance kerja masih kosong. SMTP gagal/retry dan aktivasi diuji pada salinan. Screenshot pemeriksaan tersimpan di `.qa/` dan tidak dilacak Git.

Uji SMTP lanjutan: pengguna mengonfigurasi Postmark pada dashboard PocketBase. Atas permintaan pengguna, kontak ITB disimpan dan email aktivasi berhasil diterima di Gmail; tautan membuka tahap pembuatan password. Password akun nyata tidak dibuat oleh pengujian otomatis. Kredensial SMTP dan data kontak lokal tidak disertakan dalam Git. Domain publik HTTPS dan deployment tetap perlu disiapkan.

Tampilan aktivasi: checklist password langsung memeriksa 8 karakter, angka, huruf kapital, dan kecocokan konfirmasi. Tombol simpan aktif setelah semua syarat terpenuhi; validasi server tetap berlaku. Ilustrasi mengikuti tinggi halaman. Email aktivasi/pemulihan memakai `db-schema/pb_hooks/account-email.js`: HTML tabel dengan gaya inline, tombol biru, kartu kampus/PIC, tautan cadangan, dan versi teks. Template berlaku pada pengiriman berikutnya; perubahan hook memerlukan restart PocketBase. Pratinjau browser desktop/mobile diuji dengan data fiktif tanpa mengaktifkan akun pengguna.

Identitas PF: favicon PNG dari static dipakai tab browser, logo putih di panel login, logo berwarna pada footer login mobile dan sidebar. Panduan DEB dapat dibuka saat membuat/reset password dan tampil setelah penyimpanan berhasil, menjelaskan indikator, proposal, Forum Q&A, dan Beranda. Panduan tidak membuat sesi atau mengubah otorisasi; pengguna tetap masuk dengan email/password.

Logo email PF disertakan sebagai inline attachment CID oleh account-email.js untuk aktivasi dan pemulihan. Sertakan folder db-schema/pb_hooks/assets saat deploy hook; gambar berasal dari static/logo-pf-white.png. Pengujian PocketBase terisolasi ke Mailpit memverifikasi PNG dan Content-ID, lalu Playwright memeriksa gambar tampil. Desain berlogo belum diuji ulang di Gmail; berlaku untuk email baru setelah restart PocketBase.

Panduan kampus dapat dibuka kembali melalui ikon ? di samping bel pada header, menuju /campus/guide. Halaman menjelaskan Beranda, indikator, proposal, Forum Q&A, Pusat bantuan, dan notifikasi, dengan tautan langsung ke fitur terkait. Route memakai otorisasi layout kampus dan konten statis tanpa API dataset halaman. Playwright memverifikasi pembukaan dari header, reload, enam kartu fitur, navigasi indikator, dan viewport mobile 390px; check 0 error/0 warning.

Ganti password saat sudah login: tombol Ganti password di bagian bawah sidebar admin/kampus membuka form password saat ini, password baru, dan konfirmasi dengan ikon mata serta checklist. POST /api/auth/change-password memerlukan cookie sesi nyata dan origin yang sama; diteruskan dengan token pengguna ke POST /api/deb/account/password. Backend memeriksa akun aktif/verified/non-QA, password saat ini, kebijakan 8–128 karakter/angka/kapital, kecocokan konfirmasi, serta password baru yang berbeda. Transaksi memperbarui password, merotasi tokenKey, membatalkan tautan akun yang tersisa, dan mencatat password.changed tanpa isi password. Semua sesi lama dicabut dan cookie dihapus; dialog sukses mengarahkan ke login. Batas 10 percobaan per akun/15 menit. Tidak mengirim email dan tidak memerlukan migrasi tambahan. Playwright change-password.spec.ts menguji admin/kampus pada salinan 5177/8097: akses anonim/cross-origin, password lemah/sama/salah, validasi konfirmasi, ikon mata, mobile, perubahan nyata, cookie/token lama, audit, serta login ulang. Akun pengguna di instance kerja tidak diubah.
