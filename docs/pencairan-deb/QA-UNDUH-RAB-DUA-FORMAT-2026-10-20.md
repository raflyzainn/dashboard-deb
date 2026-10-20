# Unduh RAB dua format (20 Oktober 2026)

Keputusan 52. Branch `feat/unduh-rab-dua-format`, dibuat dari `production`.

## Masalah

RAB yang diunduh dari tombol Unduh RAB 100%, 70%, dan 30% memakai format resmi Pertamina Foundation (bertingkat, Perhitungan, blok tanda tangan), sedangkan Template Excel kampus (`static/templat/Template_RAB_DEB.xlsx`) berbentuk satu item per baris. Kampus mengisi dengan satu format dan mengunduh dalam format lain.

## Perubahan

- Tombol Unduh RAB 100%, 70%, dan 30% (kampus dan admin, butir RAB) membuka pop up dengan dua pilihan beserta bedanya:
  - **Format resmi Pertamina Foundation**: untuk ditandatangani dan diserahkan. Sama seperti sebelumnya.
  - **Format template aplikasi**: untuk diperiksa atau diubah di Excel.
- `src/lib/rab-template-excel.ts` membuat format template dari berkas `Template_RAB_DEB.xlsx` itu sendiri:
  - Nama kampus, nama program, dan item diisi langsung ke sel kosong lembar isian, sehingga gaya, Petunjuk, Contoh Pengisian, Ringkasan, grafik, dan rumus tetap.
  - Untuk 70% dan 30%, lembar isian dan semua rujukannya berganti nama menjadi RAB 70% atau RAB 30%. Qty mengikuti pembagian termin.
  - Berkas diubah langsung pada XML karena ExcelJS membuang grafik.
- Setiap pilihan menampilkan pratinjau mirip Excel dari data RAB kampus itu sendiri (`RabDownloadDialog.svelte`): format resmi dengan judul, tabel bertingkat, dan blok tanda tangan; format template dengan judul biru tua, sel biru, dan Total Keseluruhan. Di bawahnya ada tab lembar seperti di Excel. Pratinjau memuat enam baris pertama dan dapat digeser ke samping.
- Batal dan Esc menutup pop up tanpa mengunduh.

## QA

Dev server lokal 5176 dan PocketBase lokal 8097. Kampus QA Lokal 5 (2 item, Qty × Volume 1) dan kampus uji lain dengan Volume 3 dan 6.

| Skenario | Hasil |
| --- | --- |
| Pop up tampil dengan dua pilihan, bedanya, dan pratinjau berisi data kampus (desktop 1366 px, ponsel 390 px, tanpa geser halaman) | Lulus |
| Mengetuk pratinjau tidak mengunduh; pratinjau dapat digeser ke samping | Lulus |
| Batal dan Esc tidak mengunduh dan tetap di halaman | Lulus |
| Enam unduhan (3 lembar × 2 format) dari akun kampus dan akun admin | Lulus |
| Format template: dibanding template asli, yang berbeda hanya sel yang diisi (B4, F4, A8:H9) dan nama lembar untuk 70% dan 30% | Lulus |
| Dibuka di Excel: tanpa perbaikan, Total Harga, Total Keseluruhan, dan Ringkasan terhitung; dua grafik tetap ada | Lulus |
| Jumlah per lembar sama dengan RAB terkelola: 100% Rp20.000.000, 70% Rp13.000.000, 30% Rp7.000.000 | Lulus |
| Qty × Volume dipertahankan (contoh 5 unit × 3 kali, 1 unit × 6 kali) | Lulus |
| Berkas 100% format template terbaca ulang oleh impor RAB 100% aplikasi dengan item dan jumlah yang sama | Lulus |
| Format resmi tetap memuat kota, tanggal, Mentor, dan Koordinator | Lulus |

Tidak ada page error atau respons API 4xx atau 5xx. Tes terminal, check, dan lint tidak dijalankan sesuai AGENTS.md. Data production tidak diubah.

## Belum dibuat

Tombol Ekspor Excel di layar admin untuk kampus di luar alur pengajuan dan halaman RAB admin lama tetap mengunduh format resmi saja.
