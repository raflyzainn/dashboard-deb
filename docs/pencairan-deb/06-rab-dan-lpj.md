> **Pembaruan 19 September 2026 (keputusan 35 dan 36):** RAB terkelola adalah RAB Tahap 1; templat Excel untuk kampus dan admin kini lima kolom saja (No, Uraian, Satuan, Volume, Jumlah) dengan contoh baris di dalamnya; impor dan ekspor tersedia di butir RAB pada layar daftar periksa. Uraian templat lama di bawah hanya berlaku untuk berkas ekstraksi awal.

# 06. RAB terkelola dan LPJ

## Mengapa

RAB kampus hari ini berupa lembar kerja yang tidak bisa dijumlahkan lintas kampus dan sering salah hitung. Pengguna meminta RAB ditulis ulang menjadi data yang dikelola aplikasi, berkas asli tetap diunggah dan disimpan apa adanya, dan disediakan templat Excel impor dan ekspor terstandar agar aplikasi bisa membaca secara massal.

## Bentuk RAB (N2 A)

Buku kerja PF berbentuk pohon empat tingkat: **kelompok** (A), **kegiatan** (1), **sub kegiatan** (a.), lalu **uraian** barang dengan perhitungan (contoh "1 paket x 10 unit x 1 kali"), volume, satuan, harga satuan, dan jumlah. Aplikasi mempertahankan pohon itu.

- `rab_versi`: kampus, nomor versi, status (draf, menunggu persetujuan, disetujui), total, total alokasi Termin 1, penyetuju.
- `rab_baris`: versi, induk, tingkat, urutan, kode (dibuat dari posisi, contoh `A.1.a.3`), uraian, perhitungan, volume, satuan, harga satuan, jumlah, alokasi Termin 1. Uang dalam sen.
- Pemeriksaan: volume kali harga satuan sama dengan jumlah; jumlah anak sama dengan sub total; total sama dengan Nilai Kegiatan; alokasi Termin 1 tidak melebihi jumlah baris dan totalnya tidak melebihi batas 70%.
- Versi yang disetujui dibekukan (N4 A). Perubahan menjadi versi baru yang perlu persetujuan. Persetujuan RAB mengunci nominal Termin 1 (tahap 4).

## Templat Excel terstandar

Kolom lembar RAB, sama dengan buku kerja hasil ekstraksi sehingga bisa langsung dimuat:

`kampus`, `kode_kampus`, `didanai`, `jenis_rab` (`total` atau `termin_1`), `no_urut`, `kelompok`, `kegiatan`, `sub_kegiatan`, `uraian`, `volume`, `satuan`, `harga_satuan`, `jumlah`, `alokasi_termin_1`, `catatan_ekstraksi`, `sumber_file`, `sumber_sheet`, `sumber_baris`, `perhitungan`.

Catatan bentuk data hasil ekstraksi: `kegiatan` memuat tingkat pertama di bawah kelompok; tingkat yang lebih dalam digabung dengan " / " di `sub_kegiatan`. Layar impor menampilkan jumlah baris, baris yang bermasalah beserta alasannya, dan tidak menyimpan apa pun sebelum dikonfirmasi. Ekspor memakai bentuk yang sama, sehingga bisa diunduh, diisi luring, lalu diimpor lagi.

## Hasil ekstraksi RAB (19 September 2026)

Berkas: `D:\deb\Ekstraksi RAB\RAB terstandar DEB 2025-2026.xlsx` dengan lembar RAB, Ringkasan, Masalah, LPJ yang ditemukan, Petunjuk. Ringkasan mesin: `D:\deb\Analisis\rab\rab-summary.json`. Skrip: `run_extract.py` lalu `write_outputs.py` di folder yang sama. Berkas sumber tidak diubah. Setiap baris dari xlsx (1.288 baris) sudah dicocokkan dengan sel asalnya, tanpa selisih.

Angka utama: 1.488 baris barang (1.061 RAB total, 427 RAB Termin 1), 1.464 milik 19 dari 23 kampus didanai, 24 milik ITB. 15 kampus terbaca baik, 4 perlu dicek, 1 tidak terbaca, 3 belum ada berkas. 61 masalah tercatat satu per satu di lembar Masalah.

| Kampus | RAB yang ada | Baris | Jumlah baris | Pembanding | Hasil | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| UB | | | | | Belum ada berkas | Folder kosong |
| USK | Termin 1 saja | 25 | 52.500.000 | batas 52.500.000 | Baik | Tepat sama dengan batas |
| UNTIRTA | Total (PDF) | 109 | 69.554.700 | SK 69.554.700 | Perlu dicek | Nama kegiatan dipasangkan manual dari PDF. RAB Termin 1 terpisah 48.969.900, di atas batas 48.688.290 |
| UNIROW | Total | 77 | 71.500.000 | SK 71.500.000 | Baik | Tanpa rincian Termin 1 |
| PNK | Total | 103 | 75.000.000 | SK 74.999.000 | Baik | Rp1.000 di atas SK |
| ITS | Total | 56 | 75.000.000 | SK 75.000.000 | Baik | Dua berkas sama, dipakai versi revisi |
| UNAIR | Termin 1 saja (PDF) | 34 | 52.495.000 | batas 52.496.500 | Baik | Sedikit di bawah batas |
| UNS | Termin 1 saja | 43 | 50.176.175 | batas 50.176.175 | Baik | Tepat sama dengan batas |
| SIAK | Termin 1 saja (PDF) | 10 | 50.111.600 | batas 50.111.600 | Baik | Tepat sama dengan batas |
| UNDIP | Total | 71 | 75.000.000 | SK 75.000.000 | Baik | Termin 1 52.527.000, Rp27.000 di atas batas |
| UNSIKA | Total | 185 | 74.703.437 | SK 74.703.437 | Baik | Termin 1 59.292.406, sekitar Rp7.000.000 di atas batas. Empat baris alokasinya melebihi jumlah baris |
| USB | Total | 43 | 60.000.000 | SK 60.000.000 | Baik | Tanpa rincian Termin 1 |
| UIR | Termin 1 saja | 19 | 43.600.000 | batas 36.302.000 | Baik | Rp7.298.000 di atas batas. Volume diturunkan dari jumlah |
| UNRI | Total | 62 | 75.000.000 | SK 75.000.000 | Baik | Termin 1 sama dengan batas |
| PNC | | | | | Belum ada berkas | Folder kosong |
| IVET | Termin 1 saja (Word) | 23 | 52.500.000 | batas 52.500.000 | Baik | Tepat sama dengan batas |
| USU | | | | | Tidak terbaca | RAB hanya tautan ke berkas daring |
| UNY | Total | 81 | 75.000.000 | SK 74.800.000 | Baik | Rp200.000 di atas SK. Termin 1 Rp140.000 di atas batas |
| UBT | Total | 53 | 76.875.000 | SK 75.000.000 | Perlu dicek | Jumlah baris melebihi total tertulis 75.000.000. Termin 1 hanya satu angka |
| UNMUL | Total | 147 | 71.237.320 | SK 71.237.320 | Baik | Termin 1 49.866.124, tepat sama dengan batas. RAB Termin 1 terpisah 106 baris |
| IPB | Termin 1 saja | 107 | 53.235.399,50 | batas 50.126.545 | Perlu dicek | Jumlah baris melebihi total tertulis 50.110.400 |
| ITERA | | | | | Belum ada berkas | Folder kosong |
| ITPB | Total | 50 | 59.637.500 | SK 52.951.250 | Perlu dicek | Jumlah baris melebihi total tertulis 58.137.500, yang juga di atas SK |

Masalah menurut jenis: sub total tidak cocok dengan barang 11; baris tidak lengkap 10; volume kali harga tidak sama dengan jumlah 8 (sebagian besar UNMUL); lembar laporan masih contoh templat 6; Termin 1 di atas 70% ada 5 (UIR, UNSIKA, UNTIRTA, UNY, UNDIP); total di atas SK 4 (ITPB, UBT, UNY, PNK); alokasi Termin 1 lebih besar dari jumlah baris 4 (semua UNSIKA); jumlah barang berbeda dari total tertulis 3 (UBT, IPB, ITPB, rumus SUM kampus memang salah rentang); tidak ada berkas 3; judul dokumen tahun lama 2; lainnya masing masing 1.

Tujuh kampus hanya mengirim RAB Termin 1 tanpa RAB total: USK, UNAIR, UNS, SIAK, UIR, IVET, IPB.

Pemakaian: `scripts/pencairan/load-rab.ts --apply` (dijalankan 19 September 2026) memuat versi 1 untuk 19 kampus (status draf, sumber ekstraksi): 1.298 baris barang, 1.747 baris termasuk simpul kelompok, kegiatan, sub kegiatan. Tujuh kampus yang hanya punya RAB Termin 1 mendapat semua barisnya dialokasikan ke Termin 1; UNMUL dan UNTIRTA dimuat RAB totalnya (lembar Termin 1 mereka berbeda susunan, alokasi dibiarkan 0 untuk diisi admin); UNSIKA memuat alokasi mentah 64.738.606 dengan empat baris yang alokasinya melebihi jumlah baris (pemeriksaan merah).

## Modul RAB terkelola (dibangun 19 September 2026)

- Bersama: `src/lib/rab.ts` (kode baris `A`, `A.1`, `A.1.a`, `A.1.a.3`, penyusunan pohon, penggulungan jumlah, pemeriksaan). Server: `src/lib/server/deb/rab.ts` (versi, baris, simpan draf, buat versi kosong atau salinan, ajukan, setujui, cabut, impor dan ekspor xlsx, templat kosong dengan lembar Petunjuk). Rute `src/routes/api/pencairan/[campus]/rab/**` dan `/api/pencairan/rab-template`. UI `src/lib/components/admin/pencairan/Rab.svelte` di `/admin/pencairan/[id]/rab`.
- Aturan: versi disetujui dan diajukan tidak bisa disunting; "Buat versi baru" menyalin. Persetujuan mensyaratkan total sama dengan SK, alokasi Termin 1 di atas 0 dan tidak melebihi batas, dan tidak ada baris yang alokasinya melebihi jumlah baris; persetujuan menetapkan `disbursements.requestedSen` dan `rabVersion` serta tahap 4 (tanda pasal Bantuan Dana disetel ulang). Cabut persetujuan mengembalikan ke draf dan menghapus nominal Termin 1. Baris tanpa sub kegiatan mendapat simpul kosong "Tanpa sub kegiatan". `term1Sen` 0 berarti belum dialokasikan.
- Belum ada: pengurutan ulang baris di layar (urutan mengikuti ekspor dan impor), sinkronisasi isian slot dokumen RAB (totalSen, termin1Sen) dari RAB terkelola.

## LPJ

**Belum ada LPJ yang bisa diekstrak untuk 23 kampus**, karena dana Termin 1 belum dibayarkan. Enam buku kerja (IPB, ITS, PNK, UBT, UNS, UNTIRTA) masih memuat baris contoh templat PF di lembar "Laporan Penggunaan Dana". UIR mengisi lembar itu dengan rencana (kolom Realisasi sama dengan Pengajuan I di semua baris). Satu satunya realisasi nyata (41 baris, ditulis per baris anggaran, bukan per invois, dari laporan 2024/2025) ada di berkas ITB, dan ITB tidak ada di SK ini. Semuanya disimpan di lembar "LPJ yang ditemukan".

Rancangan LPJ (nanti, sesudah Termin 1):

- **Satu invois, satu entri, satu berkas pindaian.** Barang di invois tidak diketik ulang.
- Isian entri: tanggal, nomor bukti, penerima (toko atau penyedia), jumlah, memo, berkas pindaian, termin.
- Entri menunjuk ke satu simpul pohon RAB, biasanya sub kegiatan. Jumlah menggulung ke atas sehingga anggaran terhadap realisasi tetap terlihat per kegiatan. Pohon RAB yang dibangun sekarang sudah mendukung ini, jadi tidak ada yang perlu diputuskan sebelum Termin 1 selesai.
- Laporan realisasi Termin 1 kelak adalah cetakan daftar ini, dikelompokkan per bagian RAB, dengan berkas bukti dilampirkan dalam urutan yang sama.
- Kolom templat LPJ yang direncanakan: `kode_kampus`, `kode_rab`, `tanggal`, `nomor_bukti`, `penerima`, `jumlah`, `memo`, `nama_berkas_bukti`, `termin`.
