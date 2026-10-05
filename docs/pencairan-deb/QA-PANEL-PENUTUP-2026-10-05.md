# QA panel penutup pencairan — 5 Oktober 2026

Target lokal: frontend `127.0.0.1:5176`, PocketBase `127.0.0.1:8097`.
Pemeriksaan melalui tool Playwright, tanpa menjalankan tes/check/build terminal.

## Perubahan

- Pembayaran memenuhi lebar konten: nominal dan status di atas, detail transfer dalam grid responsif, bukti transfer di bagian terpisah.
- Latar Pembayaran, Tanda tangan, dan Lampiran putih. Tabel/kartu memakai garis batas tipis.
- Kolom Asli menggunakan badge status, tanggal pencatatan, dan tombol Catat asli diterima atau Batalkan penerimaan. Checkbox dihapus.
- Pengajuan sudah dibayar tidak menyediakan pembatalan penerimaan; pencatatan penerimaan juga dinonaktifkan.
- Snackbar error otomatis hilang setelah 5 detik. Tombol X tetap tersedia. Pesan berbeda yang masuk mengganti pesan sebelumnya dan memulai timer baru.

## Hasil QA browser

- [x] Universitas Pertamina: ketiga halaman terbuka pada desktop 1440 × 900 dan mobile 390 × 900.
- [x] Latar ketiga panel terukur putih; tidak ada overflow horizontal halaman pada keenam pemeriksaan.
- [x] Pembayaran menampilkan Rp45 juta, status sudah dibayar, tanggal, referensi, pencatat, dan bukti transfer dalam bagian terpisah.
- [x] Empat dokumen menampilkan badge Asli diterima dan tanggal/jam; checkbox dan tombol pembatalan tidak muncul pada pengajuan dibayar.
- [x] IPB belum dibayar: empat tombol Catat asli diterima tersedia, status Belum diterima tampil, dan tidak ada checkbox. Tombol pembayaran tetap nonaktif ketika nominal belum ditetapkan.
- [x] Snackbar contoh ditampilkan lewat event UI browser dan hilang tanpa klik sekitar 5,5 detik sejak terlihat (timer 5 detik ditambah waktu pengamatan).
- [x] Pesan berbeda dikirim setelah 3 detik: pesan baru tetap tampil setelah batas timer lama, lalu hilang otomatis sesuai timer baru.
- [x] Tombol X tetap menutup snackbar.
- [x] Console halaman terakhir: 0 error dan 0 warning.

Screenshot: `.playwright-mcp/qa-ui-{ttd,lampiran,bayar}-{1440,390}-20261005.png`.
Screenshot Pembayaran dan Tanda tangan desktop/mobile juga diperiksa secara visual.

## Batas

Tidak mencatat/membatalkan penerimaan asli, mengunggah berkas, membuat lampiran, atau mencatat pembayaran dalam QA ini. Persistensi tindakan tersebut tidak diuji ulang. Snackbar diuji lewat event UI, bukan dengan sengaja mengubah data agar server menolak. Tidak ada commit, push, atau deploy.

Catatan ini menggantikan ketentuan error harus ditutup manual dalam laporan snackbar 1 Oktober untuk perilaku terbaru yang diminta pengguna.

## Pemeriksaan awal terminal setelah izin pengguna (historis)

Pengguna kemudian mengizinkan tes terminal/build dan meminta push ke GitLab serta GitHub pada `feat/pencairan-pocketbase-local` hanya jika hasil sudah OK. Pemeriksaan memakai Node 25.5.0; proyek menyatakan Node 22.x.

| Perintah | Hasil akhir |
| --- | --- |
| `npm test` | Exit 1: 34 tes, 26 lulus, 8 gagal. |
| `npm run check` | Exit 1: 144 error dan 12 warning di 33 file. |
| `npm run build` | Exit 0: adapter-static menulis output `build/`; mode mockup/dummy sesuai package.json. |

Tujuh berkas tes gagal saat impor `src/lib/data/demo/store.ts:31`, karena `import.meta.env` tidak tersedia di runner Node. Tes logout gagal karena teramati satu request backend sementara kontraknya mengharapkan nol. Pemeriksaan tipe mencakup ketidakcocokan layanan data, peran `finance`, parameter rute opsional, dan `modal` yang mungkin null pada bagian TandaTanganView di luar perubahan UI sesi ini. Build tetap memiliki warning reaktivitas, aksesibilitas, properti duplikat, dan ukuran chunk.

Percobaan sandbox pertama mengalami `spawn EPERM` pada check dan tes yang tidak selesai; tes dihentikan lalu diulang dengan akses proses yang diperlukan. Tabel di atas adalah hasil eksekusi ulang, bukan hasil sandbox tersebut. Check selesai sebelum build dimulai.

Log lengkap lokal: `.playwright-mcp/terminal-{test,check,build}-20261005.log`.
Tidak menjalankan suite integrasi PocketBase atau E2E terminal, tidak melakukan provisioning/reset, dan tidak memperbaiki masalah di luar perubahan UI. Syarat push belum terpenuhi; tidak ada commit, push, merge, atau deploy.

## Perbaikan dan QA ulang

Pengguna kemudian meminta perbaikan seluruh kegagalan, QA ulang, build, lalu push ke GitHub dan GitLab pada branch yang sama.

- Impor fixture Node tidak lagi membaca `import.meta.env` yang belum tersedia. Kontrak tes logout mengikuti perilaku aplikasi: tetap meminta logout server dan membersihkan sesi lokal meski request gagal. Pemeriksaan otorisasi pembayaran tetap menguji penolakan serta memastikan data tidak berubah; pola pesan diperbarui mengikuti pesan PF yang berlaku.
- Pemeriksaan tipe diperbaiki pada kontrak layanan, referensi elemen DOM, parameter rute, buffer Web API, dan tipe payload. Nama lokal `state` di Layar diganti agar tidak menutupi rune `$state`. Deklarasi derived yang bergantung pada deklarasi lain dipindahkan sesudah dependensinya. Properti duplikat dan warning aksesibilitas diperbaiki.
- Navigasi pengajuan terkunci tidak lagi menyimpan `lastSection` melalui PATCH. Proteksi backend pengajuan dibayar tetap berlaku.
- `npm test`: exit 0, 60 lulus, 0 gagal. `npm run check`: exit 0, 0 error, 0 warning. Log: `.playwright-mcp/fix-{test,check}-20261005.log`.
- QA browser Universitas Pertamina: berpindah enam butir melalui tombol, termasuk RAB 100%, 70%, 30%, administrasi, PKS, dan data program. Tidak ada PATCH ke `/pengajuan`, tidak ada 409, dan tidak ada snackbar. GET berkala tetap 200. Reload tujuh butir juga menghasilkan GET 200 saja.
- Snackbar contoh lewat event UI hilang otomatis setelah pengamatan 5,5 detik.
- QA admin diulang pada desktop 1440 dan mobile 390: Tanda tangan, Lampiran, dan Pembayaran terbuka tanpa overflow horizontal atau snackbar; checkbox asli tidak ada.
- Screenshot: `.playwright-mcp/qa-campus-paid-navigation-20261005.png` dan `.playwright-mcp/qa-final-*-20261005.png`.
- Setelah QA ulang, `npm run build` selesai dengan exit 0 dan menulis output static `build/`. Mode build bawaan adalah mockup/dummy; build adapter Cloudflare/PocketBase tidak diuji. Warning tersisa hanya ukuran chunk di atas 500 kB, bukan warning Svelte atau kegagalan build. Log: `.playwright-mcp/final-build-20261005.log`.

QA ini tidak melakukan mutasi penerimaan asli, upload, atau pembayaran. Suite integrasi PocketBase dan E2E terminal tidak dijalankan. Tidak ada merge atau deploy.
