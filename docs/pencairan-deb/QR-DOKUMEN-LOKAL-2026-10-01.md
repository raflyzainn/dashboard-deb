# QR penerbitan dokumen — 1 Oktober 2026

## Lingkup yang disetujui

Pengguna membatalkan perubahan format/spacing. Template PF dan isi dokumen tetap seperti sebelumnya. Tambahan hanya footer QR dengan siluet simbol PF untuk PKS, surat permohonan, invois, dan kuitansi yang dihasilkan aplikasi. Siluet diambil dari aset `static/favicon-96x96.png`; tidak ada logo baru dari internet.

## Perilaku

- Pratinjau dan unduhan alur PocketBase lokal mendapat QR. Dokumen lama yang sudah tersimpan juga mendapat representasi unduhan ber-QR tanpa menimpa sumbernya.
- QR membuka `/verifikasi/{kode}` tanpa login. Halaman menampilkan kampus, jenis dokumen, nominal, tanggal penerbitan QR, status, dan SHA-256 berkas unduhan.
- Draf tetap ditandai draf meskipun butir tertentu sudah sesuai. Unduhan final setelah paket disetujui menampilkan status persetujuan. Pemeriksaan status juga mempertimbangkan revisi pengajuan dan versi terbaru.
- Lingkungan lokal disebut pada footer dan halaman verifikasi. Ini bukti asal penerbitan sistem lokal; tanda tangan dan persetujuan mengikuti proses pengajuan. Salinan yang diedit dapat dibedakan dengan membandingkan SHA-256.
- QR memakai origin frontend yang sedang dibuka, termasuk port. Jika dibuka melalui `127.0.0.1:5176`, tautan hanya dapat diakses pada komputer tersebut. QR lokal bukan tautan produksi dan tidak otomatis dapat dibuka dari ponsel.
- Unggahan scan bertanda tangan, bukti rekening, Excel RAB, dan template surat kuasa tetap pada alur sebelumnya; tidak diberi klaim penerbitan baru.

## Implementasi dan penyimpanan

- `src/lib/server/deb/journey-verification.ts` menggunakan `mintCode`, `withVerificationFooter`, `qrPng`, `atomic`, dan penyimpanan privat yang sudah ada. Tidak ada collection atau dependency runtime baru.
- Collection `verifications` mencatat hash berkas setelah QR ditambahkan. `document_versions.generation.verifiedFiles` menyimpan referensi representasi unduhan sehingga kode dan bytes stabil untuk permintaan berulang. Snapshot draf/final berbeda. Sumber dokumen tidak ditimpa dan revisi bisnis pengajuan tidak bertambah karena melihat dokumen.
- Pembanding paket DOCX mengabaikan timestamp ZIP, tetapi membandingkan seluruh nama dan isi entri. Temuan QA: finalisasi PKS dapat menghasilkan timestamp ZIP berbeda antarpermintaan; perbandingan seluruh bytes semula menyebabkan 409. Pembanding isi paket memperbaikinya.
- `qr.ts` memakai koreksi kesalahan H, ruang putih empat modul, dan siluet maksimal 18% lebar modul QR. Ukuran footer yang sudah ada dipertahankan.
- `withVerificationFooter` memperbarui gambar sekaligus teks tautan jika dokumen sudah memiliki QR; tidak menumpuk paragraf QR.
- Cleanup `--delete-qa` ikut menghapus objek `verifiedFiles` milik kampus QA. Pengujian QR ini memakai dokumen lokal yang sudah ada, sehingga tidak membuat kampus/akun QA baru.

## QA browser yang dilakukan

Tool Playwright, frontend 5176 dan PocketBase lokal 8097:

1. Empat dokumen Fakfak (draf) dan empat dokumen Sorong (disetujui) berhasil diunduh HTTP 200.
2. Decoder jsQR 1.4.0 di browser berhasil membaca delapan gambar QR bersiluet PF; URL mengarah ke halaman verifikasi lokal yang benar. Decoder hanya dimuat di konteks browser QA, bukan dipasang ke aplikasi. Berkas tidak dikirim ke decoder eksternal.
3. SHA-256 delapan berkas cocok dengan catatan verifikasi; unduhan berulang menghasilkan bytes yang sama.
4. Halaman verifikasi dapat dibuka dari konteks browser tanpa login; kode tidak dikenal ditampilkan sebagai tidak dikenal.
5. Pratinjau admin menampilkan satu footer pada permohonan, invois, dan kuitansi; empat footer pada empat halaman PKS. Seluruh gambar termuat. Pemeriksaan DOM tidak menemukan perpotongan artikel dengan footer; screenshot invois dan PKS diperiksa.
6. Skenario status revisi/versi lama pada halaman QR diperiksa dari kode, belum diuji dengan mutasi pengajuan pada QA ini. Data, keputusan, dan status pengajuan kedua kampus tidak diubah oleh QA QR.

Cek yang dapat dijalankan ulang melalui tool Playwright: `scripts/qa/document-qr.playwright.js`. Skrip memerlukan data lokal Fakfak/Sorong tersebut. Screenshot lokal: `.playwright-mcp/qr-pf-{permohonan,invois,kuitansi,pks}.png`.

Belum dilakukan: pemindaian kamera ponsel/kertas cetak, rendering Microsoft Word/LibreOffice, build/check/test terminal. Pengguna kemudian mengizinkan commit dan push branch lokal ke GitLab dan GitHub; bukti SHA pengiriman dicatat pada jawaban akhir sesi.
