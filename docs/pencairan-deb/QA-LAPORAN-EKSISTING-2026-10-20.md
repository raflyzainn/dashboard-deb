# Laporan Eksisting pra-coaching (20 Oktober 2026)

Keputusan 53. Branch `feat/dashboard-capaian-kampus`, dibuat dari `production` (f86ca8b). Halaman Capaian Program dari commit sebelumnya di branch ini dihapus dan diganti Laporan Eksisting.

## Perubahan

- Kampus: `src/routes/(app)/campus/laporan-eksisting/+page.svelte`, kartu di Beranda, menu akun, izin rute dan API kampus (`src/lib/campus-access.ts`, `src/lib/page-data.ts`).
- Admin: tab Laporan Eksisting di `/admin/verifikasi`, hanya melihat (`src/lib/components/shared/laporan-eksisting/LaporanAdmin.svelte`, `LaporanView.svelte`). Tidak ada pemeriksaan atau persetujuan PF.
- Server: `src/lib/server/deb/laporan-eksisting.ts`, API `/api/laporan-eksisting/[campus]` (GET, simpan, kirim), `/files` (unggah), `/files/[id]` (unduh), `/api/admin/laporan-eksisting` (daftar semua kampus dan statusnya).
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
| Terkirim: status Terkirim dengan waktu kirim; tombol kirim nonaktif sampai ada perubahan | Lulus |
| Mengubah laporan terkirim menjadikannya draf dengan pemberitahuan, lalu Kirim pembaruan | Lulus |
| Admin: hitungan Terkirim, Draf, Belum mengisi; foto dan video tampil; tanpa tombol persetujuan | Lulus |
| Notifikasi admin saat kampus mengirim | Lulus |
| Monitoring Bulanan tidak menampilkan berkas Laporan Eksisting; Pelaporan video tetap menerima MP4 seperti sebelumnya | Lulus |
| `/campus/capaian` tidak lagi tersedia | Lulus |
| Desktop 1366 px dan ponsel 390 px, kampus dan admin, tanpa geser halaman | Lulus |


## Simpan otomatis (branch `feat/laporan-eksisting-autosave`)

| Skenario | Hasil |
| --- | --- |
| Mengetik lalu berhenti: penanda Perubahan belum tersimpan, lalu Tersimpan otomatis pukul sekian tanpa menekan Simpan draf | Lulus |
| Mengetik lagi saat penyimpanan berjalan: ketikan tidak tertimpa dan ikut tersimpan | Lulus |
| Spasi di akhir isian tidak memicu penyimpanan berulang | Lulus |
| Muat ulang halaman: isian tetap ada | Lulus |
| Pindah halaman setelah tersimpan otomatis: tanpa dialog konfirmasi | Lulus |
| Kirim langsung setelah mengetik: disimpan dulu lalu terkirim | Lulus |
| Unggah foto pada laporan terkirim: tersimpan, pemberitahuan perubahan belum dikirim tampil | Lulus |
| Desktop 1366 px dan ponsel 390 px tanpa geser halaman | Lulus |


## Kampus mitra dan snackbar (branch `feat/laporan-eksisting-kampus-mitra`)

| Skenario | Hasil |
| --- | --- |
| Kampus mitra, tab Laporan Eksisting: kampus yang memperbarui laporan, kampus draf, dan kampus yang belum mengisi | Lulus |
| Tab Ringkasan dan tab lain tetap seperti sebelumnya; desktop 1366 px dan ponsel 390 px tanpa geser halaman | Lulus |
| Snackbar saat tersimpan otomatis, unggah foto, dan hapus foto; hilang sendiri setelah 4 detik | Lulus |

Tidak ada page error atau respons API 4xx atau 5xx yang tidak diharapkan. Tes terminal, check, dan lint tidak dijalankan sesuai AGENTS.md. Data production tidak diubah.
