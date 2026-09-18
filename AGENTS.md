# Panduan wajib Codex — Dashboard DEB

Instruksi ini berlaku untuk seluruh repository. Instruksi terbaru pengguna dalam percakapan menjadi acuan apabila ada perbedaan dengan dokumentasi lama.

## Setiap memulai chat

Sebelum mengubah kode atau menjalankan perintah proyek:

1. Baca `AGENTS.md` ini sampai selesai.
2. Baca `README.md` dan [panduan proyek Codex](docs/PANDUAN-CODEX.md).
3. Baca seluruh dokumentasi Markdown dalam `docs/`, termasuk subdirektorinya. Jangan hanya membaca nama berkas atau mengandalkan ingatan chat sebelumnya. Dokumen rencana, checklist, dan laporan QA termasuk dalam kewajiban ini.
4. Bedakan panduan yang berlaku, rencana yang belum selesai, laporan historis, dan dokumentasi backend lama. Periksa kondisi kode saat ini sebelum menerapkan petunjuk lama.
5. Periksa instruksi `AGENTS.md` tambahan pada direktori yang akan dikerjakan, jika ada. Jika dokumen tidak bisa dibaca, sampaikan bagian yang belum terbaca; jangan mengaku sudah membaca semuanya.

Kewajiban membaca berlaku pada setiap chat baru, bukan mengulang seluruh dokumen pada setiap pesan dalam chat yang sama. Baca ulang bagian yang berubah atau relevan ketika lingkup pekerjaan berganti.

## Git dan publikasi

- **Jangan push atau membuat PR/MR sebelum pengguna menyuruh secara eksplisit.** Selesai implementasi atau QA bukan izin publikasi.
- Jangan melakukan merge, deploy, atau perubahan remote tanpa instruksi pengguna.
- Kerjakan perubahan secara lokal. Pertahankan perubahan pengguna dan berkas yang tidak terkait. Jangan otomatis commit kecuali diminta.

## Pengujian

- **Jangan menjalankan tes melalui terminal untuk saat ini.** Tunggu instruksi eksplisit pengguna sebelum menjalankannya.
- Larangan mencakup `npm test`, semua `npm run test:*`, `npx playwright test`, runner Node/tsx/Vitest, skrip assertion, dan cara lain menjalankan tes dari shell. Jangan mengganti nama perintah untuk melewati aturan ini.
- Tunda juga pemeriksaan otomatis terminal seperti `npm run check`, lint, `format:check`, dan build yang hanya ditujukan untuk verifikasi, kecuali diminta.
- **Lakukan QA melalui browser menggunakan tool Playwright yang tersedia**, dengan interaksi halaman, pemeriksaan hasil terlihat, dan screenshot jika membantu. Playwright CLI tetap termasuk tes terminal yang ditunda.
- Membaca/mengedit berkas, memeriksa Git secara read-only, dan menjalankan server pengembangan lokal untuk membuka aplikasi di browser diperbolehkan. Itu bukan izin menjalankan test suite atau layanan produksi.
- Jika tool Playwright/browser tidak tersedia, laporkan keterbatasannya. Jangan diam-diam beralih ke tes terminal.
- Pisahkan hasil QA browser, hasil pemeriksaan kode, dan tes terminal yang belum dijalankan. Jangan mengklaim tes lulus tanpa hasilnya.

## Cara bekerja

- Gunakan bahasa Indonesia yang jelas dan ringkas dalam komunikasi serta dokumentasi untuk pengguna.
- Telusuri alur terkait sebelum mengedit. Gunakan komponen dan layanan yang sudah ada; hindari perubahan besar di luar permintaan.
- Perbarui checklist/panduan jika perilaku aplikasi berubah. Catat hasil QA yang benar-benar dilakukan.
- Ikuti [docs/PANDUAN-CODEX.md](docs/PANDUAN-CODEX.md) untuk arsitektur, peran, dan batas aplikasi aktif.
