# Pencairan DEB: sumber kebenaran rancangan

Status per 19 September 2026 (malam): **aplikasi dibangun di atas backend nyata dan dibentuk ulang mengikuti artefak versi 11: satu layar per kampus** (daftar butir di kiri dimulai dari SK, delapan butir sejak keputusan 39, dokumen di tengah, satu bilah aksi dengan keputusan satu klik; baris penutup tanda tangan, lampiran, pembayaran; dashboard hanya grid; halaman verifikasi publik dengan QR di setiap halaman dokumen terbitan sistem). PocketBase dan R2 sudah terisi. Di-commit dan di-push ke `production` pada 20 September 2026 (`npm run build` lolos); deploy ke Cloudflare Pages dilakukan pengguna.

Folder ini adalah catatan lengkap hasil eksplorasi dan kesepakatan antara pengguna (Mukti) dan Claude untuk modul **Pencairan Termin 1** program Desa Energi Berdikari (DEB) Sobat Bumi 2025/2026. Dokumen di sini menggantikan semua dokumen lama tentang pencairan di `docs/` (misalnya `QA-CHECKLIST-PENCAIRAN-2026-09-18.md` dan bagian pencairan di `PANDUAN-CODEX.md`), yang hanya menggambarkan demo lama.

## Cara mengejar ketinggalan (baca berurutan)

| No | Berkas | Isi |
| --- | --- | --- |
| 1 | [01-konteks-dan-sumber-data.md](01-konteks-dan-sumber-data.md) | Program, SK, 23 kampus dan Nilai Kegiatan, berkas sumber di `D:\deb`, kondisi awal review, aturan data pribadi |
| 2 | [02-proses-bisnis-termin-1.md](02-proses-bisnis-termin-1.md) | Alur tujuh tahap, aturan uang, tujuh dokumen beserta isiannya, cek rekening, PKS, lampiran |
| 3 | [03-keputusan.md](03-keputusan.md) | Semua keputusan K1 sampai K8, N1 sampai N7, P1 sampai P3, koreksi pengguna, kutipan asli |
| 4 | [04-rancangan-sistem.md](04-rancangan-sistem.md) | Arsitektur, masuk dengan Microsoft, peran, koleksi PocketBase, R2, jejak audit, pratinjau, mail merge, gabung PDF |
| 5 | [05-layar-dan-ux.md](05-layar-dan-ux.md) | Spesifikasi tiap layar dan pola UX bersama |
| 6 | [06-rab-dan-lpj.md](06-rab-dan-lpj.md) | RAB terkelola, templat Excel, hasil ekstraksi RAB 23 kampus, LPJ (nanti) |
| 7 | [07-rencana-bangun.md](07-rencana-bangun.md) | Urutan bangun, kriteria selesai, cakupan aba aba "go", fakta yang masih ditunggu, pekerjaan sisa |
| 8 | [08-catatan-sesi.md](08-catatan-sesi.md) | Riwayat seluruh sesi kerja, kondisi working tree, alat bantu, kendala lingkungan |
| 9 | [blueprint.html](blueprint.html) | Salinan sumber artefak versi 11 (satu layar per kampus: setiap butir dan baris penutup digambar dengan bilah aksinya; yang dibangun) |

Artefak daring (privat, milik pengguna): https://claude.ai/artifact/4dp8q3i6dbPM7wWz1ikHpA (tautan lama V8ARRRNth1ed8szPFQKVrw sudah tidak berlaku). Untuk memperbaruinya dari sesi lain: baca dulu dengan alat Artifact (`action: read`, `url`), ubah, lalu terbitkan dengan `url` yang sama.

## Aturan anti melenceng

Aturan ini dibuat karena pengguna tidak suka hasil yang dibangun dari pikiran sendiri. Patuhi sebelum menulis kode apa pun.

1. **Selaraskan dulu, baru bangun.** Untuk fitur besar, proses bisnis, atau perombakan: teliti bahan nyata, tampilkan rancangan di artefak (temuan, sketsa layar, pilihan dengan rekomendasi), tunggu jawaban. Perubahan kecil yang sudah jelas boleh langsung dikerjakan.
2. **Dokumen ini adalah acuan.** Jika kode yang akan ditulis berbeda dari isi folder ini, berhenti dan tanyakan. Jika keputusan berubah, perbarui `03-keputusan.md` dan dokumen terkait pada saat yang sama.
3. **Jangan mengarang angka atau contoh.** Setiap angka di artefak dan dokumen harus bisa ditelusuri ke berkas sumber. Pernah terjadi: contoh baris RAB Mulawarman yang tidak bisa ditelusuri, lalu diganti baris nyata IPB.
4. **Fokus sekarang hanya Pencairan Termin 1 untuk 23 kampus, semua masukan dan keluaran oleh admin.** LPJ, Termin 2, dan sisi kampus tetap direncanakan tetapi dikerjakan belakangan.
5. **Jangan migrasi, jangan menyentuh PocketBase atau R2, jangan commit, jangan push** tanpa perintah eksplisit pengguna pada pesan itu.
6. **Data pribadi tidak boleh keluar dari `D:\deb`.** Nomor KTP, alamat rumah, nomor rekening, dan nama orang tidak boleh masuk repo, artefak, dokumen, atau daftar di UI.
7. **Teks UI berbahasa Indonesia, hanya aturan dan langkah berikutnya.** Tanpa nama vendor, tanpa alasan teknis, tanpa tanda pisah panjang, tanpa tanda hubung sebagai pemisah kalimat.
8. **Situs lama hanyalah PoC.** Halaman Pencairan demo dan login Keuangan diganti. Jangan ragu merombak, tetapi pertahankan pola yang sudah disepakati (tipografi, logo putih, formulir baca dulu, komponen bersama).
9. Patuhi `AGENTS.md`: tidak menjalankan tes, `npm run check`, lint, atau build verifikasi dari terminal kecuali diminta. QA lewat browser.

## Glosarium singkat

| Istilah | Arti |
| --- | --- |
| DEB | Desa Energi Berdikari, program Pertamina Foundation bersama kampus mitra |
| SK | Surat Keputusan Kpts-150/06A0000/2026-S1A tanggal 2 Juni 2026, dasar Nilai Kegiatan 23 kampus gelombang pertama |
| Nilai Kegiatan | Nilai bantuan per kampus menurut SK. Dasar semua perhitungan |
| Termin 1 | Pencairan pertama, paling banyak tepat 70% Nilai Kegiatan |
| Termin 2 | Sisa: Nilai Kegiatan dikurangi Termin 1 yang dibayar, diberikan setelah laporan realisasi Termin 1 |
| PKS | Perjanjian Kerja Sama (Surat Perjanjian) antara Pertamina Foundation dan kampus |
| RAB | Rencana Anggaran Biaya |
| LPJ | Laporan pertanggungjawaban penggunaan dana. Satu invois satu entri satu pindaian. Dikerjakan setelah Termin 1 |
| Lampiran | Satu PDF per kampus berisi semua dokumen Termin 1 yang sudah Sesuai |
| Slot dokumen | Satu jenis dokumen untuk satu kampus pada satu termin, memiliki banyak versi berkas |
| Profil DEB | Data kampus dan program: alamat, lokasi, kontak, penandatangan. Diisi admin, kampus hanya melihat |
