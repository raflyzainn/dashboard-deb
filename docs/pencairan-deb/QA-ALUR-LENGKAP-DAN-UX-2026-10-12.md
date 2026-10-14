# QA alur lengkap dan konsistensi UX — 12 Oktober 2026

## Lingkup

Browser Playwright, frontend lokal 5176 dan PocketBase lokal 8097. Kampus baru terisolasi `81afc8374405d06` (Kampus QA Alur Lengkap), SK Rp20 juta. Menggunakan akun kampus QA sementara dan admin lokal. Tidak memakai fixture respons untuk alur utama berikut. Tidak ada transfer uang nyata atau perubahan production.

## Alur yang benar-benar dijalankan

| Tahap | Bukti hasil |
| --- | --- |
| Login kampus dan pengajuan baru | Berhasil, status draf |
| Melewati Data Program belum lengkap | Bisa lanjut ke RAB |
| Alamat bertingkat | Jakarta → Jakarta Selatan → Tebet → Tebet Timur; kode pos 12820 |
| RAB manual | Item 20 × Rp1 juta; diperiksa melalui tombol dan dilanjutkan ke pembagian |
| Pembagian | 15 unit melebihi 70%, Lanjut terkunci; 14 unit diterima, tahap 2 Rp6 juta |
| Rekening, penandatangan, surat/kop, PKS | Terisi melalui UI, draf tersimpan; tidak ada blocker setelah lengkap |
| Pembuatan dokumen | Empat dokumen dibuat; PDF PKS berhasil diunduh |
| Pengajuan pertama tanpa nomor PF | Submit HTTP 200, menunggu, riwayat 1 |
| Notifikasi admin | Pengajuan pertama muncul; Lihat detail membuka kampus yang tepat |
| Permintaan akses revisi rekening | Dikirim melalui UI; file tetap terlihat, input terkunci saat pending |
| Persetujuan revisi | Admin menyetujui melalui UI; bank dapat diedit, penandatangan tetap terkunci |
| Revisi file | Perubahan bank mempertahankan file lama dan memberi peringatan; Batal pada modal hapus mempertahankan file; unggah pengganti berhasil |
| Pengiriman perbaikan | Submit HTTP 200; notifikasi perbaikan muncul di admin |
| Nomor PF | Admin mengisi nomor PF; kampus memperbarui dokumen dan kirim ulang HTTP 200 |
| Review admin | PKS, permohonan, invois, kuitansi, rekening, dan ketiga RAB disetujui; pengajuan selesai, 10/10 butir sesuai |
| Dokumen bertanda tangan | Awalnya DOCX simulasi diterima, tetapi lampiran menolaknya; ketidakkonsistenan ini diperbaiki. Keempat PDF simulasi kemudian diunggah admin, HTTP 200 |
| Penerimaan asli | Empat penanda diterima tersimpan. Penggantian pindaian membatalkan penanda lama, kemudian dicatat ulang |
| Lampiran | Lampiran gabungan tersimpan HTTP 201 |
| Pembayaran | Tanggal 12 Oktober, Rp14 juta, referensi `QA-SIMULASI-BUKAN-TRANSFER-NYATA`; UI sudah dibayar dan API GET mengonfirmasi paidSen 1.400.000.000 |
| Setelah pembayaran | Notifikasi pembayaran muncul di kampus; rekening terkunci, hapus tersembunyi; unggah ulang dan buat ulang pada admin terkunci |
| Ponsel 390px | Halaman rekening tidak meluap horizontal; lebar halaman 380px; file masih terlihat, label submenu sekitar 146px |

## Ketidakkonsistenan yang diperbaiki selama QA

1. **DOCX diterima sebagai pindaian tetapi tidak dapat dipakai pada lampiran.** Form kampus bertanda tangan kini hanya menawarkan PDF/PNG/JPG/WebP, pesan menjelaskan kebutuhan lampiran, dan server menolak DOCX sebelum membuat versi. QA browser API pada data QA belum dibayar membuktikan HTTP 400 dengan alasan format.
2. **Dokumen disetujui tidak dikenali sebagai final oleh halaman tanda tangan admin.** Pemilihan versi kini menerima versi generated terbaru yang cocok dengan revisi dokumen pada pengajuan selesai. Unggah ulang terbuka dan keempat PDF berhasil disimpan.
3. **Pesan setelah unggah bertanda tangan masih menyebut menunggu pemeriksaan pengajuan.** Pesan kini menjelaskan pindaian tersimpan dan PF memeriksa pindaian/penerimaan asli.
4. **Label siap dilampirkan hanya berdasarkan penerimaan asli.** Label dihapus; jumlah dokumen asli tetap terlihat dan kesiapan lampiran mengikuti pemeriksaan sumber pada tab Lampiran.
5. **Unggah/buat ulang admin masih aktif setelah pembayaran, sementara server menguncinya.** Input pindaian dan tombol buat ulang dikunci setelah pembayaran; unduh arsip tetap tersedia. QA browser membuktikan seluruh input terkait dan empat tombol buat ulang disabled.

## Batas dan tindak lanjut

- Ini QA alur pencairan Tahap 1 dengan rekening kampus. Bukan pemeriksaan seluruh modul aplikasi atau semua kombinasi data.
- Pindaian berupa PDF simulasi dari dokumen aplikasi. Tidak membuktikan keabsahan tanda tangan basah, OCR pindaian fisik, atau layout semua dokumen/perangkat.
- Rekening pihak kuasa, beberapa scope revisi sekaligus, impor Excel dalam alur baru ini, Tahap 2/LPJ, dan email di luar aplikasi belum diuji ulang pada rangkaian ini. QA sebelumnya memiliki cakupan tersendiri.
- Beberapa timeout berasal dari label locator yang tidak cocok atau menunggu method HTTP yang salah. Hasil akhir diperiksa melalui UI dan data API; timeout tersebut tidak dinyatakan sebagai bug aplikasi.
- Test regresi `tests/signed-upload-format.test.ts` ditambahkan tetapi tidak dijalankan. Test suite terminal dan lint/check tidak dijalankan; QA tetap melalui browser sesuai instruksi repository.
- Setelah pengguna meminta push, `npm run build` berhasil exit 0 dengan adapter Cloudflare. Warning: deprecated `punycode` dan chunk client lebih besar dari 500 kB. Log lokal: `output/build-ux-20261012.log` (tidak masuk commit).
- Publikasi ditujukan ke development GitHub dan GitLab sesuai izin pengguna; tidak deploy atau mengubah production. Akun QA sementara dibersihkan; data pengajuan QA dan arsip tetap dipertahankan sebagai bukti lokal.
