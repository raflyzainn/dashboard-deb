# QA checklist dan pencairan demo

18 September 2026. Windows, Node 25.5.0, build statis lokal, Chrome melalui Playwright. `package.json` menyatakan Node 22.x; runtime Node 22 belum diverifikasi dalam sesi ini.

**Tidak ada push/deploy.** Spreadsheet pengguna tidak diubah. Finansial dan pengiriman bersifat simulasi browser.

## Aturan pengujian terbaru

Pengguna kemudian meminta seluruh tes terminal ditunda dan QA menggunakan tool browser Playwright. Hasil terminal berikut dijalankan sebelum instruksi tersebut; jangan menjadikannya izin untuk menjalankan ulang. Tes regresi pemilihan proposal saat admin mengganti kampus sudah ditambahkan, tetapi runner terminal belum dijalankan untuk tes baru ini.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run check` | Lulus: 0 error, 0 warning |
| `npm test` | Lulus: 54 tes |
| `npm run build` | Lulus; adapter-static menghasilkan `build` |
| `npm run test:e2e` | Lulus: 19 skenario Playwright sebelum perbaikan pilihan proposal saat berganti kampus |
| Prettier pada seluruh berkas Svelte yang diubah/ditambahkan | Lulus |
| `git diff --check` dan tautan dokumentasi lokal | Lulus |

Perubahan terakhir: halaman pencairan Mentor dan SoBI hanya berisi kartu delapan tahap tanpa nominal, formulir, berkas, atau tombol tindakan. Admin PF mengendalikan pemeriksaan dan tahap pencairan; Keuangan dapat mengunggah atau mengganti dokumen pada tahap kelengkapan. Hak edit profil/proposal kampus tetap tersedia.

Skenario [payments.spec.ts](../tests/browser/payments.spec.ts): berbagi perubahan Mentor/SoBI, deskripsi poin, komentar per versi, pemeriksaan KPI, unggah empat PDF, validasi PF, pencatatan approval tiga pihak oleh Admin PF, ekspor/arsip PDF, refresh, pencairan, isolasi kampus melalui URL, penolakan/revisi, PDF rusak, serta notifikasi pengajuan versi lama. Screenshot desktop dan mobile 390 px diperiksa, termasuk overflow horizontal.

[payments.test.ts](../tests/payments.test.ts) menguji penolakan seluruh metode mutasi untuk Mentor, SoBI, dan keuangan, serta isolasi file, revisi basi, urutan approval, bukti KPI, nominal, penolakan, validasi PDF, arsip sekali kirim, pembungkusan teks panjang, serta migrasi proposal lama. Skenario lama tetap dijalankan melalui [demo.spec.ts](../tests/browser/demo.spec.ts).

## Temuan yang diperbaiki

- Helper Playwright berpacu dengan pemulihan sesi; pilihan akun sekarang dibersihkan sebelum navigasi login berikutnya.
- Ekspektasi lama 40 pilihan login diperbarui menjadi 80 identitas untuk 40 kampus, termasuk 40 akun SoBI.
- Notifikasi sekarang menyertakan ID pengajuan, bukan hanya ID kampus.
- Proposal diperiksa dengan parser PDF sebelum disimpan/dipakai dalam pengajuan.
- Lebar font menentukan pembungkusan teks pada PDF, termasuk kata panjang tanpa spasi.
- Migrasi memakai proposal fixture untuk approval dummy, bukan menganggap unggahan lama sudah diperiksa.
- Skenario PDF rusak melengkapi catatan versi wajib agar validasi HTML tidak menghentikan pengiriman formulir sebelum parser PDF diuji.

## Bukti lokal

- [Mentor: alur saja](../.qa/payment-mentor-tracking.png)
- [SoBI: alur saja](../.qa/payment-sobi-tracking.png)
- [Admin desktop](../.qa/payment-admin-desktop.png)
- [Keuangan desktop](../.qa/payment-finance-desktop.png)
- [Keuangan mobile](../.qa/payment-finance-mobile.png)
- [Kampus mobile](../.qa/payment-campus-mobile.png)
- [Paket PDF hasil Playwright](../.qa/payment-package.pdf)

Artefak `.qa` bersifat lokal dan dapat diabaikan Git. Dukungan pratinjau PDF tertanam tergantung browser; tautan unduh tersedia.

PDF menggunakan [pdf-lib](https://pdf-lib.js.org/) untuk menggabungkan halaman lampiran tanpa mengubah sumber. Library dimuat saat PDF perlu divalidasi/diekspor.


## QA browser setelah aturan baru

Dijalankan melalui tool browser Playwright, tanpa runner tes terminal:

- Admin memilih proposal kampus 001, berpindah ke kampus 002: pilihan versi direset dan pengajuan baru nominal contoh Rp987.654 muncul pada kampus 002.
- Mentor `campus-001` dan SoBI `campus-001-pic2`: masing-masing menampilkan delapan tahap, tanpa nominal serta tanpa input, form, tombol tindakan, select, atau iframe dalam konten halaman pencairan.
- Tampilan mobile 390 ? 844 tidak mengalami overflow horizontal.
- Empat dokumen pembayaran tampil langsung sebagai pratinjau PDF pada kartu masing-masing, memiliki tautan unduh, tanpa error maupun overflow horizontal pada halaman Admin.
- Pada tahap Kelengkapan dokumen, akun Keuangan menampilkan empat input unggah dan berhasil mengunggah Nota PDF hingga status Menunggu pemeriksaan; kontrol validasi dan perubahan tahap Admin tidak tampil.
- Admin PF dan Keuangan memiliki percakapan feedback pencairan dua arah; setiap pesan menyimpan tahap, pelaku, waktu, isi, dan notifikasi untuk peran penerima.
- Paket PDF gabungan yang dikirim Admin tampil langsung pada Arsip Keuangan dengan pratinjau dan tautan unduh.
- [Screenshot kampus mobile terbaru](../.qa/payment-campus-tracking-final.png).
- [Screenshot dokumen pembayaran langsung](../.qa/payment-documents-inline.png).
- [Screenshot feedback dan arsip pada Keuangan](../.qa/payment-finance-feedback-archive.png).

Saat QA pertama, kampus 003 tidak memiliki versi proposal lain yang dapat diajukan; skenario diperbaiki menggunakan kampus 002 yang mempunyai versi tersedia. Tes regresi terminal yang disimpan memakai skenario yang sama, tetapi belum dieksekusi sesuai instruksi terbaru pengguna.
