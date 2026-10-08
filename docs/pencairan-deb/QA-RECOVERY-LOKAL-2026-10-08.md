# Drill backup dan pemulihan lokal - 8 Oktober 2026

`scripts/pocketbase/recovery-local.mjs` memulihkan salinan PocketBase QA 8097 ke direktori terpisah, memverifikasi isinya, menjalankan salinan di 8098, lalu menghentikan hanya proses yang dibuatnya. Database aktif tidak dihentikan, ditimpa, atau dihapus.

## Menjalankan ulang

1. Gunakan instance bertanda dari `.env.local` di bawah `.local/pocketbase/tests`, dengan URL tepat `http://127.0.0.1:8097`. Skrip menolak target lain dan tidak membaca `.env` production.
2. Jeda semua tab QA dan penulis data; polling autentikasi juga dapat memperbarui `_authOrigins`.
3. Jalankan `node scripts/pocketbase/recovery-local.mjs --qa-writes-paused`. Tanpa flag, skrip berhenti sebelum membuat backup.
4. Setelah pesan `QA database and objects snapshot verified; QA writes may resume.`, QA boleh dilanjutkan. Snapshot log auxiliary diselesaikan terpisah.
5. Tunggu exit 0 dan manifest. Port 8098 harus tersedia; skrip tidak menghentikan proses lain yang memakai port tersebut.

Skrip memakai online backup SQLite untuk seluruh berkas `.db`, menyalin direktori `objects` dan `pb_data/storage`, lalu membuat direktori `restored` dari backup. Tidak menyalin berkas database aktif secara mentah ketika WAL mungkin masih berjalan. Setiap tabel, termasuk tabel pencairan dan tabel internal, dibandingkan jumlah baris serta SHA-256 kontennya. Semua objek dibandingkan SHA-256. Restore juga membandingkan hash berkas database dan menjalankan `PRAGMA integrity_check` sebelum startup.

## Hasil aktual

- Runtime: Node 25.5.0, PocketBase 0.40.3. Peringatan `node:sqlite` experimental muncul.
- Tanpa flag jeda: exit 1 sesuai guard.
- Percobaan pertama: exit 1 karena `_authOrigins` berubah selama polling; tidak dianggap backup konsisten dan tidak menjalankan clone.
- Percobaan sesudah semua tab QA dijeda: **exit 0**; **2 database, 48 tabel, 598 berkas objek** cocok.
- Contoh jumlah snapshot: 44 disbursements, 46 rab_versions, 2.505 rab_lines, 463 documents, 255 document_versions, 293 reviews, 5 attachments, 3.348 audit.
- Clone PocketBase `http://127.0.0.1:8098/api/health`: **200**; proses clone telah dihentikan. Instance aktif tetap 8097.
- Bukti lokal: `.local/pocketbase/tests/recovery-2026-10-08T02-08-01.859Z-ce4208f0/manifest.json`, dengan direktori `backup` dan `restored` di sebelahnya. Seluruh artefak berada di `.local` yang diabaikan Git.

## Batas bukti

Ini membuktikan pemulihan database dan objek lokal pada titik snapshot, bukan data terbaru setelah QA dilanjutkan. Auxiliary log disnapshot sesudah data bisnis dan objek; keduanya tidak diklaim berada pada waktu transaksi yang sama. Startup clone dapat memperbarui metadata internal; perbandingan dilakukan sebelum startup.

Drill tidak menguji aplikasi penuh terhadap clone, koneksi R2 production, konfigurasi/kunci environment eksternal, disaster recovery lintas mesin, maupun deployment. Kredensial/kunci environment tidak dicetak atau disalin oleh helper. Database backup sendiri tetap berisi data autentikasi; jangan mempublikasikan artefaknya. Auxiliary berukuran sekitar 1 GB; digest tabel saat ini dibaca dalam memori dan cocok hanya untuk ukuran QA ini, bukan strategi backup skala besar. Runtime Node 22 proyek belum diuji oleh drill ini.
