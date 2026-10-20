# Capaian Program kampus (20 Oktober 2026)

Keputusan 53. Branch `feat/dashboard-capaian-kampus`, dibuat dari `production` (f86ca8b).

## Perubahan

- Halaman baru `/campus/capaian` (`src/routes/(app)/campus/capaian/+page.svelte`), ditautkan dari menu akun kampus dan kartu Capaian Program di Beranda.
- `src/lib/capaian.ts`: status per bulan dari kiriman Monitoring terakhir, total dan perkiraan setahun (memakai `calculateMonitoring`), jendela 12 bulan, sumbu grafik, rencana RAB 70% dan realisasi LPJ per kelompok.
- `src/lib/server/deb/lpj.ts`: ringkasan LPJ ikut mengirim `term1Sen` setiap butir RAB, untuk rencana Tahap 1 per kelompok.
- `src/lib/campus-access.ts` dan `src/lib/page-data.ts`: halaman baru diizinkan untuk kampus dan dibaca sebagai halaman statis, sehingga tidak meminta data dashboard admin.
- Tes: `tests/capaian.test.ts`, serta `tests/campus-access.test.ts` dan `tests/campus-home.test.ts` untuk rute baru.

## QA browser

Dev server lokal 5176 dan PocketBase lokal 8097. Data uji Kampus QA Lokal 5 diisi lewat API Monitoring dan LPJ yang sama dengan form: Mei, Juni, Agustus Sesuai; Juli Perlu revisi; September Menunggu PF; Oktober draf; dua transaksi LPJ.

| Skenario | Hasil |
| --- | --- |
| Kartu angka: pendapatan Rp13,2 jt dari 4 bulan (1 menunggu PF), listrik 2.020 kWh, biogas 134 m³ setara 804 kWh, 64 penerima manfaat | Lulus |
| Juli (revisi) dan Oktober (draf) tidak dihitung; peringatan Juli perlu revisi tampil | Lulus |
| Tren 12 bulan: batang Sesuai, batang bergaris Menunggu PF, label Revisi dan Draf; tab Listrik EBT dan Biogas mengganti judul, sumbu, dan kalimat insight | Lulus |
| Kalender kiriman: Belum mulai, Sesuai, Perlu revisi, Menunggu PF, Belum dikirim | Lulus |
| Donat 2.824 kWh setara (72% listrik), garis kumulatif Rp13,2 jt | Lulus |
| Gauge 64% (Rp8.300.000 dari Rp13.000.000); Peralatan Rp6.500.000 dari Rp9.000.000, Operasional Rp1.800.000 dari Rp4.000.000 | Lulus |
| Kapasitas, nilai per penerima manfaat (dibulatkan ke rupiah), Local Hero dan dua foto bukti | Lulus |
| Kampus QA Lokal 2 (dibayar, tanpa Monitoring): ajakan isi Monitoring, Belum ada transaksi LPJ, rencana RAB tetap tampil | Lulus |
| Kampus QA Lokal 3 (hanya draf, belum dibayar): Data Monitoring masih draf tanpa angka nol, Dana Tahap 1 belum cair | Lulus |
| Menu akun dan kartu Beranda membuka Capaian Program | Lulus |
| Desktop 1366 px dan ponsel 390 px tanpa geser halaman; grafik tren digeser di dalam kotaknya | Lulus |
| Alur nyata lewat layar: kampus mengubah Oktober di Monitoring Bulanan lalu Kirim; Capaian menjadi Rp14,7 jt dari 5 bulan, 2 menunggu PF. Admin PF menyatakan September Sesuai dan meminta revisi Oktober; Capaian kampus menampilkan September Sesuai, Oktober Perlu revisi dan tidak dihitung | Lulus |
| Kotak Juli dan Oktober (Perlu revisi) bertanda Perbaiki dan membuka Monitoring Bulanan pada bulan itu; tautan Perbaiki Juli 2026 di peringatan juga | Lulus |
| Breadcrumb dari Capaian: Ruang kerja / Beranda / Capaian Program / Profil & Monitoring Program, tetap saat pindah tab, Capaian Program bisa diklik kembali; dibuka dari menu tetap Ruang kerja / Beranda / Profil & Monitoring Program | Lulus |
| Breadcrumb lewat menu akun (Profil, Pencairan) dan tombol kondisi kosong (Isi data energi, Isi pendapatan, Catat transaksi LPJ, Lihat pencairan) dari Capaian di Kampus QA Lokal 2, 3, 5; dari Beranda tetap tanpa Capaian Program | Lulus |
| Status bulan: Perlu revisi oranye dengan ikon dan catatan PF terakhir, Sesuai hijau; halaman dibuka dari atas; desktop dan ponsel 390 px tanpa geser halaman | Lulus |

Catatan: pembaruan langsung hanya untuk admin, sehingga halaman Capaian yang sedang terbuka di tab lain baru berubah saat dibuka atau dimuat ulang.

Tidak ada page error atau respons API 4xx atau 5xx di halaman ini. Tes terminal, check, dan lint tidak dijalankan sesuai AGENTS.md. Data production tidak diubah.
