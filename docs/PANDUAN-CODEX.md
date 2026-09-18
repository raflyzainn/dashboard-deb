# Panduan proyek untuk Codex

Diperbarui: 18 September 2026. Baca bersama [AGENTS.md](../AGENTS.md). Aturan kerja di AGENTS.md berlaku juga jika dokumen atau skill lain menyarankan tes terminal, push, atau PR otomatis.

## Tujuan proyek

Dashboard Digitalisasi DEB membantu Pertamina Foundation memantau program kampus mitra: profil dan deskripsi program, indikator per periode, review admin, proposal PDF berversi, komentar, pencairan, forum, notifikasi, serta peta persebaran.

Implementasi aktif saat panduan ini ditulis adalah **demo mandiri**. Data dan berkas disimpan dalam IndexedDB browser; pilihan akun dipakai untuk simulasi peran. Ini bukan login produksi, backend transaksi keuangan, atau integrasi pengiriman email nyata. Verifikasi kembali mode aktif jika checkout atau konfigurasi berubah.

## Teknologi dan alur data

- Svelte 5, SvelteKit, TypeScript, dan Tailwind CSS. Versi Node yang dinyatakan proyek: 22.x.
- `svelte.config.js` memakai `adapter-static`, dengan fallback `index.html`.
- `src/lib/data/service.ts` mengekspor layanan aktif melalui `createDemoService()`.
- `src/lib/data/demo/service.ts` menangani sesi demo, pembacaan data per halaman, pembatasan peran, dan mutasi.
- `src/lib/data/demo/store.ts` menangani penyimpanan IndexedDB, data awal, transaksi, serta migrasi data browser lama.
- `src/lib/state.svelte.ts` menghubungkan state UI, pemuatan data, dan mutasi. `src/lib/page-data.ts` memetakan halaman ke permintaan data.
- Komponen UI berada di `src/lib/components/`; halaman berada di `src/routes/`. Komponen bersama dikelompokkan menurut fitur di `components/shared/`.
- `src/lib/payments.ts` berisi aturan tahap pencairan; `src/lib/data/demo/payments.ts` berisi mutasi, data contoh, notifikasi, dan arsipnya.
- `src/lib/payment-pdf.ts` memakai `pdf-lib` untuk validasi PDF dan penggabungan lampiran.

Kode HTTP, modul `src/lib/server/`, skrip PocketBase, dan dokumentasi migrasi backend masih ada. Keberadaan berkas tersebut tidak berarti backend digunakan oleh demo aktif. Jangan menjalankan provisioning, migrasi, seed, atau mengubah layanan eksternal untuk pekerjaan UI demo.

## Peran dan perilaku yang harus dipertahankan

| Peran | Akses utama |
| --- | --- |
| Mentor | Data kampus sendiri; dapat memperbarui profil, indikator sesuai aturan review, proposal, dan komentar. Pencairan hanya melihat kartu alur. |
| SoBI | Akun berbeda pada kampus yang sama; berbagi data kampus dengan Mentor. Pencairan hanya melihat kartu alur. |
| Admin PF | Mengelola dan mereview data kampus; satu-satunya peran yang mengubah pencairan. |
| Keuangan | Membaca data pencairan, mengunggah/mengganti dokumen pada tahap kelengkapan, serta melihat berkas, arsip, dan notifikasi. |

Data awal memiliki 40 kampus dengan dua identitas internal per kampus. Pemilih login demo hanya menampilkan Mentor dan SoBI Universitas Pertamina. Keduanya memiliki cakupan kampus yang sama, tetapi identitas pelakunya berbeda.

Ketentuan fitur terbaru:

1. Deskripsi program ditampilkan sebagai poin-poin.
2. Peta persebaran **tetap ditampilkan**.
3. Proposal menggunakan riwayat versi, satu pratinjau PDF, tanggapan, dan komentar per versi. Tidak memakai perbandingan berdampingan.
4. Halaman pencairan Mentor dan SoBI hanya menampilkan kartu alur status tanpa nominal, formulir, pratinjau berkas, maupun tombol perubahan.
5. Admin PF membuat pengajuan, mengisi nominal/bukti KPI, mengunggah dan memeriksa dokumen, mencatat persetujuan, mengekspor paket, dan mencatat pencairan. Keuangan juga dapat mengunggah atau mengganti dokumen pada tahap kelengkapan, tetapi validasi dan perubahan tahap tetap milik Admin PF.
6. Tahap tetap berurutan: penilaian KPI → kelengkapan dokumen → approval PF → approval kampus → approval keuangan → siap dikirim → diproses keuangan → sudah dicairkan.
7. Persetujuan kampus/keuangan dicatat oleh admin. Simpan identitas admin sebagai pelaku sebenarnya; jangan mengaku pihak lain yang login atau melakukan tindakan.
8. Pemeriksaan KPI menggunakan target dan bukti terstruktur dengan ambang contoh. Belum memakai KPI resmi Holding atau membaca substansi PDF secara otomatis.
9. Dokumen pembayaran: kuitansi, invoice, berita acara, dan nota. Paket arsip menggabungkan ringkasan dengan proposal dan empat lampiran PDF.
10. Keempat PDF dokumen pembayaran ditampilkan langsung pada kartu dokumennya; tautan unduh tetap tersedia sebagai cadangan browser.
11. Panduan kampus memiliki kartu Pencairan yang mengarah langsung ke halaman pemantauan delapan tahap.
12. Admin PF dan Keuangan dapat saling mengirim feedback yang tersimpan sesuai tahap pencairan. Setelah persetujuan lengkap, Admin mengekspor satu PDF gabungan berisi data proses, proposal, KPI, empat dokumen, persetujuan, feedback, dan riwayat; paket langsung tersedia sebagai arsip yang dapat dilihat dan diunduh Keuangan.
13. Dashboard dan halaman Pencairan Keuangan menyediakan pencarian nama kampus dan filter delapan tahap pencairan untuk melihat posisi setiap pengajuan.
13. Dashboard Keuangan merangkum nominal, antrean prioritas, dan distribusi tahap. Detail serta berkas pengajuan tetap dibuka melalui halaman Pencairan.

Pembatasan perubahan harus ada di layanan data, bukan hanya menyembunyikan tombol. Namun otorisasi demo browser tetap bukan pengamanan server produksi.

## Menjalankan aplikasi untuk QA browser

Gunakan server lokal yang sudah berjalan jika sesuai. Jika perlu, jalankan `npm run dev` dan buka alamat yang ditampilkan Vite melalui tool browser Playwright. Menjalankan server ini diperbolehkan oleh AGENTS.md; jangan otomatis menjalankan build atau tes terminal sesudahnya.

Pilih akun contoh lewat `/login`. Gunakan akun kampus dan admin yang relevan dengan perubahan. Data bertahan pada browser dan origin yang sama; browser/origin berbeda dapat memiliki data berbeda. Jangan mereset IndexedDB atau data pengguna tanpa kebutuhan dan izin yang jelas.

QA browser menyesuaikan fitur yang diubah, misalnya:

- Lakukan tindakan lewat UI dan periksa hasil terlihat, pesan validasi, serta perubahan setelah reload.
- Untuk perubahan peran, periksa Mentor, SoBI, dan Admin PF. Sertakan keuangan bila alur pencairan berubah.
- Untuk pencairan, periksa kartu kampus tanpa nominal/kontrol edit dan tindakan admin pada tahap yang tepat.
- Untuk pemilihan kampus, pastikan versi proposal dan pengajuan mengikuti kampus yang sedang dipilih.
- Periksa desktop dan mobile bila tata letak berubah. Simpan screenshot lokal jika dibutuhkan untuk bukti.
- Jangan mengirim pesan nyata, melakukan transfer, atau mengubah data produksi sebagai bagian QA.

`tests/` dan konfigurasi Playwright berisi skenario regresi yang sudah tersedia. Boleh dibaca atau diperbarui sesuai perubahan, tetapi **jangan mengeksekusinya lewat terminal sampai pengguna meminta**. Hasil tes lama dalam laporan QA merupakan riwayat, bukan izin menjalankan tes baru atau bukti kode terbaru lulus.

## Dokumentasi dan penyelesaian pekerjaan

Setiap chat baru wajib membaca semua dokumentasi sebagaimana diatur AGENTS.md. Titik masuk penting:

- [README](../README.md): cara menjalankan dan mode aktif.
- [Checklist perubahan](CHECKLIST-PERUBAHAN-DEB.md): permintaan fitur, implementasi demo, serta batas yang belum tersedia.
- [Laporan QA pencairan](QA-CHECKLIST-PENCAIRAN-2026-09-18.md): hasil pengujian dan bukti lokal bertanggal.
- Dokumen lain dalam `docs/`: rincian fitur, rancangan, riwayat QA, dan backend. Baca konteks serta tanggalnya sebelum menganggapnya sebagai perilaku aktif.

Jika kode dan dokumen berbeda, periksa kode yang benar-benar dipakai dan instruksi pengguna terbaru, lalu perbarui dokumen terkait. Jangan menyatakan seluruh fitur selesai hanya berdasarkan checklist lama.

Selesaikan perubahan lokal, QA browser yang relevan, lalu laporkan singkat apa yang berubah, hasil QA, dan bagian yang belum diverifikasi. **Jangan commit, push, membuat PR/MR, merge, atau deploy otomatis.** Tunggu instruksi pengguna untuk tindakan tersebut.
