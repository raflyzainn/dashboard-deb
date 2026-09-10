# Perbandingan versi proposal

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

Implementasi 8 September 2026 atas permintaan pengguna untuk meninjau perubahan dokumen seperti review PR GitHub. Fitur ini menambah cakupan di luar brief awal yang hanya menetapkan penyimpanan versi.

## Alur

1. Buka Proposal sebagai Kampus atau Admin, atau tab Proposal pada detail kampus Admin.
2. Pada bagian Bandingkan versi proposal, pilih versi dasar dan pembanding dari kampus yang sedang dibuka. Default adalah dua versi terbaru.
3. Hasil dihitung otomatis saat pasangan berubah. Versi tidak harus berurutan; arah dapat ditukar.
4. Baris yang hilang diberi warna merah dan tanda minus. Baris baru berwarna hijau dengan tanda plus. Perubahan satu baris tampil sebagai penghapusan dan penambahan.
5. Pilih Berdampingan atau Gabungan, serta Hanya perubahan bila ingin menyembunyikan konteks yang sama.
6. Nomor baris mengikuti hasil ekstraksi; referensi halaman menunjuk halaman sumber. Tombol Buka PDF tetap tersedia untuk pemeriksaan dokumen asli.

Hasil berasal dari isi file, bukan catatan perubahan manual. Pemilihan versi yang sama menampilkan petunjuk. Kurang dari dua versi menampilkan kondisi kosong. Pergantian kampus mengganti pilihan dan membatalkan proses lama; hasil dari pasangan sebelumnya tidak boleh muncul pada pasangan baru.

## Batas kemampuan

- Membandingkan teks PDF, tidak membandingkan gambar, font, format, atau tata letak visual.
- Spasi berulang dinormalisasi. Huruf besar/kecil, tanda baca, dan angka tetap diperhitungkan.
- Urutan teks PDF dengan kolom/tabel dapat berbeda dari urutan visual. Perubahan pembungkusan baris dapat menghasilkan perubahan tambahan.
- PDF scan tanpa teks menampilkan pesan OCR belum tersedia. Halaman tanpa teks dalam PDF campuran ditandai sebagai tidak tercakup.
- File rusak atau dilindungi kata sandi menampilkan error dan tetap dapat dibuka melalui PDF asli.
- Batas pembacaan per file: 150 halaman, 300.000 karakter, 6.000 baris. Diff memiliki batas waktu 2 detik. Batas terlampaui menampilkan pesan, tidak menyajikan hasil terpotong sebagai hasil lengkap.
- Penyimpanan file dan akses tetap mengikuti service mock. Tidak ada file dikirim ke layanan pembanding eksternal.

## Implementasi dan verifikasi

`src/lib/data/pdf-text.ts` membaca PDF lewat PDF.js dan worker yang dibundel lokal. Modul dimuat saat perbandingan dibutuhkan. `src/lib/data/proposal-diff.ts` menggunakan jsdiff untuk perubahan baris. `src/lib/components/ProposalCompare.svelte` menyajikan pasangan versi dan hasil, dengan pembatalan pembacaan lama.

Dokumentasi library: [PDF.js](https://mozilla.github.io/pdf.js/examples/) dan [jsdiff](https://github.com/kpdecker/jsdiff).

Tes: `tests/proposal-diff.test.ts` dan `tests/browser/proposal-compare.spec.ts`. Cakupan meliputi isi PDF asli, pasangan versi tidak berurutan, arah terbalik, file identik, kondisi tanpa teks/rusak, pemulihan setelah ganti pasangan, scope kampus, persistensi, desktop/mobile, dan regresi lebar kolom nomor baris.

Jalankan `npm test`, `npm run check`, `npm run test:e2e`, lalu `npm run build`. Hindari menjalankan build bersamaan dengan tes pada server dev yang sama karena regenerasi SvelteKit dapat memicu reload di tengah tes.
