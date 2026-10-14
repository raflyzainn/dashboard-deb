# QA Peta Persebaran - RAFLY999-8

Implementasi lokal pada branch `agent/developer-deb/rafly999-8`, basis runtime `edf835c6abce6af311f7026118c150c0b45958f6`, di atas development `5c16f6684f71191582d2f89844f0847ed601bae7`. Belum commit implementasi atau publikasi; QA DEB independen belum menyatakan acceptance criteria lulus (cycle 0).

## Akar masalah dan perubahan

View `/api/views/map` sudah membaca PocketBase, memfilter periode dan menghitung `campusMetrics` melalui layanan bersama. Pada snapshot lokal terdapat 40 kampus, nol koordinat master dalam batas Indonesia, 27 profil dengan isian koordinat, dan nol definisi/aktual indikator. Karena itu peta lama menampilkan nol titik; progres nol berasal dari data, bukan kegagalan API.

`src/lib/map.ts` memakai pin Profil DEB melalui parser/validasi lokasi yang sudah ada. Pin profil eksplisit, termasuk kosong, didahulukan; record lama tanpa field tersebut tetap memakai lokasi master. Provinsi mengikuti profil bila tersedia; wilayah memakai metadata existing. Tidak geocoding, menebak koordinat, mengisi indikator, membuat rumus bisnis, atau mengubah database/schema.

Halaman `/admin/sebaran` memfilter seluruh kampus sebelum menghitung ringkasan, termasuk kampus tanpa pin. Legenda mengikuti pencarian/wilayah; pilihan kategori mengubah ringkasan/peta. Daftar nama dan tautan kampus tanpa koordinat tersedia. Keadaan tanpa kampus, tanpa hasil filter, koordinat belum tersedia, loading dan kegagalan refresh dibedakan. Refresh gagal mempertahankan data terakhir dengan peringatan dan retry.

## Bukti browser aktual

Tool Playwright, frontend worktree 5188, PocketBase lokal bertanda 8096. Instance terpisah memakai online backup SQLite dari data lokal existing; objek dan kredensial tetap privat. Layanan pengguna 5176/8097 tidak dihentikan atau diubah. Dependency dipasang melalui `npm ci --ignore-scripts --no-audit --no-fund`, tanpa perubahan lockfile.

| Pemeriksaan | Hasil |
| --- | --- |
| Sebelum fix | API 200, 40 kampus, 0 titik, indikator 0 |
| Sesudah fix, data PocketBase sebenarnya | 21 titik valid, 19 kampus belum dapat dipetakan; seluruh 40 tetap masuk ringkasan |
| Daftar tanpa pin | 19 nama kampus dan 19 tautan detail tersedia |
| Pemilihan, zoom dan geser | Titik membuka nama/tautan kampus yang tepat; zoom 130%, geser saat diperbesar dan reset berfungsi |
| Wilayah Jawa | 9 titik; ringkasan 15 kampus; kampus tanpa pin tetap dihitung |
| Pencarian tanpa hasil / kategori tanpa hasil | 0 titik dan 0 ringkasan, pesan kosong terlihat |
| Dataset kosong, fixture respons browser | Pesan Belum ada kampus terlihat; setelah fixture dilepas kembali 21 titik |
| Gagal API awal, intersepsi 503 browser | Data belum dapat dimuat, tanpa peta palsu; retry pulih ke 21 titik |
| Gagal refresh, intersepsi 503 browser | 21 titik terakhir dipertahankan, peringatan terlihat; retry memulihkan data |
| Akses API tanpa sesi / kampus | 401 / 403 |
| Periode tidak dikenal | 404, tidak diperlakukan sebagai data nol |
| Desktop 1366 dan mobile 390 | Tidak ada overflow horizontal; screenshot diperiksa |
| Self-check helper di browser | Pin profil, koordinat kosong/invalid, total wilayah dan kompatibilitas pin master lama sesuai |
| Fixture respons browser dengan progres 0/65/75 | Rata-rata 46,7%; filter kategori tertinggi menghasilkan satu kampus, progres/ringkasan 75%, termasuk bila tanpa pin |

Fixture hanya untuk memeriksa UI/error; database tidak diisi dengan angka fixture. Data asli dipulihkan dengan melepas intersepsi dan reload; hasil akhir kembali 21 titik dan progres 0%. Screenshot lokal: `output/rafly999-8-map-desktop.png` dan `output/rafly999-8-map-mobile.png`.

## Cara QA ulang

Gunakan worktree dan branch implementasi yang sama, bukan folder utama. Bila layanan task sudah berhenti, jalankan binary lokal dengan `serve --http=127.0.0.1:8096 --dir=.local/pocketbase/pb_data --automigrate=false`, lalu `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5188 --strictPort`. Konfigurasi `.env.local` task memakai instance development lokal bertanda 8096, tanpa credential R2/production. Jangan menjalankan launcher 5176/8097 pada task ini ketika layanan pengguna aktif.

Buka login task, pilih Admin PF 1, lalu Peta Persebaran. Ulangi jumlah/nama/koordinat, pilih titik, zoom/geser/reset, pencarian, wilayah, legenda, daftar tanpa pin, retry, desktop/mobile dan batas akses. Pengujian periode aktif/arsip dengan indikator nyata perlu data lokal existing yang memiliki periode tersebut; snapshot task saat ini tidak memilikinya. Jangan menambah schema atau indikator contoh untuk membuat progres tampak terisi.

Tes regresi diperbarui pada `tests/map.test.ts` dan `tests/masters.test.ts`, tetapi tes terminal/check/lint tidak dijalankan sesuai AGENTS.md. Build ditunda ke tahap publikasi setelah QA DEB lulus. Runtime Node 25.5.0 berbeda dari kebutuhan Node 22.x; instalasi memberi warning engine. Tidak memverifikasi production, semua periode nyata, semua browser/perangkat atau keabsahan geografis setiap pin. Data lokal adalah snapshot sumber existing, bukan klaim selalu identik dengan production terbaru.
