# 01. Konteks dan sumber data

## Program dan fokus

Dashboard DEB adalah portal Pertamina Foundation untuk 40 kampus mitra program Desa Energi Berdikari (DEB) Sobat Bumi. Dari 40 kampus, **23 kampus sudah ditetapkan menerima pendanaan gelombang pertama** tahun keberlanjutan 2025/2026. Kebutuhan paling mendesak adalah **pencairan dana**, dimulai dari Termin 1. Tim program selama ini memeriksa dokumen pencairan secara manual memakai satu lembar Excel dan satu folder berkas kiriman kampus.

Urutan prioritas yang disepakati: Pencairan Termin 1 untuk 23 kampus (semua dikerjakan admin), lalu RAB terkelola, lalu LPJ dan Termin 2, lalu sisi kampus untuk ke 40 kampus.

## Berkas sumber (di luar repo, berisi data pribadi)

Semua ada di `D:\deb`. Jangan menyalin isinya ke repo atau artefak. Jangan mengubah berkas sumber.

| Berkas | Isi |
| --- | --- |
| `SK-150_Penetapan Penerima Bantuan Pendanaan Gelombang Pertama ... 2025-2026.pdf` | SK Kpts-150/06A0000/2026-S1A, 2 Juni 2026. Pindaian 17 halaman tanpa lapisan teks. Lampiran I: 23 kampus didanai, total Rp1.634.561.047 (15 Tahun Ketiga, 8 Tahun Kedua). Lampiran II: kampus yang masih merevisi, termasuk ITB (belum didanai) |
| `Review draft DEB PF.xlsx` | Lembar review tim. Sheet1 A1:M49, 24 kampus (23 + ITB), dua baris per kampus: baris catatan reviewer lalu baris centang. Kolom: Ceklis Lengkap, Draft PKS, RAB, Permohonan, Kuitansi, Invoice, Format laporan Termin 1, Buku Rekening, Surat Kuasa. Sheet2: legenda (Lengkap hijau, Hampir lengkap kuning) dan daftar lampiran |
| `Review Draft Dokumen Pencairan DEB 2025/` | 25 folder, 156 berkas, 136 MB. Sebagian besar draf Word dan Excel yang masih bisa disunting. Subfolder `Format RAB dan Pencairan Dana/` berisi templat resmi: `DRAFT PKS DEB.docx`, format surat permohonan, invois, kuitansi, dan buku kerja RAB |
| `Ekstraksi RAB/RAB terstandar DEB 2025-2026.xlsx` | Hasil ekstraksi RAB oleh Claude (lihat dokumen 06) |
| `Analisis/` | Skrip Python dan JSON hasil analisis Claude (lihat dokumen 08) |

Catatan teknis templat: bidang isian ditandai dengan sorotan kuning; tiap templat surat menggabungkan halaman Termin 1 dan Termin 2 dalam satu berkas; buku kerja RAB punya lembar "Rencana Anggaran Biaya" dan "Laporan Penggunaan Dana" (kolom RAB, Pengajuan I, Realisasi, % Realisasi).

## Dasar hukum dokumen (PKS Lampiran 2)

- Termin 1 sebesar 70% diberikan setelah perjanjian ditandatangani, dengan syarat: salinan Surat Kuasa, salinan PKS bertanda tangan, Surat Permohonan, Invois, Kuitansi (asli), serta RAB dan Rencana Realisasi 70%.
- Termin 2 sebesar 30% diberikan setelah kampus mempertanggungjawabkan Termin 1, dengan tambahan Laporan realisasi Termin 1.

## Nilai Kegiatan menurut SK (sudah diverifikasi, jumlahnya tepat sama dengan total SK)

Batas Termin 1 adalah tepat 70%, tanpa pembulatan.

| No | Perguruan tinggi | Kode | Tahun | Nilai Kegiatan | Batas Termin 1 (70%) |
| --- | --- | --- | --- | --- | --- |
| 1 | Universitas Brawijaya | UB | Ketiga | 69.000.000 | 48.300.000 |
| 2 | Universitas Syiah Kuala | USK | Ketiga | 75.000.000 | 52.500.000 |
| 3 | Universitas Sultan Ageng Tirtayasa | UNTIRTA | Ketiga | 69.554.700 | 48.688.290 |
| 4 | Universitas PGRI Ronggolawe | UNIROW | Ketiga | 71.500.000 | 50.050.000 |
| 5 | Politeknik Negeri Kupang | PNK | Ketiga | 74.999.000 | 52.499.300 |
| 6 | Institut Teknologi Sepuluh Nopember | ITS | Ketiga | 75.000.000 | 52.500.000 |
| 7 | Universitas Airlangga | UNAIR | Ketiga | 74.995.000 | 52.496.500 |
| 8 | Universitas Sebelas Maret | UNS | Ketiga | 71.680.250 | 50.176.175 |
| 9 | STAI Sulthan Syarif Hasyim Siak | SIAK | Ketiga | 71.588.000 | 50.111.600 |
| 10 | Universitas Diponegoro | UNDIP | Ketiga | 75.000.000 | 52.500.000 |
| 11 | Universitas Singaperbangsa Karawang | UNSIKA | Ketiga | 74.703.437 | 52.292.405,90 |
| 12 | Universitas Sunan Bonang | USB | Ketiga | 60.000.000 | 42.000.000 |
| 13 | Universitas Islam Riau | UIR | Ketiga | 51.860.000 | 36.302.000 |
| 14 | Universitas Riau | UNRI | Ketiga | 75.000.000 | 52.500.000 |
| 15 | Politeknik Negeri Cilacap | PNC | Ketiga | 74.345.740 | 52.042.018 |
| 16 | Universitas IVET | IVET | Kedua | 75.000.000 | 52.500.000 |
| 17 | Universitas Sumatera Utara | USU | Kedua | 74.805.000 | 52.363.500 |
| 18 | Universitas Negeri Yogyakarta | UNY | Kedua | 74.800.000 | 52.360.000 |
| 19 | Universitas Borneo Tarakan | UBT | Kedua | 75.000.000 | 52.500.000 |
| 20 | Universitas Mulawarman | UNMUL | Kedua | 71.237.320 | 49.866.124 |
| 21 | Institut Pertanian Bogor | IPB | Kedua | 71.609.350 | 50.126.545 |
| 22 | Institut Teknologi Sumatera | ITERA | Kedua | 74.932.000 | 52.452.400 |
| 23 | Institut Teknologi Petroleum Balongan | ITPB | Kedua | 52.951.250 | 37.065.875 |
| | **Jumlah** | | | **1.634.561.047** | **1.144.192.732,90** |

Temuan penting:

- Lembar review memakai angka SK yang keliru untuk dua kampus: PNK ditulis 74.999.999 (SK: 74.999.000) dan UNAIR ditulis 74.995.250 (SK: 74.995.000). Sistem harus menghitung dari SK, bukan dari catatan reviewer.
- UNSIKA satu satunya kampus yang 70% nya bukan rupiah bulat.
- Surat PNK menulis Rp52.500.000, di atas batas Rp52.499.300. IPB meminta Rp50.110.400, di bawah batas Rp50.126.545, dan itu diperbolehkan.
- Ejaan SK adalah ejaan baku. Lima nama di lembar review berbeda ejaan (Institut Teknologi Sumatra, Universitas Diponogoro, STAI ... SIAK, Institute Teknologi Sepuluh November, Universitas Sultan Syarif Ageng Tirtayasa). Folder PNC tertulis "Ciplacap". ITB ada di lembar review tetapi tidak didanai, jadi dilewati.

## Kondisi awal review (hasil pemetaan lembar Excel)

161 slot dokumen (23 kampus kali 7 dokumen): **36 Sesuai** (dicentang), **36 Perlu konfirmasi** (catatan "Sesuai" tetapi tidak dicentang), **56 Perlu revisi**, **33 Belum ada**. Belum ada kampus yang lengkap. UB, PNC, dan ITERA belum mengirim apa pun. IPB, UNMUL, dan UBT hanya tertahan Surat Kuasa.

Matriks status per kampus. Urutan huruf: PKS, RAB, Surat permohonan, Invois, Kuitansi, Buku rekening, Surat kuasa. `s` Sesuai, `k` Perlu konfirmasi, `r` Perlu revisi, `x` Belum ada.

| Kode | Status | Kode | Status | Kode | Status | Kode | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UB | xxxxxxx | UNAIR | krrrrkk | UIR | srssssk | UBT | ssssssx |
| USK | krkrrkk | UNS | krkkkrk | UNRI | krkkkkk | UNMUL | ssssssk |
| UNTIRTA | rrrrrrx | SIAK | krrrrkx | PNC | xxxxxxx | IPB | ssssssk |
| UNIROW | krrrrrx | UNDIP | rrrrrxx | IVET | ssssxsk | ITERA | xxxxxxx |
| PNK | rrrrrrx | UNSIKA | krrrkrk | USU | srrrrsk | ITPB | rrsxxrx |
| ITS | rrrrrkk | USB | rrkkkkx | UNY | srssssk | | |

Sumber mesin untuk matriks dan catatan reviewer: `D:\deb\Analisis\deb-matrix.json` dan `deb-review.json`. Pemetaan berkas ke jenis dokumen: `deb-inventory.json`.

Catatan reviewer yang paling sering muncul (jumlah sel, jumlah kampus): halaman Termin 2 ikut dikirim (22, 10), nominal atau terbilang salah (20, 11), tata letak dan kerapian (18, 10), RAB tidak lengkap (17, 17), tanpa kop atau logo (13, 5), blok tanda tangan atau nama kosong (13, 9), buku rekening tidak ada atau diganti surat lain (9, 8). Dokumen yang dibuat sistem menghapus dua kelompok pertama; RAB terkelola menghapus kelompok keempat.

## Aturan data pribadi

- Surat Kuasa memuat nomor KTP dan alamat rumah mahasiswa. Buku rekening memuat nomor rekening dan nama. Simpan sebagai berkas terlindungi. Jangan diekstrak, jangan ditampilkan di daftar.
- Nomor rekening disamarkan di semua tempat kecuali layar Rekening.
- Nama orang, nomor KTP, alamat rumah, dan nomor rekening tidak boleh masuk repo, dokumen, artefak, atau ringkasan percakapan.
- Jangan pernah mencetak nilai rahasia dari `.env`.
