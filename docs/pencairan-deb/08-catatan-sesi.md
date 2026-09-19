# 08. Catatan sesi kerja

Ringkasan seluruh percakapan antara pengguna dan Claude untuk repo ini, 8 sampai 19 September 2026. Tujuannya agar sesi berikutnya bisa melanjutkan dengan pengetahuan yang sama.

## Kronologi

1. **8 September, mockup pertama (sudah dibuang).** Dari transkrip rapat, Claude membuat mockup SvelteKit dan Tailwind bergaya PF Series. Pengguna menghentikan pemasangan PocketBase: hanya mockup frontend. Dipublikasikan ke Cloudflare Pages proyek `monev-deb` (`https://monev-deb.pages.dev`), kini yatim.
2. **18 September, ganti dengan repo resmi.** Isi lokal diganti dengan `https://gitlab.com/pf-digitalisasi/dashboard-deb.git` cabang `production`. Arsip mockup lama: `D:\repos\monev-deb-mockup-backup-2026-09-18.tar.gz`. `CLAUDE.md` lama di akar repo ikut hilang.
3. **Pemahaman kode.** `production` adalah demo statis berbasis IndexedDB (`deb-standalone-demo-v6`, `src/lib/data/demo/`, `createDemoService()`, singleton `app` di `src/lib/state.svelte.ts`). Kode BFF PocketBase di pohon kerja mati; backend sungguhan hanya di `origin/main` yang sudah menyimpang. Arahan: hanya bermain di `production`, pindah ke PocketBase, SSO seperti PF Series sebagai paradigma.
4. **Tipografi dan logo.** Huruf Plus Jakarta Sans diganti tumpukan huruf sistem; codemod ukuran, tinggi baris, bobot, jarak huruf, dan warna teks pada 45 berkas; logo PF putih di sidebar dan halaman masuk. Diverifikasi visual pada sekitar 20 halaman di lebar 1366 dan 390.
5. **Formulir baca dulu dan direktori kartu.** Primitif baru: `Button`, `EditableSection`, `ReadField`, `RegionSelect`, `LocationPicker`, ikon baru, `src/lib/contacts.ts` (teruji pada 97 kelompok kontak nyata, 120 orang), `src/lib/location.ts`, data wilayah `static/data/regions/**` (1.067 berkas dari PF Series), `leaflet`. Halaman yang dirombak: kontak dan profil program, indikator kampus (baca dulu, simpan eksplisit, peringatan keluar), direktori proposal dan pencairan, master kampus dengan pin peta.
6. **19 September, eksplorasi pencairan nyata.** Membaca SK (pindaian, diekstrak per halaman sebagai gambar), lembar review, 156 berkas, dan templat. Menulis semua Nilai Kegiatan, memetakan status 161 slot, mengelompokkan catatan reviewer. Artefak versi 1 dengan delapan pilihan K.
7. **Putaran jawaban.** Versi 2 (K terkunci, 70% tepat, akses Entra, R2, RAB dan LPJ terkelola, pilihan N). Versi 3 dan 4 (alur tujuh tahap berakhir di lampiran, isian per dokumen, pratinjau berkas, telaah 19 draf PKS, hasil ekstraksi RAB, pilihan P). Versi 5 (P terkunci, tanpa layar impor, pindaian di layar rekening, pratinjau langsung di Buat dokumen, riwayat perubahan di tiap halaman).
8. **Penulisan dokumen ini** dan `.claude/CLAUDE.md`, atas permintaan pengguna, sebagai serah terima.
10. **Pembangunan (19 September 2026, setelah aba aba).** Fondasi: rute API dan `hooks.server.ts` dipulihkan dari `origin/main`, `adapter-cloudflare`, `dataService` menjadi `createHttpService()`, peran `baru` dan `super_admin`, masuk lewat Microsoft (`src/lib/server/deb/oauth.ts`) dan kata sandi, halaman `/menunggu`, halaman Pengguna (`/admin/users`, `src/lib/components/admin/users/Users.svelte`), koleksi dan komponen audit (`src/lib/server/deb/audit.ts`, `src/lib/components/ui/RiwayatPerubahan.svelte`), provisioning (`scripts/pocketbase/provision-deb.ts`, `deb-schema.ts`, `env.ts`). Profil DEB: `PATCH /api/campuses/[id]/program`, riwayat di halaman profil. Dokumen: `src/lib/server/deb/pencairan.ts`, `r2.ts`, rute `src/routes/api/pencairan/**`, direktori dan ruang kerja (`src/lib/components/admin/pencairan/Directory.svelte`, `Workspace.svelte`, `FileViewer.svelte`, `PencairanTabs.svelte`), muat awal (`scripts/pencairan/initial-load.ts`). Halaman demo pencairan dan login Keuangan dihapus. Diverifikasi di browser: masuk, menu, Pengguna, direktori 23 kampus, ruang kerja PNK dengan pratinjau Word dan pemeriksaan batas, pratinjau Excel dan PDF, tautan dalam, penjagaan peran kampus, halaman modul lama tanpa galat. RAB, Rekening, Lampiran, dan Buat dokumen dikerjakan oleh tiga agen paralel.
11. **Pembangunan ulang ruang kerja** (arahan 24): alur bertahap per dokumen dengan langkah Berkas, Isian, Keputusan, Tanda terima; penunjuk langkah tunggal (`PencairanTabs.svelte`, enam langkah plus LPJ); jejak tanda terima menyimpan siapa dan kapan (`signedReceivedAt`, `signedReceivedByName`, `originalReceivedAt`, `originalReceivedByName` pada `documents`); unggahan pindaian bertanda tangan lewat `signed=1`. Diverifikasi di browser pada UNS (1600 dan 390 px, tanpa gulir mendatar). Sisi kampus (`/campus/pencairan`, `/campus/lpj`) dan LPJ dasar (`src/lib/server/deb/lpj.ts`) dibangun dan diverifikasi dengan akun kampus uji (dihapus setelahnya). Agen Rekening dan Lampiran selesai: `rekening.ts`, `lampiran.ts`, rute dan halaman `[id]/rekening`, `[id]/lampiran`, rekap xlsx `/api/pencairan/rekap`; jalur pembuatan PDF sungguhan belum pernah dijalankan karena belum ada kampus dengan tujuh dokumen Sesuai berbentuk PDF atau gambar. Batas laju masuk (10 per 15 menit per akun, 60 per IP) sempat menghentikan QA; di mode pengembangan alamat loopback dikecualikan. Indeks unik satu akun kampus per kampus dari skema lama dihapus agar mentor dan koordinator bisa punya akun masing masing. Agen RAB selesai (lihat dokumen 06); sisa uji cobanya di IPB (versi 2 sampai 4) dihapus, versi 1 hasil ekstraksi dipertahankan. Kartu ringkasan pencairan ditambahkan di Beranda admin; notifikasi dalam aplikasi dikirim ke akun kampus saat keputusan review dan ke admin saat kampus mengunggah. Agen Buat dokumen selesai (lihat dokumen 04): pratinjau langsung dan penyimpanan Kuitansi PNK diverifikasi di browser; nilai uji cobanya di PNK (nomor kuitansi, tanggal, kuitansi buatan versi 2, Termin 1 diajukan, tahap) dihapus, data Profil DEB PNK dan tanggal masa perjanjian Tahun Ketiga (dari templat resmi) dipertahankan. Penunjuk langkah kini menilai "selesai" dari data (semua dokumen Sesuai, RAB disetujui, cek bank Sesuai, semua surat dibuat, lampiran ada), bukan dari nomor tahap tersimpan. Aturan koleksi lama diperluas untuk `super_admin` setelah daftar kampus kosong bagi super admin. Sapuan regresi 18 halaman admin pada 1366 dan 390 px: tanpa galat, tanpa gulir mendatar.
9. **Pembacaan ulang dokumen** oleh Claude sebagai pemeriksaan melenceng, menghasilkan empat keputusan Q1 sampai Q4 dan artefak versi 6. Tautan artefak lama hilang (terhapus atau tidak terjangkau dari akun ini), artefak diterbitkan ulang di alamat baru.

- **19 September 2026, malam (lanjutan)**: pengguna menyatakan alur belum dipahami (siklus Dashboard, Tahap 1, Tahap 2), lalu menegaskan bahwa itu daftar periksa terbuka berbasis lembar review, bukan gerbang. Artefak versi 7 (gerbang), 8 (lembar digital), 9 (setiap halaman dan cara periksa). Pengguna: tanpa ekspor Excel, revisi diunggah sebagai versi baru, tiga pertanyaan "just go with it", QR publik di setiap halaman dokumen terbitan sistem, "execute everything in one go". Skema diperbarui dan diterapkan (36 koleksi). Tiga agen paralel: (A) QR di footer Word, pembuatan dokumen, halaman verifikasi, Tanda tangan basah; (B) lampiran dengan QR per halaman, hash, pembayaran, Tahap 2; (C) pemindai Word, `rescan.ts` (88 berkas: 30 menyebut Termin 2, 76 bersorotan), aturan RAB 70%. Sesi utama: `assess()`, `checks()` baru, `directory()` baru, Dashboard, Tahap 1, Kartu, ItemPanel, tampilan kampus, dokumen. QA browser lebar 1366 dan 390 tanpa galat. Akun uji `qa.kampus@example.org` dibuat untuk tampilan kampus. Nilai kuitansi Kupang versi 1 diketik dari berkas sebagai contoh isian nyata.

- **19 September 2026, larut malam**: pengguna meninjau versi 9 di layar dan menolaknya (dinding teks, lompat sana sini, cek bank dua klik). Artefak versi 10 (satu layar per kampus) lalu versi 11 (setiap butir digambar dengan bilah aksinya, SK sebagai butir pertama) disetujui: "lets proceed execute it", RAB digital dengan berkas asli sebagai tab. Dibangun: `Layar.svelte`, `RabTable.svelte`, `TandaTanganView`, `LampiranView`, `PembayaranView`, `RiwayatSheet`, rute `POST .../rab/keputusan`, `review` dengan `bank`, `GET /api/pencairan/sk`, `scripts/pencairan/load-sk.ts` (SK 17 halaman dimuat ke R2, Lampiran I halaman 4 sampai 8). Koreksi saat tinjauan langsung: catatan selalu terlihat, RAB hanya Tahap 1, dashboard dikembalikan dengan tab Tahap 1 (keputusan 32). QA browser semua layar di 1366 dan 390 tanpa galat dan tanpa gulir mendatar.

## Kondisi working tree

Cabang `production`, HEAD `e0a4dc6`, sekitar 70 path berubah atau baru, **tidak ada yang di commit**. Isinya: perubahan tipografi dan logo, primitif UI baru, formulir baca dulu, direktori kartu, data wilayah, `leaflet` di `package.json`, serta folder dokumen ini dan `.claude/CLAUDE.md`. Belum pernah dijalankan: `npm run check`, build, dan test suite.

`.env` (diabaikan git) sudah berisi `PB_URL` https, kredensial superuser PocketBase, `DEB_PUBLIC_URL`, dan pengaturan R2. Jangan mencetak nilainya.

## Alat bantu dan bahan analisis

Disimpan di `D:\deb\Analisis\` (di luar repo karena memuat catatan reviewer dan nama berkas kampus):

| Berkas | Guna |
| --- | --- |
| `docx_text.py` | Membuang teks .docx, menandai bidang bersorotan kuning sebagai `[[...]]` |
| `inventory.py`, `deb-inventory.json` | Inventaris 156 berkas per folder kampus dengan jenis dokumennya |
| `matrix.py`, `deb-matrix.json`, `deb-review.json` | Pemetaan lembar review menjadi status per slot beserta catatan reviewer |
| `findings.py` | Pengelompokan catatan reviewer menurut jenis temuan |
| `pks_study3.py`, `pks-study3.json` | Perbandingan 19 draf PKS kampus terhadap templat, per judul pasal |
| `verify2.py`, `compact.py`, `explore2.py` | Pemeriksaan fakta untuk artefak |
| `rab/` | Skrip ekstraksi RAB (`run_extract.py`, `write_outputs.py`, `rabcore.py`, `rabpdf.py`) dan `rab-summary.json` |

Skrip itu masih memuat jalur folder sementara sesi lama di variabel `S` atau sejenisnya; sesuaikan jalurnya sebelum dijalankan ulang. Gambar halaman SK bisa dibuat ulang dengan pypdf dan PIL (perhatikan `/Rotate`).

## Cara verifikasi visual

Pakai Playwright **sebagai pustaka** (bukan test runner) dengan Chrome tanpa kepala (`channel: 'chrome'`), dimuat lewat `createRequire('D:/repos/monev-deb/package.json')`. Server dev pengguna biasanya sudah berjalan di `http://127.0.0.1:5176`. Jangan pakai `localhost:5176`, karena IPv6 di mesin ini milik server proyek lain. Periksa lebar 1366 (atau 1280) dan 390, gulir mendatar, dan galat halaman.

## Kendala lingkungan (Windows)

- Heredoc bash yang besar dan `python -c` multi baris gagal. Tulis skrip dengan alat Write lalu jalankan.
- Tidak ada poppler. PDF pindaian dibaca dengan pypdf dan PIL.
- `tar` GNU perlu `--force-local` untuk jalur `D:`.
- Konsol perlu `sys.stdout.reconfigure(encoding='utf-8')`.
- Jangan membuat berkas bernama `nul`. Pakai `$null` di PowerShell.
- Hati hati akhir baris campuran; `src/routes/login/+page.svelte` memakai CRLF.
- Ekstensi Chrome sering terputus; andalkan Playwright pustaka.
- Anggaran konteks: pengguna pernah menyela saat konteks 66%. Jaga verifikasi akhir tetap murah.

## Pelajaran

- Pengguna ingin diselaraskan lewat artefak sebelum pembangunan besar. Mockup pertama dan beberapa perubahan UX sempat dikerjakan di atas alur demo yang kemudian dibuang.
- Periksa setiap angka contoh terhadap sumber. Ringkasan agen juga bisa berubah: jumlah masalah RAB sempat terbaca 56 sebelum agen selesai, angka akhirnya 61.
- Pemetaan pertama perbandingan PKS salah melabeli semua perubahan sebagai bagian pembuka; angka yang benar dihitung ulang per judul pasal sebelum diterbitkan.
