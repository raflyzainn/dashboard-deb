# Tab Akun dan kata sandi sementara

19 September 2026. Implementasi dan QA lokal pada checkout backend SvelteKit/PocketBase. Pengguna mengizinkan publikasi kode ke GitLab `production` setelah QA dan pull terbaru, tanpa perubahan database production.

## Penggunaan

1. Buka `http://localhost:5176/login`, pilih **Admin PF lokal 1**, lalu **Masuk ke ruang kerja**.
2. Buka **Kampus mitra**, pilih kampus, lalu tab **Akun**.
3. **Tambah akun** membuat akun email/password untuk kampus terpilih. **Ubah** memperbarui nama/email/status; **Kata sandi** menetapkan password sementara. Setelah pembuatan/reset akun kampus aktif berhasil, dialog WhatsApp terbuka dengan password sementara disertakan secara default. Password lama tidak pernah ditampilkan.
4. Akun baru atau akun yang direset admin wajib mengganti password setelah login. Dashboard dan API bisnis tertutup sampai perubahan selesai. Menutup formulir berarti keluar.
5. Setelah password diganti, masuk kembali dengan password baru. Password dan sesi lama tidak berlaku lagi.

Komponen Pengguna yang sudah ada digunakan ulang; tidak ada sistem akun kedua. Akun preview `simulated` tidak ditampilkan dalam pengelolaan akun nyata. Karena itu kampus yang hanya mempunyai akun preview dapat menampilkan daftar kosong.

Email duplikat ditolak. Perubahan email dan reset password mencabut sesi lama. Email akun yang terhubung Microsoft tidak dapat diganti di sini. Akun yang terhubung ke aktivasi PIC lama diarahkan ke pengelolaan PIC agar tautan lama tidak mengambil alih email baru. Kata sandi Microsoft tidak diubah oleh aplikasi; sesi OAuth dibedakan melalui klaim server bertanda tangan. Flag password sementara tetap berlaku untuk login password, walaupun akun pernah masuk melalui OAuth.

Riwayat tab hanya memuat perubahan akun dalam konteks kampus tersebut; riwayat Pengguna global tetap mencakup semua konteks akun. Password dan token tidak dimasukkan ke audit. Penugasan atau pemindahan kampus tercatat pada konteks kampus tujuan; pelepasan peran kampus tercatat pada kampus asal.

## Kirim akses melalui WhatsApp

Tombol **Siapkan & kirim akses** tersedia untuk akun kampus yang belum pernah login, masih wajib ganti password, atau nonaktif. Status Aktif/Nonaktif berarti izin masuk, bukan riwayat login. Tombol tidak diperlukan untuk akun aktif yang sudah login dan selesai mengganti password. Admin melihat konfirmasi penggantian password/pencabutan sesi; akun nonaktif juga memiliki peringatan pengaktifan kembali. Hanya setelah konfirmasi, endpoint akun yang sama mengaktifkan akun bila perlu sekaligus menetapkan password sementara, lalu membuka dialog WhatsApp. Batal tidak mengubah akun. Tidak ada tautan aktivasi sekali pakai.

Pada daftar **Pengguna**, akun nonaktif hanya muncul saat filter **Nonaktif** dipilih; filter peran dan **Semua** hanya menampilkan akun aktif.

Pilih satu atau beberapa kontak Mentor, Koordinator PFS 12, atau Local hero; nomor kosong/tidak valid tidak bisa dipilih. Nomor manual juga dapat ditambahkan. Nomor yang sama digabung agar tidak muncul dua tautan penerima.

Template berisi kampus, link login, email, dan arahan mengganti password. Admin dapat mengedit teks. Link awal mengikuti alamat aplikasi yang sedang dibuka; pada localhost ada peringatan untuk menggantinya sebelum mengirim sungguhan. Setiap penerima memiliki tautan WhatsApp sendiri; admin tetap memeriksa dan menekan Kirim di WhatsApp. Membuka tautan bukan bukti pesan terkirim.

Setelah membuat/reset akun, password sementara langsung tercantum di kotak template, di bawah email. Isi WhatsApp sama dengan template (selain spasi awal/akhir), tanpa tambahan tersembunyi atau checkbox password. Admin dapat mengedit teks sebelum membuka WhatsApp. Password hanya ada dalam state dialog dan dibersihkan saat ditutup; tidak disimpan di localStorage, sessionStorage, atau audit. Password menjadi bagian pesan dan URL WhatsApp, sehingga admin wajib memastikan penerima benar. Membuka kembali tombol Siapkan & kirim akses tidak mengambil password lama dari database: konfirmasi ulang akan menggantinya dengan password sementara baru.

API admin `/api/users` menyertakan tiga kelompok kontak pada opsi kampus, bukan seluruh profil. Tidak ada integrasi pengiriman otomatis, perubahan schema, atau panggilan WhatsApp dari server.

QA browser lokal: pilihan kontak + nomor manual menghasilkan dua tautan dengan awalan 62; nomor invalid menutup tautan kirim; pesan akun lama tidak memuat password. Akun khusus **QA WhatsApp Lokal** dibuat, alur dialog setelah buat/reset diperiksa, password reset masuk ke pesan secara default, lalu dialog ditutup/dibuka ulang untuk memastikan password tidak tersedia lagi. Akun uji sudah dinonaktifkan, audit dipertahankan; akun Test QA milik pengguna tidak diubah. Tampilan desktop dan 390 px diperiksa (`.playwright-mcp/account-whatsapp-desktop.png`, `account-whatsapp-mobile.png`). Tidak ada pesan WhatsApp sungguhan dikirim, dan tes terminal tidak dijalankan.

QA tambahan alur akun nonaktif: tombol persiapan tampil; Batal mempertahankan status nonaktif. Konfirmasi mengaktifkan akun uji, menetapkan wajib ganti password, dan menghasilkan pesan email + password sementara. Akun khusus QA WhatsApp Lokal kembali dinonaktifkan setelah pemeriksaan. Tidak ada pesan sungguhan dikirim.

Perbaikan pratinjau: QA browser memastikan password terlihat di textarea dan teks tautan WhatsApp sama persis dengan `textarea.value.trim()`. Sebelumnya password hanya ditambahkan ke tautan, tidak terlihat di template. Akun uji kembali dinonaktifkan setelah pemeriksaan.

Pemeriksaan ulang melalui Console browser setelah membuat/reset akun uji lokal dan memilih penerima; tidak membuka tautan atau mencetak password:

```js
(() => {
  if (location.hostname !== 'localhost') throw Error('Khusus lokal');
  const links = [...document.querySelectorAll('dialog[open] a[href^="https://wa.me/"]')];
  if (!links.length) throw Error('Pilih penerima terlebih dahulu');
  for (const link of links) {
    const url = new URL(link.href);
    const message = url.searchParams.get('text') || '';
    if (!/^\/\d{9,15}$/.test(url.pathname) || !message.includes('Kata sandi sementara:') || message !== document.querySelector('dialog[open] textarea').value.trim()) throw Error('Tautan akses awal belum lengkap atau berbeda dari template');
  }
  return 'Tautan akses awal lengkap; belum dikirim';
})();
```

## Schema dan isolasi

- `.env.local`: PocketBase `http://127.0.0.1:8097`, instance `.local/pocketbase/tests/production-copy-1789801517464`. R2 production dikosongkan; berkas menggunakan penyimpanan lokal.
- Tidak membutuhkan field baru atau migrasi production. Status wajib ganti password diturunkan dari awalan `pwreset:` pada field `users.sessionVersion` yang sudah ada. Nilai sepanjang 58 karakter sesuai batas 80, dengan 200 bit acak untuk pencabutan sesi. Nilai mentah tidak dikirim melalui DTO pengguna.
- Pembuatan/reset oleh admin memasang penanda; logout dan pencabutan sesi karena perubahan akses mempertahankannya. Perubahan password oleh pemilik mengganti versi sesi tanpa penanda. Akun lama tanpa penanda tidak dipaksa mengganti password secara massal.
- `passwordChangeRequired` tetap menjadi boolean pada respons aplikasi, bukan field PocketBase. Pengecualian OAuth mengikuti metode login pada klaim sesi bertanda tangan server.
- Eksperimen field boolean lokal sudah dihentikan: backup `before-schema-free-password-20260919-172706.zip`, konversi dua akun lokal yang masih wajib ganti password, lalu hapus field tersebut hanya di instance lokal. Schema production diperiksa read-only; tidak ditulis.

## QA browser yang dilakukan

Regresi terakhir memakai PocketBase lokal **tanpa field boolean tambahan**: reset berhasil; login sementara menuju `/ganti-password`; dashboard, pengguna, dan realtime ditolak 403. Menutup formulir/logout lalu masuk lagi tetap mewajibkan perubahan password. Setelah perubahan melalui formulir asli, password baru membuka dashboard dengan flag false, password lama ditolak 401, profil sendiri dapat disimpan (200), profil kampus lain dan API pengguna ditolak 403. Akun QA kembali dinonaktifkan. Pembuatan akun baru juga berhasil (201) dengan flag true; penonaktifan mempertahankan penanda wajib ganti password.

Race pada formulir Tambah akun diperbaiki dengan menyimpan password yang benar-benar dikirim sebelum menunggu respons. QA browser menahan respons create yang sudah berhasil lalu mengedit input: template tetap memakai password yang dikirim, bukan nilai input baru. Tidak ada pesan WhatsApp dikirim.

Batas verifikasi: login Microsoft interaktif, deployment Cloudflare, dan konkurensi reset admin bersamaan dengan perubahan password pemilik belum diuji. Review menemukan risiko konkurensi yang sudah ada pada penyimpanan snapshot akun di backend; pekerjaan ini tidak mengganti mekanisme transaksi tersebut. Tes terminal/check/lint/build tidak dijalankan.

Perapian dialog sukses: ikon centang berada di tengah dalam lingkaran hijau, teks dibatasi lebarnya, dan jarak ke tombol konsisten. QA visual memakai komponen asli dengan respons sukses simulasi di browser, tanpa mengubah password atau database. Diperiksa pada desktop dan 390 px: ikon terpusat dan dialog tidak overflow. Bukti: `.playwright-mcp/password-success-neat-desktop.png` dan `password-success-neat-mobile.png`. Perubahan ini hanya tata letak; tidak mengulang pengujian autentikasi.

- [x] Tab Akun Universitas Pattimura terbuka; kampus dan peran terkunci pada form.
- [x] Membuat satu akun uji lokal, mengubah email, dan memuat kembali hasil tersimpan.
- [x] Email duplikat 409, password lemah 400, perubahan akun dengan scope kampus lain 403.
- [x] Login password sementara diarahkan ke `/ganti-password`.
- [x] Dashboard, navigasi, pengguna, dan pencairan melalui API ditolak 403 dengan `PASSWORD_CHANGE_REQUIRED` sebelum password diganti.
- [x] Password saat ini yang salah ditolak; password yang benar berhasil diganti.
- [x] Password lama ditolak 401; password baru berhasil membuka dashboard kampus dan flag sudah false.
- [x] Akun kampus tetap ditolak 403 saat meminta pengelolaan pengguna.
- [x] Reset dari admin memulihkan flag dan login berikutnya kembali ke ganti password; audit reset terlihat pada tab.
- [x] Membuka dashboard lewat URL langsung kembali ke ganti password; menutup formulir mengakhiri sesi (session 401).
- [x] Tab Akun pada desktop 1440 px dan ponsel 390 px; formulir wajib password muat pada ponsel tanpa overflow.
- [x] Waktu login password tercatat; penonaktifan akun uji terlihat di riwayat kampus dan riwayat Pengguna global.
- [ ] Login Microsoft interaktif belum diuji; pengecualian OAuth diperiksa pada kode, bukan bukti login provider.
- [ ] Tes terminal, check, lint, dan build tidak dijalankan sesuai AGENTS.md.

Bukti lokal: `.playwright-mcp/akun-kampus-desktop.png`, `akun-kampus-mobile.png`, `password-wajib-mobile.png`. Error HTTP yang disengaja pada skenario penolakan bukan klaim bebas error pada seluruh aplikasi. Rute baru sempat 404 karena manifest server dev belum diperbarui; restart Vite memulihkan rute dan alurnya diuji ulang.

Akun **QA Akun Kampus Lokal** dinonaktifkan sesudah pengujian; data dan auditnya dipertahankan. Akun preview admin/kampus yang sudah ada tidak diubah. Review kode terpisah tidak menemukan blocker keamanan baru pada alur yang diperiksa; temuan konteks audit penugasan kampus sudah diperbaiki. Konkurensi runtime dan login provider langsung belum diverifikasi.

### Pemeriksaan regresi kecil melalui Console browser

Jalankan hanya setelah login akun uji dengan password sementara pada localhost. Tidak mengubah data dan tidak membutuhkan password dalam skrip.

```js
await (async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw Error('Khusus lokal');
  const { session } = await (await fetch('/api/session')).json();
  if (!session?.passwordChangeRequired) throw Error('Pakai akun dengan password sementara');
  for (const url of ['/api/views/dashboard', '/api/navigation', '/api/users']) {
    const response = await fetch(url);
    const body = await response.json();
    if (response.status !== 403 || body.code !== 'PASSWORD_CHANGE_REQUIRED') {
      throw Error('Pembatasan gagal: ' + url);
    }
  }
  if (location.pathname !== '/ganti-password') throw Error('Pengalihan belum benar');
  return 'Pembatasan password sementara bekerja';
})();
```
