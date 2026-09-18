# Checklist perubahan DEB

Diperbarui: **18 September 2026** setelah implementasi lokal.

**Cakupan:** poin di bawah tersedia pada **aplikasi demo mandiri** yang aktif, dengan data dummy di IndexedDB browser. Tidak ada push, deploy, email nyata, atau transfer uang. Backend PocketBase produksi belum menjalankan modul pencairan ini. `[x]` berarti selesai dalam demo, bukan klaim sudah aktif di produksi. Lihat [laporan QA](QA-CHECKLIST-PENCAIRAN-2026-09-18.md).

## A. Tampilan, akun, dan proposal

- [x] **A1 — Deskripsi program berupa poin-poin.** Dashboard kampus dan detail kampus admin memakai daftar. Isian menerima satu poin per baris; paragraf lama dipisahkan pada batas kalimat. Bukti: [ProgramDescription.svelte](../src/lib/components/shared/ProgramDescription.svelte).
- [x] **A2 — Dua akun per universitas: Mentor dan SoBI.** Dua slot PIC sekarang menjadi identitas login berbeda: 80 akun untuk 40 kampus. Nama/email tetap dapat dikelola admin; perubahan lama dipertahankan. Bukti: [store.ts](../src/lib/data/demo/store.ts), [service.ts](../src/lib/data/demo/service.ts), [login](../src/routes/login/+page.svelte).
- [x] **A3 — Keduanya dapat memperbarui data; Admin PF melakukan review.** Mentor dan SoBI berbagi data kampus, tetapi identitas pencatat berbeda. Keduanya memperbarui profil, indikator, dan proposal. Sesuai perubahan permintaan, halaman pencairan Mentor/SoBI hanya menampilkan kartu alur tanpa nominal atau kontrol edit; seluruh perubahan pencairan dilakukan Admin PF. Review indikator/KPI/berkas dilakukan PF. Indikator tetap terkunci saat menunggu review. Bukti: [service.ts](../src/lib/data/demo/service.ts), [layanan pencairan](../src/lib/data/demo/payments.ts).
- [x] **A4 — Notifikasi dan tombol Periksa berkas.** Notifikasi mengarah ke kampus dan pengajuan tertentu, termasuk versi lama. Berkas dapat dibuka, diunduh, divalidasi, atau diminta revisi. Bukti: [Notifications.svelte](../src/lib/components/shared/notifications/Notifications.svelte), [PaymentDetail.svelte](../src/lib/components/shared/payments/PaymentDetail.svelte).
- [x] **A5 — Peta tetap ditampilkan.** Sesuai klarifikasi pengguna, peta tidak dihapus. Menu dan `/admin/sebaran` tetap tersedia. Bukti: [halaman peta](../src/routes/(app)/admin/sebaran/+page.svelte).
- [x] **A6 — Proposal memakai versi dan komentar, tanpa perbandingan berdampingan.** Riwayat versi dan satu pratinjau dipertahankan. Selain tanggapan admin, ada komentar dua arah Mentor/SoBI/PF per versi; komentar lama tidak ditimpa. Bukti: [Proposals.svelte](../src/lib/components/shared/proposals/Proposals.svelte), [ProposalReview.svelte](../src/lib/components/shared/proposals/ProposalReview.svelte).
- [x] **A7 — Proposal langsung tampil.** PDF versi terbaru atau versi pada tautan dimuat ketika membuka halaman. Bukti: [ProposalDocument.svelte](../src/lib/components/shared/proposals/ProposalDocument.svelte).

## B. Alur proposal sampai pencairan

- [x] **B1 — Unggah PDF dan tracking pembayaran.** Pengajuan per versi proposal, nominal, delapan tahap, riwayat tindakan, dan referensi pencairan tersedia. PDF kosong/rusak/terenkripsi ditolak sebelum digunakan untuk pengajuan. Bukti: [Payments.svelte](../src/lib/components/shared/payments/Payments.svelte), [payment-pdf.ts](../src/lib/payment-pdf.ts).
- [x] **B2 — Penilaian KPI dalam demo.** Sistem mengevaluasi target dan bukti terstruktur beserta nomor halaman terhadap KPI contoh: energi terbarukan minimal 1 kWp, penerima manfaat minimal 20 orang, dan peningkatan pendapatan minimal 10%. PF memeriksa bukti terhadap PDF sebelum melanjutkan. **Bukan daftar KPI resmi Holding dan bukan analisis otomatis isi PDF.** Bukti: [payments.ts](../src/lib/payments.ts).
- [x] **B3 — Pemeriksaan kuitansi, invoice, BA, dan nota setelah KPI sesuai.** Status setiap PDF: menunggu pemeriksaan, valid, atau perlu revisi. Keempat dokumen wajib valid sebelum approval. Mengganti file membatalkan validasi file tersebut. Bukti: [layanan pencairan](../src/lib/data/demo/payments.ts).
- [x] **B4 — Approval PF, kampus, dan keuangan.** Urutan demo: PF → kampus → keuangan. Admin PF mencatat persetujuan ketiga pihak secara berurutan; identitas pencatat tetap admin, bukan akun kampus/keuangan. Akun keuangan hanya membaca data pencairan. Identitas, waktu, dan catatan dicatat. Pengembalian untuk revisi membatalkan approval sebelumnya dan mengulang pemeriksaan. Bukti: [aturan tahap](../src/lib/payments.ts).
- [x] **B5 — Satu PDF gabungan untuk keuangan dan arsip.** Setelah tiga approval, Admin PF menekan **Ekspor PDF & kirim ke keuangan**. Paket berisi nominal, penilaian KPI, daftar dokumen, approval, riwayat, dan seluruh halaman proposal beserta empat lampiran. PDF diunduh dan disimpan sebagai arsip. Admin PF kemudian mencatat referensi pencairan simulasi. Bukti: [payment-pdf.ts](../src/lib/payment-pdf.ts), [layanan pencairan](../src/lib/data/demo/payments.ts).

## Data dummy dan cara mencoba

1. Jalankan `npm run dev`, buka `/login`, pilih **Kampus mitra**, lalu Mentor atau SoBI pada kampus yang sama.
2. Buka **Pencairan**. Data awal: `campus-001` di KPI, `campus-002` di dokumen (nota belum ada), `campus-003` di approval PF, `campus-004` di approval kampus, `campus-005` di approval keuangan, `campus-006` siap dikirim. Pola diulang untuk 40 kampus.
3. Mentor dan SoBI memantau kartu alur tanpa nominal, formulir, atau tombol tindakan. Pilih **Administrator** untuk membuat pengajuan, mengisi bukti KPI, memeriksa, dan menyatakan KPI sesuai.
4. Admin mengunggah empat PDF, memvalidasi masing-masing, lalu menyelesaikan pemeriksaan.
5. Admin menekan **Catat persetujuan** pada tahap PF, kampus, dan keuangan secara berurutan.
6. Ekspor/kirim paket setelah siap. Status menjadi **Diproses keuangan**; PDF dapat dibuka lagi melalui **Arsip keuangan**.
7. Admin mengisi referensi simulasi dan menandai **Sudah dicairkan**. Kampus memantau hasilnya setelah memuat ulang halaman.

Data contoh mencakup PDF, KPI, nominal, riwayat, komentar, dan notifikasi. Kasus diproses/sudah dicairkan dibuat melalui langkah 6–7, sehingga arsip merupakan hasil ekspor sesungguhnya. Migrasi tidak menghapus unggahan atau perubahan lama; approval dummy hanya memakai proposal fixture buatan aplikasi.

## Batas implementasi

- KPI resmi membutuhkan kriteria/ambang dari PF/Holding. Demo tidak menebak kebijakan tersebut.
- Penyimpanan dan pergantian akun berlaku dalam satu browser. Ini bukan autentikasi/otorisasi server produksi dan tidak menyinkronkan perangkat berbeda.
- Pengiriman berarti paket masuk ke ruang kerja/arsip Keuangan di demo; tidak mengirim pesan ke pihak luar.
- PDF arsip tetap seperti saat dikirim; referensi pencairan setelahnya ada pada riwayat aplikasi. Unduh arsip sebelum membersihkan penyimpanan browser.
- Uji lokal bukan bukti deployment, integrasi perbankan/email produksi, atau migrasi backend PocketBase.
