# Bukti RAB per kampus (pemeriksaan 20 September 2026)

Pertanyaan pengguna: apakah angka RAB 100%, 70%, dan 30% di sistem karangan? Jawaban singkat: angkanya berasal dari berkas kampus lewat ekstraksi 19 September 2026, tetapi layar menyajikannya salah untuk sebagian kampus. Dokumen ini mencatat apa yang benar benar ada di berkas tiap kampus, diperiksa langsung pada berkas di `D:\deb\Review Draft Dokumen Pencairan DEB 2025` (lembar dan kolomnya) dan pada `D:\deb\Ekstraksi RAB\RAB terstandar DEB 2025-2026.xlsx`. Tidak ada penggabungan lembar; sistem menandai apa adanya (keputusan 47).

## Cara memeriksa

- `D:\deb\Analisis\rab\evidence-sheets.py` membaca setiap buku kerja RAB kampus dan menjumlahkan kolom uang tiap lembar (JUMLAH, RAB, Pengajuan I, PENGAJUAN 1). Jumlah kasar itu hanya untuk mengenali lembar; angka yang dicatat di bawah diambil dari ekstraksi yang sudah menangani sub total, dan dicek silang dengan lembar review tim.
- Lembar "Laporan Penggunaan Dana" yang berisi RAB 81.445.000, Pengajuan I 47.433.000, Realisasi 45.460.000 adalah contoh dari templat kosong (`Format RAB dan Pencairan Dana`), bukan data kampus; ia muncul apa adanya di berkas IPB, ITS, PNK, UBT, UNTIRTA, dan UNS.
- `scripts/pencairan/rab-evidence.ts` dan `rab-versions-raw.ts` membaca keadaan sistem (versi RAB terkelola, total tersimpan, status butir). Total tersimpan sama dengan jumlah barisnya untuk semua versi.

## Tabel bukti

Batas = 70% dari Nilai SK, tepat. "ada" berarti lembar atau kolomnya ada di berkas kampus, apa pun angkanya.

| Kampus | RAB 100% | RAB 70% | RAB 30% | Keterangan dari berkas |
| --- | --- | --- | --- | --- |
| IPB | tidak | ada, 53.235.400 (batas 50.126.545) | tidak | `4. RAB 70_.xlsx`, lembar Rencana Anggaran Biaya adalah RAB 70%; lembar Laporan masih contoh templat |
| ITPB | ada, 59.637.500 (SK 52.951.250) | tidak | tidak | `RAB DEB TAHUN KEDUA (1).xlsx`, satu lembar |
| ITS | ada, 75.000.000 (= SK) | tidak | tidak | format standar; lembar Laporan masih contoh templat |
| IVET | tidak | ada, 52.500.000 (= batas) | tidak | `RANCANGAN ANGGARAN BIAYA DEB TERMIN I 2026.docx` |
| PNK | ada, 75.000.000 (SK 74.999.000) | tidak | tidak | `RAB DEB PNK.xlsx`; lembar Laporan masih contoh templat |
| STAI SIAK | tidak | ada, 50.111.600 (= batas) | tidak | `RAB TERMIN 1 TAHUN -3.pdf` |
| UBT | ada, 76.875.000 (SK 75.000.000) | tidak | tidak | `RAB dan Penggunaan Dana DEB SoBI Tahun 2 (2).xlsx`; lembar Laporan masih contoh templat. Lembar review menulis "hanya RAB Termin 1", berkasnya menunjukkan sebaliknya |
| UIR | tidak | ada, 43.600.000 (batas 36.302.000) | tidak | `FORMAT RAB ... TERMIN 1.xlsx`; lembar Laporan diisi angka yang sama |
| UNAIR | tidak | ada, 52.495.000 (batas 52.496.500) | tidak | `RANCANGAN ANGGARAN BIAYA (RAB).pdf` |
| UNDIP | ada, 75.000.000 (= SK) | ada, 52.527.000 (batas 52.500.000) | tidak | kolom Pengajuan I pada lembar Laporan terisi |
| UNIROW | ada, 71.500.000 (= SK) | tidak | tidak | `160726- Format RAB DEB UNIROW.xlsx`, satu lembar |
| UNMUL | ada, 71.237.320 (= SK) | ada, 49.866.124 (= batas) | ada, 21.371.196 | `RAB KEBERLANJUTAN NEW 2026, fiks.xlsx`: lembar DEB 2026, TERMIN I 70%, TERMIN II 30%; 70% + 30% = 100%. Lembar 30% belum dimuat ke RAB terkelola |
| UNRI | ada, 75.000.000 (= SK) | ada, 52.500.000 (= batas) | tidak | kolom PENGAJUAN 1 pada lembar RAB dan lembar Rencana realisasi 70% |
| UNS | ada, 89.157.500 (SK 71.680.250) | ada, 50.176.175 (= batas) | tidak | lembar Rencana Anggaran Biaya adalah RAB 70%; lembar C-1 adalah RAB 100% (lebih dari SK); lembar Copy of Rencana Anggaran Biaya masih contoh templat |
| UNSIKA | ada, 74.703.437 (= SK) | ada, 64.789.606 (batas 52.292.405) | tidak | kolom Pengajuan I pada lembar Laporan terisi, jumlahnya 86,7% dari SK |
| UNTIRTA | ada, 69.554.700 (= SK) | ada, 48.969.900 (batas 48.688.290) | tidak | `Rencana Anggaran Biaya Sobi Untirta.pdf` (100%) dan `RAB DEB UNTIRTA 2026 70%.xlsx` (70%) |
| UNY | ada, 75.000.000 (SK 74.800.000) | ada, 52.500.000 (batas 52.360.000) | tidak | kolom PENGAJUAN 1 (70%) pada lembar RAB |
| USB | ada, 60.000.000 (= SK) | tidak | tidak | `RAB_DEB_Sobat_Bumi_Pertamina_USB.xlsx`, satu lembar |
| USK | tidak | ada, 52.500.000 (= batas) | tidak | `04_RAB_Termin1_DEB_SobatBumiUSK_2026.xlsx`, lembar RAB TERMIN 1 |
| USU | tidak | tidak | tidak | hanya tautan `RAB DEB USU 2026.url` |
| UB, PNC, ITERA | tidak | tidak | tidak | folder tidak berisi berkas RAB |

Ringkasan: 12 kampus punya RAB 100%, 13 kampus punya RAB 70%, hanya UNMUL yang punya lembar 30% terpisah, 4 kampus tidak punya berkas RAB yang terbaca.

## Apa yang salah di sistem sebelum ini

- Versi RAB terkelola untuk IPB, IVET, STAI SIAK, UIR, UNAIR, UNS, USK dimuat dari lembar 70% saja, dengan jumlah yang sama pada kolom 100% dan 70%. Halaman RAB 100% menampilkan angka itu sebagai RAB 100%. Sekarang halaman itu menyatakan versi hanya memuat lembar 70%.
- UNMUL dan UNTIRTA punya dua versi (versi 1 dari lembar 100%, versi 2 dari lembar 70%); layar menampilkan versi terakhir untuk ketiga halaman, jadi RAB 100% tampak sama dengan 70%. Sekarang halaman 100% menunjuk ke versi 1.
- Lembar TERMIN II 30% UNMUL tidak pernah diekstrak (ekstraksi hanya mengenal jenis total dan termin_1), sehingga halaman RAB 30% UNMUL kosong.
- Keputusan RAB 100% dan RAB 30% yang dibuat tim pada 20 September 2026 sebagian dibuat saat layar menampilkan lembar yang tidak ada atau tidak menampilkan lembar yang ada. Status kini mengikuti bukti: tidak ada lembar = Belum ada; lembar ada tetapi belum dilihat = Periksa; keputusan atas lembar yang memang ada dipertahankan, kecuali UNMUL (100% dan 30%) dan UNTIRTA (100%) yang dikembalikan ke Periksa.

## Yang masih perlu tangan manusia

- UBT: butir RAB 70% sebelumnya Sesuai dengan total ketikan 52.500.000, padahal berkas tidak memuat lembar 70%; kini Belum ada. Konfirmasi ke kampus.
- UNSIKA: Pengajuan I 64.789.606 jauh di atas batas; periksa apakah kolom itu memang rencana Tahap 1.
- IPB: ekstraksi membaca 53.235.400 pada lembar 70%, lembar review menulis 50.110.400; keduanya perlu dicek pada berkasnya.
- UNMUL: lembar TERMIN II 30% ada di berkas tetapi belum dimuat ke RAB terkelola; memuatnya menunggu keputusan pengguna (tanpa penggabungan).
