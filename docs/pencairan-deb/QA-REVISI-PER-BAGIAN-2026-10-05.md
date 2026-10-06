# Revisi per halaman pencairan

> Pembaruan 6 Oktober: request edit Administrasi kini per submenu Rekening, Penandatangan, atau Identitas Surat/Kop. Laporan di bawah historis untuk scope Administrasi gabungan. QA terbaru: [14 poin development](QA-DEVELOPMENT-14-POIN-2026-10-06.md).

Implementasi lokal pada `feat/scoped-program-revisions`, setelah PR alamat #31 dibuat ke `development`. PR #31 tidak berisi perubahan revisi ini. Koreksi pengguna: seluruh halaman yang diminta revisi dibuka, bukan memilih kolom melalui checkbox.

## Alur

- Admin membuka **Data Program**, menulis catatan, lalu menekan **Minta revisi Data Program**. Pemeriksaan dokumen yang sudah ada menentukan halaman secara otomatis: RAB membuka RAB; rekening, kuasa, permohonan, invoice, dan kuitansi membuka Administrasi; PKS membuka PKS. Tidak ada checkbox pemilihan isian.
- Kampus dapat mengedit seluruh Data Program jika bagian tersebut diminta revisi. Bagian lain tidak dapat dibuka, termasuk lewat URL langsung. Beberapa permintaan untuk halaman berbeda boleh aktif bersama.
- Tombol **Kirim perbaikan** tersedia langsung pada halaman revisi. Sistem membuat ulang surat yang terdampak, lalu mengirim perbaikan dan mengunci kembali isian. Kampus tidak perlu membuka Ringkasan.
- Backend memeriksa izin perubahan field, unggahan, dan RAB. Data Program dan PKS menyimpan permintaan terpisah meskipun sama-sama ditinjau melalui dokumen PKS.
- Perubahan data hanya membatalkan persetujuan surat yang menggunakan nilai tersebut pada template. Versi dan persetujuan dokumen lain, termasuk dokumen bertanda tangan, dipertahankan. Perubahan RAB membatalkan tiga persetujuan RAB dan memerlukan pembaruan surat yang memuat nominal/persentase.
- Identitas rekening yang berubah memerlukan unggah ulang bukti rekening. Jika perubahan nama program memengaruhi surat kuasa, unggah ulang surat kuasa tersedia di Data Program sebagai berkas pendukung; halaman Administrasi tetap terkunci.
- Catatan revisi lama tanpa informasi bagian tidak membuka semua isian. Admin perlu menetapkan ulang revisinya. Catatan lama yang belum ditangani tetap menghalangi pengiriman.
- Keputusan dengan revisi yang masih terbuka tidak boleh dibatalkan diam-diam; tunggu kampus mengirim perbaikan. Riwayat permintaan dan paket pengajuan dipertahankan.

## Verifikasi

Skrip `scripts/qa/scoped-revisions.playwright.js` dijalankan melalui tool Playwright, memakai aplikasi `http://127.0.0.1:5176` dan PocketBase lokal. Skrip `revision-roundtrip.playwright.js` sebelumnya adalah catatan alur lama dan bukan acuan perilaku ini.

Lulus tujuh pengiriman paket: pengajuan awal, Data Program, dua catatan Administrasi, RAB, Data Program bersama PKS, rekening kuasa, dan nama program yang memengaruhi surat kuasa. Diperiksa melalui API lokal dan UI admin/kampus:

- Seluruh halaman revisi dapat diedit; tidak ada checkbox isian pada pemeriksaan Data Program.
- Menu lain dinonaktifkan; URL langsung dan parameter signed tidak melewati penguncian.
- Server menolak field/unggahan/RAB di luar bagian revisi dan menolak perubahan setelah pengiriman.
- Alamat bertahan setelah autosave selesai dan reload. Pemeriksaan awal diperbaiki agar menunggu respons autosave sebelum reload.
- Surat yang tidak terdampak mempertahankan versi dan persetujuannya. Dokumen bertanda tangan tidak ikut dianggap kedaluwarsa.
- Data Program dan PKS dapat memiliki permintaan bersamaan; pembatalan revisi aktif ditolak.
- Bukti rekening lama tidak tetap disetujui setelah identitas berubah; surat kuasa terkait dapat diganti tanpa membuka Administrasi.
- Tampilan mobile 390px diperiksa melalui screenshot, tanpa overflow horizontal.
- Tab kerja yang tetap terbuka selama HMR mencatat warning Svelte `derived_inert`; warning ini belum ditangani. Pemeriksaan akhir memastikan kedua komponen yang diubah berhasil dikompilasi oleh server lokal (HTTP 200).

Semua context browser QA ditutup. Pembersihan terakhir menghapus 1 kampus QA, 1 akun QA, 168 record terkait, dan 30 berkas uji lokal; database remote tidak diakses. Test suite/check/lint/build terminal tidak dijalankan untuk perubahan revisi ini. Build yang berhasil sebelumnya hanya untuk PR alamat #31. Perubahan revisi belum di-commit atau dipush.

## Pengiriman PR poin 13

Branch pengiriman: `feat/revision-by-section`, dibuat dari `origin/development` terbaru. PR ini bergantung pada PR alamat #31 yang masih terbuka; commit alamat disertakan sebagai dasar, sehingga diff terhadap development masih memuat alamat sampai #31 merged. Implementasi revisi berada pada commit terpisah.

`npm run build` pada worktree branch pengiriman berhasil (exit 0), menghasilkan situs statis di `build`. Warning: konfigurasi `.svelte-kit/tsconfig.json` belum ada saat worktree baru mulai dibuild, serta chunk hasil minifikasi melebihi 500 kB. Percobaan sandbox sebelumnya gagal `spawn EPERM`; build ulang dengan izin proses lokal berhasil. `git diff --check` bersih. Test suite/check/lint tidak dijalankan. QA browser tujuh pengiriman yang dicatat di atas dilakukan pada workspace implementasi; tidak diulang pada worktree pengiriman yang berisi kode sama. File Excel, output, dan video lokal tidak disertakan.
