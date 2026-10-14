# Digitalisasi DEB - PocketBase

## Profil & Monitoring Program - 14 Oktober 2026

Kartu Profil Program kini menjadi **Profil & Monitoring Program**, tetap di `/campus/profile`. Kampus mengisi pendapatan/energi bulanan, bukti program, cerita/foto Local Hero dan melihat rumus estimasi. Admin memeriksa per bulan lewat Review Kampus > Monitoring bulanan. Akses monitoring tidak menunggu pembayaran T1. Modul indikator legacy tetap terpisah.

Implementasi ini lokal di branch fitur; QA browser terblokir dan belum ada publikasi. Baca [catatan implementasi dan batas QA](docs/QA-MONITORING-2026-10-14.md) untuk rumus, migrasi lokal, checklist dan skenario yang belum diuji.


Aplikasi memakai API server dan PocketBase sebagai sumber data. Mode dummy, adapter IndexedDB, folder `mockups`, pemalsuan fetch/login dan build SPA statis dihapus. Komponen pengajuan aktif berada di `src/lib/components/campus/pencairan/`; aturan RAB di `src/lib/pengajuan/rab-model.ts`.

## Menjalankan dan QA lokal

Gunakan Node.js 22.x, dependency terpasang, `.env.local` dan instance PocketBase lokal bertanda yang sudah dikonfigurasi. Launcher tidak membaca kredensial production dan berhenti jika penanda/direktori/URL instance lokal tidak cocok. Jangan menyalin rahasia ke dokumentasi atau Git.

```powershell
npm run dev
```

`npm run dev:local` adalah alias dengan perintah yang sama:

- Aplikasi: http://127.0.0.1:5176/login
- PocketBase lokal: http://127.0.0.1:8097
- Health API: http://127.0.0.1:5176/api/health

Pemilih akun lokal hanya tersedia dalam development, memakai akun yang benar-benar ada di instance QA. Login rilis memakai sesi backend. Data akun QA dan SK simulasi yang sudah tersimpan di database lokal tidak dihapus otomatis; sumbernya tetap PocketBase, bukan fixture browser.

Launcher normal hanya memulai layanan lokal; tidak melakukan seed/migrasi otomatis. Perintah maintenance terpisah seperti `pb:journey-local` hanya digunakan secara sengaja pada instance QA sesuai [runbook](docs/pencairan-deb/RUNBOOK-PENGAJUAN-LOKAL.md).

## Alur dan penyimpanan

Pelaporan kampus tersedia setelah pembayaran Tahap 1 tercatat: LPJ penggunaan dana serta laporan pelaksanaan, infografis, video profil dan artikel. Admin memeriksa keluaran dan menyatakan LPJ selesai setelah seluruh bukti Sesuai. Rincian schema lokal dan batas tahap ini ada pada [runbook pelaporan](docs/pencairan-deb/RUNBOOK-PELAPORAN-LOKAL.md) dan [hasil QA](docs/QA-PELAPORAN-KAMPUS-2026-10-14.md). Port frontend dapat dipisahkan dengan `DEB_DEV_PORT` di `.env.local`; worktree pelaporan memakai 5177.

Akun kampus dapat membuka Beranda, Profil Program, Pencairan Dana, Notifikasi, dan Panduan Aplikasi. Profil Program memakai data kampus yang sama dengan Ringkasan admin: kontak, lokasi, informasi/deskripsi program, dan sembilan indikator kesiapan rencana aksi. Kampus hanya dapat mengubah profilnya sendiri; Tim Pendamping tidak ditampilkan pada form dan tidak dapat diubah kampus. URL modul yang belum dipakai atau halaman admin diarahkan ke Beranda kampus; API modul indikator, proposal, forum, dan pengelolaan admin tetap ditolak untuk kampus. Akses admin mengikuti perannya.

Data formulir, RAB, pemeriksaan, revisi, audit, notifikasi dan pembayaran dibaca/disimpan melalui API PocketBase. Berkas memakai storage server yang sudah ada: folder objek pada instance lokal untuk QA dan R2 untuk lingkungan server yang dikonfigurasi. Browser tidak menyimpan database aplikasi atau mengarang pengajuan saat backend gagal.

Alur baru dipilih berdasarkan `disbursements.submissionStatus`, bukan mode dummy/lokal. Pengajuan lama tanpa penanda tetap memakai layanan PocketBase lama agar data historis tidak dikonversi atau diberi alokasi otomatis. Nilai dan nomor SK mengikuti database, tanpa fallback nominal contoh.

## Build server

`npm run build` sekarang menghasilkan aplikasi server memakai adapter Cloudflare, dengan endpoint API. Output berada di `.svelte-kit/cloudflare`; bukan `build/index.html`. Konfigurasi Vercel SPA dummy dihapus karena tidak sesuai dengan backend ini.

Environment server perlu PocketBase, autentikasi server, storage, dan pengaturan publik sesuai panduan backend. Mengubah kode lokal tidak mengubah deployment aktif. Build/deploy production dan migrasi database production tetap memerlukan instruksi eksplisit.

## Panduan pengerjaan

Baca [AGENTS.md](AGENTS.md), [panduan Codex](docs/PANDUAN-CODEX.md), dan dokumentasi proyek sebelum mengubah kode. Jangan commit/push/PR/deploy tanpa permintaan. Tes, check, lint dan build terminal menunggu izin; QA memakai tool browser Playwright. Build wajib dilakukan sebelum publikasi yang diminta pengguna.

Laporan terbaru: [penghapusan dummy dan QA PocketBase](docs/pencairan-deb/POCKETBASE-TANPA-DUMMY-2026-10-07.md). Dokumentasi bertanggal sebelum perubahan ini merupakan riwayat; instruksi yang masih menyebut mode dummy tidak lagi menjadi panduan menjalankan aplikasi saat ini.
