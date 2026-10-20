# Laporan Eksisting pra-coaching (20 Oktober 2026)

Keputusan 53. Branch `feat/dashboard-capaian-kampus`, dibuat dari `production` (f86ca8b). Halaman Capaian Program dari commit sebelumnya di branch ini dihapus dan diganti Laporan Eksisting.

## Perubahan

- Kampus: `src/routes/(app)/campus/laporan-eksisting/+page.svelte`, kartu di Beranda, menu akun, izin rute dan API kampus (`src/lib/campus-access.ts`, `src/lib/page-data.ts`).
- Admin: tab Laporan Eksisting di `/admin/verifikasi` (`src/lib/components/shared/laporan-eksisting/LaporanReview.svelte`, `LaporanView.svelte`).
- Server: `src/lib/server/deb/laporan-eksisting.ts`, API `/api/laporan-eksisting/[campus]` (GET, simpan, kirim), `/files` (unggah), `/files/[id]` (unduh), `/api/admin/laporan-eksisting` (daftar, periksa).
- `src/lib/server/deb/report-file.ts`: validasi MP4 juga mengembalikan ukuran tampilan video (rotasi diperhitungkan). Pelaporan tidak berubah perilakunya.
- `src/lib/laporan-eksisting.ts`: pilar, kategori foto, batas, status, kelengkapan.
- Monitoring Bulanan: status bulan berwarna tegas dan catatan revisi PF.
- Tanpa perubahan schema PocketBase.

## QA browser

Dev server lokal 5176 dan PocketBase lokal 8097. Video uji dari `tests/fixtures/pelaporan/video-qa.mp4` (160 × 90) dan salinannya dengan matriks rotasi 90 derajat (tampil 90 × 160, seperti video tegak dari ponsel).

| Skenario | Hasil |
| --- | --- |
| Kartu Beranda dan menu akun membuka Laporan Eksisting; breadcrumb Beranda / Laporan Eksisting | Lulus |
| Isi deskripsi, simpan draf, unggah 2 foto sekaligus, hapus foto, penghitung karakter, tanda Belum diisi | Lulus |
| Video tegak ditolak di browser; dikirim langsung ke API juga ditolak server (400) | Lulus |
| Video landscape tersimpan, peringatan resolusi di bawah 1080p tampil, ganti dan hapus video | Lulus |
| Kirim ke PF terkunci sampai 4 deskripsi, 3 kategori foto, dan video lengkap; daftar kekurangan tampil | Lulus |
| Konfirmasi saat meninggalkan halaman dengan isian belum disimpan | Lulus |
| Terkirim: status Menunggu pemeriksaan, isian terkunci | Lulus |
| Admin: hitungan status, foto dan video tampil, Minta revisi wajib catatan, Nyatakan Sesuai | Lulus |
| Kampus melihat Perlu revisi dengan catatan PF, kirim ulang, lalu Sesuai | Lulus |
| Notifikasi admin (menunggu pemeriksaan) dan kampus (perlu revisi, sesuai) | Lulus |
| Monitoring Bulanan tidak menampilkan berkas Laporan Eksisting; Pelaporan video tetap menerima MP4 seperti sebelumnya | Lulus |
| `/campus/capaian` tidak lagi tersedia | Lulus |
| Desktop 1366 px dan ponsel 390 px, kampus dan admin, tanpa geser halaman | Lulus |

Tidak ada page error atau respons API 4xx atau 5xx yang tidak diharapkan. Tes terminal, check, dan lint tidak dijalankan sesuai AGENTS.md. Data production tidak diubah.
