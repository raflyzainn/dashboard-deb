# QA akses halaman kampus — 12 Oktober 2026

## Aturan setelah koreksi pengguna

Beranda, Pencairan Dana, Notifikasi, dan Panduan Aplikasi tetap tersedia. Menu, breadcrumb Beranda, bel notifikasi, dan tujuan login Beranda dipulihkan seperti sebelumnya. URL modul yang belum dipakai atau halaman admin dialihkan ke Beranda kampus sebelum konten dirender. API modul yang belum dipakai ditolak untuk kampus; izin admin tetap mengikuti perannya.

## Bukti browser lokal setelah koreksi

- `/campus/dashboard`, `/campus/guide`, `/campus/notifications`, dan `/campus/pencairan` tetap pada URL masing-masing tanpa pesan Data belum dapat dimuat.
- Proposal, indikator, forum, profil, dan LPJ dialihkan ke `/campus/dashboard`.
- `/admin/dashboard` dan `/admin/users` saat memakai akun kampus juga dialihkan ke Beranda kampus.
- Menu akun menampilkan Beranda, Pencairan Dana, Panduan Aplikasi; bel Notifikasi tampil kembali.
- API notifikasi dan pencairan HTTP 200; API proposal dan pengguna HTTP 403.

## Batas

QA memakai frontend 5176 dan PocketBase lokal 8097 dengan akun preview kampus yang sudah ada. Tidak mengubah data kampus. Tes regresi diperbarui tetapi tes terminal/build/check/lint tidak dijalankan. Belum commit/push/deploy; production belum diperiksa.

Perubahan audit super-admin dan LPJ sebelumnya masih lokal dan terpisah dari pembatasan ini.
