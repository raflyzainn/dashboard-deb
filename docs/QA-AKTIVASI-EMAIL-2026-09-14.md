# Hasil QA bagian 3: Aktivasi akun dan email

Tanggal: 14 September 2026. Basis commit: `8fa8f5e`, menggunakan working tree saat pengujian. Penguji: Codex.

**Hasil: 14 butir lulus dalam cakupan sandbox lokal, 1 butir terblokir untuk deployment HTTPS.** Tidak ditemukan kegagalan fungsi dalam skenario yang dijalankan. Ini bukan persetujuan production.

## Lingkungan dan batas pengujian

- Frontend `http://127.0.0.1:5177`; PocketBase sandbox `http://127.0.0.1:8097`, salinan backup dengan migrasi dan hook proyek saat ini.
- Inbox SMTP Mailpit `http://127.0.0.1:8025`; mode pengiriman lokal, tanpa pengiriman eksternal baru.
- Chrome otomatis: desktop 1366 × 900 dan mobile 390 × 844. Aktivasi dibuka pada browser context baru tanpa sesi admin/kampus sebelumnya.
- Kampus utama uji browser: Institut Teknologi Sepuluh Nopember; akun lama digunakan ulang dalam sandbox sesuai relasi unik kampus. Akun/PIC uji bersifat fiktif.
- Pengujian tidak mengubah database kerja 8096, konfigurasi Postmark-nya, atau akun kampus aktif di lingkungan kerja.
- Gmail/Outlook, perangkat fisik lain, dan domain production tidak diuji dalam putaran ini. Inbox Mailpit membuktikan penerimaan SMTP lokal, bukan penempatan inbox/spam eksternal.

## Hasil per butir checklist

| No. | Skenario | Hasil dan bukti |
|---|---|---|
| 3.1 | Simpan PIC/email dan refresh | Lulus. Admin menyimpan PIC lewat browser; nama/email tetap terlihat setelah refresh. |
| 3.2 | Simpan tidak mengirim email | Lulus. Jumlah undangan untuk penerima uji tetap nol setelah penyimpanan. |
| 3.3 | Aktivasi dan alamat tujuan | Lulus. Submit browser mencapai langkah 2; `.email-destination` sama dengan alamat yang dimasukkan. Screenshot mobile diperiksa. |
| 3.4 | Email tidak terdaftar | Lulus. Respons 200 dan isi respons sama dengan permintaan yang memenuhi syarat; nol undangan dan nol pesan Mailpit untuk alamat tidak terdaftar. |
| 3.5 | Email tidak valid/duplikat | Lulus backend. Format salah ditolak 400; email milik kampus lain ditolak 409. |
| 3.6 | Status pengiriman | Lulus. Undangan tercatat dan worker menghasilkan `sent`; jalur gagal menghasilkan `failed` dan status akun `Gagal dikirim`. |
| 3.7 | Penerimaan inbox | Lulus lokal. Pesan benar-benar diterima inbox Mailpit, bukan hanya status `sent`. Inbox/spam eksternal belum diuji ulang. |
| 3.8 | Pengirim dan isi email | Lulus lokal. Pengirim sandbox, PIC, nama kampus, HTML, versi teks, tombol aktivasi, serta logo inline CID diperiksa. Render visual dibuat dari HTML pesan yang diterima; URL token disamarkan dan logo CID diganti data URI untuk screenshot. Ini tidak membuktikan render semua klien email. |
| 3.9 | URL HTTPS deployment | Terblokir. Tautan yang diterima memakai localhost sandbox. Domain HTTPS deployment dan pengujian end-to-end di sana belum tersedia. |
| 3.10 | Sesi browser lain | Lulus. Tautan dibuka dalam context baru dan menampilkan tahap Buat password dengan kampus yang benar. |
| 3.11 | Kebijakan password | Lulus UI dan backend untuk empat kasus: terlalu pendek, tanpa angka, tanpa huruf kapital, dan konfirmasi berbeda. Tombol simpan nonaktif dan request langsung ditolak 400. |
| 3.12 | Aktivasi sampai login | Lulus. Password valid tersimpan, login menuju dashboard kampus berhasil, dan admin melihat status Aktif. |
| 3.13 | Token tidak sah | Lulus. Token sudah digunakan, diubah, kedaluwarsa, dan dicabut ditolak 400. |
| 3.14 | Cooldown/resend | Lulus. Permintaan langsung berulang tidak menambah undangan. Setelah melewati batas cooldown secara simulasi, undangan baru terbentuk dan undangan lama dicabut. |
| 3.15 | SMTP gagal/retry | Lulus. Port SMTP sandbox diarahkan sementara ke port tidak tersedia; tiga percobaan diperiksa, status tidak pernah `sent`, backoff tercatat, lalu gagal dengan pesan error. Konfigurasi port dipulihkan dalam `finally`. |

## Metode dan artefak

1. `npx tsx --test tests/pocketbase/p1.test.ts`: **6 tes lulus, 0 gagal**. Termasuk registrasi PIC, duplikasi, respons umum, email lokal, token sekali pakai, dan sesi.
2. `npx tsx .qa/activation-checklist.ts`: alur Chrome nyata dari login admin, penyimpanan PIC, permintaan aktivasi, pembacaan Mailpit, validasi password, aktivasi, login kampus, hingga status admin.
3. `npx tsx .qa/activation-negative.ts`: format email, kegagalan SMTP, backoff, resend, serta token rusak/kedaluwarsa/dicabut.

Pengujian waktu mempercepat metadata undangan dan `nextAttempt` hanya di sandbox; tidak menunggu masa berlaku 30 menit atau seluruh jeda retry secara waktu nyata.

Artefak lokal tidak dilacak Git:

- `.qa/qa3-browser-results.json`
- `.qa/qa3-negative-results.json`
- `.qa/qa3-email-destination.png`
- `.qa/qa3-admin-active.png`
- `.qa/qa3-received-email.png`

## Tindak lanjut

- Ulangi bagian aktivasi pada domain HTTPS deployment dengan environment permanen dan penerima eksternal yang disepakati.
- Periksa email aktual di klien yang digunakan kampus, termasuk logo, tombol, inbox/spam, dan tautan pada perangkat lain.
- Jangan menandai butir 3.9 lulus sebelum tautan production yang sebenarnya telah dibuka dan alur aktivasi selesai diuji.
