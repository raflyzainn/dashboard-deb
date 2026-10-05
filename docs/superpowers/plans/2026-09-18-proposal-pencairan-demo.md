# Rencana implementasi checklist DEB

**Tujuan:** menyelesaikan checklist pada aplikasi demo aktif dengan data contoh yang dapat diubah dan tersimpan di browser.

**Acuan:** `docs/CHECKLIST-PERUBAHAN-DEB.md`. Pengguna meminta seluruh pekerjaan tersisa beserta dummy; peta tetap ditampilkan.

**Arsitektur:** gunakan IndexedDB, layanan demo, dan komponen Svelte yang sudah ada. Identitas Mentor/SoBI berbagi kampus; Keuangan memiliki rute dan hak tersendiri. Modul pencairan menyimpan versi proposal, bukti KPI terstruktur, dokumen, persetujuan berurutan, riwayat, dan arsip PDF. Transaksi memvalidasi peran, kampus, tahap, dan revisi sebelum menulis. Tidak ada transaksi uang atau email eksternal.

**Aturan demo:** KPI adalah kriteria contoh, bukan kebijakan resmi Holding atau pembacaan otomatis PDF. Sistem mengevaluasi isian target/bukti dan admin memvalidasinya. Dokumen PDF maksimal 10 MiB per file. Persetujuan PF → kampus → keuangan. Penolakan membuka revisi dan membatalkan persetujuan sebelumnya; arsip final tidak berubah. Paket berisi ringkasan dan seluruh halaman lampiran, dibuat dengan pdf-lib yang dimuat saat diperlukan.

- [x] Uji aturan tahap, isolasi kampus/peran, revisi basi, penolakan, dan paket PDF.
- [x] Sambungkan dua akun kampus; tambahkan identitas Keuangan dan akses terbatas.
- [x] Buat model, migrasi non-destruktif, dan data dummy beberapa tahap pencairan.
- [x] Buat halaman pencairan untuk kampus, PF, dan keuangan; notifikasi Periksa berkas.
- [x] Tampilkan deskripsi sebagai poin dan komentar dua arah per versi proposal.
- [x] Jalankan pemeriksaan tipe, unit, build, dan browser desktop/mobile; perbarui checklist dengan bukti aktual. Hasil: 0 error/warning tipe, 53 tes unit, 19 skenario Playwright, build berhasil. Detail: `docs/QA-CHECKLIST-PENCAIRAN-2026-09-18.md`.

**Berkas utama:** `src/lib/payments.ts`, `src/lib/payment-pdf.ts`, `src/lib/data/demo/payments.ts`, `src/lib/data/demo/service.ts`, `src/lib/data/demo/store.ts`, komponen pembayaran bersama, serta rute tiap peran. Pekerjaan langsung di workspace, tanpa mengubah spreadsheet pengguna atau konfigurasi backend produksi.
