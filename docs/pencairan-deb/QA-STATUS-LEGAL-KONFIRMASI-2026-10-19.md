# Status Legal, konfirmasi, dan dialog Bandingkan (19 Oktober 2026)

Perbaikan dari QA alur Pencairan Tahap 1 di lingkungan lokal. Branch `fix/pencairan-legal-konfirmasi`, dibuat dari `production`.

## Masalah yang diperbaiki

1. **Pemeriksaan Legal tidak terlihat.** Pada pengajuan dengan `datePolicy` chronology, setelah PF menyetujui semua butir, admin melihat 10 dari 10 selesai dan panel Tanda tangan bertuliskan "Menunggu pindaian dari kampus", sementara kampus tetap di "Pemeriksaan PF". Penghambat sebenarnya adalah PKS yang belum dikirim atau belum disetujui Legal.
2. **Dua aksi penting tanpa konfirmasi.** Ajukan untuk diperiksa langsung mengunci isian kampus; Catat pembayaran langsung mencatat transfer.
3. **Esc di dialog Bandingkan keluar ke grid Tahap 1.** Saat centang Sesuai disimpan, checkbox nonaktif sebentar sehingga fokus pindah ke halaman, lalu Esc ditangkap pintasan "kembali ke Tahap 1".
4. **Tombol Bandingkan setelah Sesuai tidak terlihat seperti tombol.** Gayanya sama dengan label status: tanpa garis, tanpa kursor tangan, tanpa efek hover.

## Perubahan

- `src/lib/payout-progress.ts`: fungsi `legalWait()` mengembalikan `kirim` (PF selesai, PKS belum dikirim ke Legal), `legal` (Legal sedang memeriksa), atau `null`. Fungsi ini hanya dipakai di layar admin.
- `Layar.svelte`:
  - Admin melihat banner di setiap butir kampus tersebut: "PKS belum dikirim ke Legal" dengan tautan Buka PKS, atau "Menunggu Legal".
  - Linimasa kampus tidak lagi memiliki tahap Pemeriksaan Legal. Pemeriksaan Legal atas PKS termasuk dalam Pemeriksaan PF, sehingga kampus melihat tujuh tahap dan teks pemeriksaan PF selama menunggu.
  - Pintasan Esc dan Enter diabaikan selama ada dialog terbuka.
- `TandaTanganView.svelte`:
  - Kolom pindaian menulis "Dibuka setelah Legal menyetujui PKS." selama Legal belum menyetujui.
  - Tombol Bandingkan memakai ikon, garis, kursor tangan, dan warna hover. Hijau dengan centang bila pindaian sudah sesuai.
  - Di dialog Bandingkan, centang diganti tombol "Sesuai dengan dokumen final". Setelah ditekan, dialog menampilkan label hijau, nama dan waktu, serta tombol Batalkan.
- `PembayaranView.svelte`: dialog "Catat pembayaran Tahap 1?" menampilkan jumlah, tanggal bayar, dan referensi. Batal dan Esc tidak mencatat apa pun.
- `CampusJourney.svelte`: dialog "Ajukan untuk diperiksa?" dengan pilihan Periksa lagi atau Ya, ajukan. Kirim perbaikan saat revisi tetap langsung, tanpa dialog.

Karena tahap Legal tidak ada lagi di linimasa kampus, kampus tidak menerima notifikasi perubahan tahap ke Pemeriksaan Legal. Notifikasi berikutnya muncul saat tahap berubah menjadi Tanda tangan.

## QA browser

Playwright dengan Chrome, aplikasi `127.0.0.1:5176` dan PocketBase lokal `127.0.0.1:8097`, desktop 1366 px. Kampus QA Lokal 2 (akun lokal `campus-903`), Admin PF lokal (`admin-1`), dan Legal lokal (`legal-1`) dijalankan dari pengajuan kosong sampai dana dibayar.

| Skenario | Hasil |
| --- | --- |
| Ajukan untuk diperiksa membuka dialog; Periksa lagi menutup dan tahap tetap Kirim pengajuan | Lulus |
| Esc pada dialog Ajukan menutup dialog dan tetap di halaman | Lulus |
| Ya, ajukan mengirim pengajuan; tahap menjadi Pemeriksaan PF | Lulus |
| Setelah 10 butir sesuai, admin melihat banner PKS belum dikirim ke Legal di butir Rekening dan Tanda tangan | Lulus |
| Kolom pindaian admin menulis Dibuka setelah Legal menyetujui PKS. | Lulus |
| Linimasa kampus berisi tujuh tahap tanpa Pemeriksaan Legal: pengajuan menunggu di Pemeriksaan PF (Yang bertindak Pertamina Foundation), pengajuan yang disetujui di Tanda tangan, pengajuan dibayar di Dana dibayar | Lulus |
| Pada butir PKS, banner tidak menampilkan tautan Buka PKS | Lulus |
| Setelah Kirim ke Legal, admin melihat Menunggu Legal | Lulus |
| Legal menyetujui; kampus masuk tahap Tanda tangan dan mengunggah empat pindaian | Lulus |
| Centang Sesuai lalu Esc pada dialog Bandingkan untuk empat dokumen: dialog tertutup, tetap di butir Tanda tangan | Lulus |
| Enter dalam dialog Bandingkan tidak berpindah halaman | Lulus |
| Tombol Sesuai dengan dokumen final menandai pindaian (1 dari 4), Esc menutup dialog tanpa pindah halaman, Batalkan mengembalikan ke 0 dari 4 | Lulus |
| Tombol Bandingkan: kursor pointer sebelum dan sesudah sesuai; garis dan latar berubah saat hover | Lulus |
| Catat pembayaran membuka dialog berisi jumlah, tanggal, dan referensi; Batal dan Esc tidak mencatat | Lulus |
| Enter pada form pembayaran membuka dialog, bukan langsung mencatat | Lulus |
| Ya, catat pembayaran mencatat Sudah dibayar | Lulus |

Tidak ada page error dan tidak ada respons API 4xx atau 5xx selama QA, di luar cek sesi sebelum login.

## Belum diuji

- Layar ponsel untuk banner dan dua dialog baru.
- Pengajuan tanpa `datePolicy` chronology (tanpa Legal). Fungsi `legalWait()` mengembalikan `null` untuk pengajuan tersebut, sehingga tampilannya tidak berubah. Ini dipastikan dari kode, belum dari browser.
- Tes terminal, check, dan lint tidak dijalankan, sesuai AGENTS.md.

Data uji hanya ada di PocketBase lokal; tidak ada data production yang diubah.
