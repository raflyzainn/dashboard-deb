# 07. Rencana bangun

Status 19 September 2026 (malam): **dibangun, dibentuk ulang mengikuti artefak versi 9, lalu dibentuk ulang lagi mengikuti artefak versi 11** (keputusan 27 sampai 31). Fase 1 sampai 7 di bawah adalah rencana lama; yang berlaku adalah bagian "Kondisi pembangunan versi 9" di akhir dokumen ini dan dokumen 05.

## Tiga fakta (sudah dijawab 19 September 2026)

1. PocketBase di `deb-api.pertaminafoundation.org` kosong. Sudah diprovisikan oleh `scripts/pocketbase/provision-deb.ts --apply` (34 koleksi, 40 kampus, 23 SK, pengaturan program, akun super admin).
2. Bucket R2 `pf-monev-deb` kosong. Sudah diisi oleh `scripts/pencairan/initial-load.ts --apply`: 136 berkas kampus menjadi versi 1 dan seterusnya di slotnya, catatan reviewer menjadi entri review pertama, status slot mengikuti lembar review; 11 berkas di luar tujuh slot (format laporan, lainnya, tautan) dibiarkan di folder sumber.
3. `deb.pertaminafoundation.org` berjalan di Cloudflare Pages (`adapter-cloudflare` aktif).

## Deploy ke Cloudflare Pages (langkah pengguna)

- Salin variabel `.env` ke pengaturan proyek Pages (production dan preview): `PB_URL`, `PB_SUPER_TOKEN` (token superuser berumur panjang yang diterbitkan `scripts/pocketbase/super-token.ts`, cara PF Series; server tidak pernah masuk dengan kata sandi saat melayani permintaan), `DEB_PUBLIC_URL`, `DEB_INVITATION_KEY`, `DEB_SUPERADMIN_EMAIL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `DEB_LOCAL_PREVIEW_ENABLED=false`. `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, dan `DEB_SUPERADMIN_PASSWORD` hanya dipakai skrip dari mesin pengembang, tidak perlu di Pages. Periksa `/api/health` setelah deploy: `auth` harus `token`, `signedIn` harus `true`.
- Perintah build `npm run build`, direktori keluaran `.svelte-kit/cloudflare` (sudah di `wrangler.jsonc`, flag `nodejs_compat`).
- Alamat kembali Entra untuk produksi sudah terdaftar: `https://deb.pertaminafoundation.org/api/auth/oauth/microsoft/callback`. Untuk pengujian lokal buka aplikasi lewat `http://localhost:<port>` (bukan 127.0.0.1) karena Entra hanya mengembalikan ke `localhost`.
- `npm run build` dijalankan sekali pada 20 September 2026 saat persiapan deploy dan lolos (adapter-cloudflare; daftar `routes.exclude` di `svelte.config.js` menyebut folder statis agar tidak melampaui batas `_routes.json`).

## Cakupan aba aba "go"

Termasuk:

- Membuat koleksi di PocketBase sesuai dokumen 04. Hanya menambah, tidak mengubah yang sudah ada.
- Muat awal satu kali: status dan catatan lembar review, serta 156 berkas kampus ke R2 sebagai versi 1 slotnya.
- Memindahkan aplikasi dari demo statis ke aplikasi dengan server.
- Mengganti halaman Pencairan demo dan menghapus login Keuangan.

Tidak termasuk, tetap perlu perintah tersendiri: commit, push, deploy, menjalankan tes atau `npm run check` dari terminal, mengubah pengaturan Entra atau PocketBase di luar koleksi.

## Urutan bangun dan kriteria selesai

| Fase | Isi | Selesai bila |
| --- | --- | --- |
| 1. Fondasi (selesai 19 Sep 2026) | Aplikasi dengan server, masuk dengan Microsoft (P2 A) dan kata sandi, akun Baru otomatis, peran, super admin tetap, koleksi `audit` dan komponen "Riwayat perubahan" untuk setiap halaman, SK dan semua 40 kampus dengan 23 kampus didanai ditandai dan diberi mode admin | Akun baru hanya melihat halaman menunggu; admin melihat direktori; perubahan peran tercatat dan tampil di bawah halaman Pengguna |
| 2. Profil DEB di atas data nyata (selesai) | Bagian baca dulu yang sudah dibuat, kini diberi data SK dan disimpan ke backend (`PATCH /api/campuses/[id]/program`), hanya admin yang bisa menyunting | Bagian "Sesuai SK" terkunci; perubahan alamat, lokasi, kontak tercatat di riwayat halaman |
| 3. Dokumen, direktori, ruang kerja (selesai, dibangun ulang sebagai alur terpandu) | Slot, versi di R2, penampil berkas di dalam halaman, isian per dokumen dengan tanda diisi dan dicek ulang, review, direktori dengan pencarian dan saringan, muat awal selesai | Tim bisa meninggalkan lembar Excel: 161 slot tampil dengan status dan catatan yang sama, 156 berkas bisa dibuka di halaman |
| 4. RAB terkelola (selesai) | Pohon empat tingkat, pemeriksaan terhadap SK, impor dan ekspor templat Excel, hasil ekstraksi dimuat sebagai versi 1 untuk 19 kampus | RAB 19 kampus termuat sebagai versi 1; pelanggaran batas 70% dan total SK tampil; persetujuan mengunci nominal Termin 1 |
| 5. Rekening dan surat kuasa (selesai) | Pindaian di halaman, isian, cek ulang (P3 A), perbandingan nama, catatan cek bank dengan bukti | Ketidakcocokan menahan tahap 6; pelewatan memerlukan alasan dan tercatat |
| 6. Buat dokumen | Properti, **pratinjau langsung**, PKS standar dan khusus (P1 A) dengan daftar pasal berbeda, Surat permohonan, Invois, Kuitansi, pindaian bertanda tangan, asli kertas | Tidak ada unduhan tanpa pratinjau; berkas tersimpan sama dengan yang dipratinjau; UNSIKA tampil dengan sen dan terbilang sen |
| 7. Ekspor lampiran (selesai; jalur gabung sungguhan belum pernah dijalankan karena belum ada kampus yang seluruh berkasnya PDF atau gambar dan Sesuai) | Satu PDF per kampus, rekap semua kampus | PDF bisa dibuat ulang dari daftar versi penyusunnya. **Termin 1 selesai** |
| 8. Sebagian sudah ada | Sisi kampus (`/campus/pencairan`, `/campus/lpj`, aktif penuh saat `fillMode = campus`) dan LPJ dasar per invois sudah dibangun. Belum: Termin 2 dengan sisa terbawa, peran lebih sempit, notifikasi surel | Termin 2 memerlukan slot dokumen termin kedua (laporan realisasi, permohonan, invois, kuitansi) di atas model yang sama (`disbursements.term = 2`) |

Setiap fase: QA lewat browser (Playwright sebagai pustaka terhadap server dev), periksa lebar 1366 dan 390 tanpa gulir mendatar, tanpa galat JavaScript. Perbarui dokumen di folder ini bila perilaku berubah.

## Pekerjaan persiapan sebelum fase 1

- Ubah templat Word resmi (PKS, surat permohonan, invois, kuitansi) menjadi templat gabungan: ganti setiap sorotan kuning dengan penanda bidang, jadikan "Tahun Ketiga", penandatangan PF, dan masa perjanjian sebagai bidang, pisahkan halaman Termin 1.
- Tulis skrip muat awal yang membaca `D:\deb\Analisis\deb-matrix.json`, `deb-review.json`, dan `deb-inventory.json`. Skrip dijalankan dari mesin pengguna, bukan bagian aplikasi, dan tidak masuk repo bila memuat data pribadi.
- Pastikan fitur batch PocketBase aktif (untuk menulis perubahan dan audit dalam satu langkah).

## Pekerjaan sisa dari fase sebelumnya (prioritas rendah, konfirmasi dulu)

- Spesifikasi uji bersama masih menggambarkan perilaku lama: `tests/browser/demo.spec.ts`, `periods.spec.ts` baris 81 sampai 105, `workflows.spec.ts` baris 104 sampai 121. Spesifikasi yang sudah diperbarui tetapi belum dijalankan: `campus-indicators.spec.ts`, `proposals.spec.ts`, `payments.spec.ts`.
- Dokumen lama belum mencerminkan formulir baca dulu dan direktori kartu: `docs/PANDUAN-CODEX.md`, `docs/PROPOSAL-VERSIONS.md`.
- Nada "green" pada `Badge` tampil biru. Anggaran tersimpan sebagai teks terformat ("Rp 75.000.000") di demo.
- `npm run check` dan build belum pernah dijalankan (dilarang `AGENTS.md` sampai diminta).
- "Ubah password" di Pengaturan memanggil API yang tidak ada (akan hilang dengan SSO).
- Pertanyaan rumah tangga yang belum dijawab: hapus proyek Cloudflare Pages lama `monev-deb` (mockup pertama) dan arsip `D:\repos\monev-deb-mockup-backup-2026-09-18.tar.gz`?

## Yang tidak boleh dilakukan

- Menjalankan migrasi, provisioning, atau seed ke layanan luar tanpa aba aba.
- Menyalin isi `D:\deb` ke repo.
- Menambah layar impor lembar review, halaman audit khusus, atau unduhan dokumen tanpa pratinjau.
- Membuat PKS tanpa peringatan bila Termin 2 melebihi 30%, atau menyimpan nomor surat di lebih dari satu tempat.
- Membulatkan 70% atau menyimpan uang sebagai desimal.
- Menampilkan nomor KTP, alamat rumah, atau nomor rekening utuh di daftar.
- Meniru kelemahan SSO PF Series (lihat dokumen 04).

## Kondisi pembangunan versi 9 (19 September 2026, malam)

Dibangun dan diperiksa lewat browser (Chrome tanpa kepala, lebar 1366 dan 390, tanpa galat konsol, tanpa gulir mendatar):

- **Server**: `KINDS` menjadi delapan butir lembar review (`pks, rab, permohonan, kuitansi, invois, laporan, rekening, surat_kuasa`); `assess()` di `src/lib/pencairan.ts` memberi bacaan yang sama untuk dashboard, kartu, dan tampilan kampus (butir selesai, Lengkap, menunggu admin atau kampus, frasa); `checks()` di `src/lib/server/deb/pencairan.ts` menghitung batas 70%, RAB 70% terhadap batas, nominal tiga surat sama dengan yang diajukan, terbilang, nilai PKS sama dengan SK, rekening pada invois, pemilik rekening terhadap penandatangan PKS (menentukan perlunya surat kuasa), hasil cek bank, halaman Termin 2 dan sorotan kuning dari pemindaian berkas Word (`docscan.ts`, 88 berkas dipindai). `recordPayment` dan `PATCH /api/pencairan/[campus]/pembayaran` mencatat transfer Tahap 1.
- **Skema** (sudah diterapkan ke PocketBase, 36 koleksi): `documents.kind` bertambah `laporan`; `document_versions.signed` dan `scan`; `attachments.sha256`, `verification`, `pages`; `disbursements.paidRef`, `paidByName`, `paidNote`; koleksi baru `verifications`.
- **Layar** (dokumen 05): Dashboard grid (`/admin/pencairan`), daftar Tahap 1 (`/admin/pencairan/tahap-1`), Tahap 2 (`/admin/pencairan/tahap-2`), kartu pemeriksaan (`/admin/pencairan/[id]`) dengan panel butir (`?butir=<kind>`), RAB 70% (`/rab`), tanda tangan basah (`/tanda-tangan`), lampiran dan pembayaran (`/lampiran`), LPJ (`/lpj`), verifikasi publik (`/verifikasi/[kode]`), tampilan kampus (`/campus/pencairan`).
- **Dihapus**: ruang kerja tujuh langkah, penunjuk langkah `PencairanTabs`, direktori kartu, halaman Rekening tersendiri (cek bank pindah ke panel butir Buku rekening), Buat dokumen tersendiri (menjadi Tanda tangan basah), ekspor rekap Excel.
- **QR dan verifikasi**: `src/lib/qr.ts` (matriks dan PNG tanpa kanvas), `withVerificationFooter` di `src/lib/merge.ts` untuk berkas Word, gambar kotak per halaman untuk PDF lampiran, `src/lib/server/deb/verifikasi.ts` (kode, pencatatan, pembacaan publik).

Masih terbuka:

- `npm run build` belum pernah dijalankan (dilarang tanpa permintaan); deploy Pages dan variabel lingkungannya adalah langkah pengguna.
- Hasil ekstraksi RAB kampus perlu dilihat: pada IPB kolom RAB 70% versi 1 sama dengan RAB penuh (Rp53.235.399,50), di atas batas, sehingga persetujuan terkunci sampai barisnya disesuaikan; lembar review menyebut Rp50.110.400.
- Butir "Format laporan DEB Termin 1" dihapus pada 20 September 2026 (keputusan 39).
- Tahap 2 hanya kartu penampung; LPJ masih halaman lama; tampilan kampus belum diaktifkan untuk 17 kampus lain.
- Akun uji `qa.kampus@example.org` (peran kampus, Politeknik Negeri Kupang) dibuat untuk QA tampilan kampus; hapus atau nonaktifkan bila tidak diperlukan.

## Kondisi pembangunan versi 11 (19 September 2026, larut malam)

- **Server**: `KINDS` dimulai dengan `sk` (sepuluh butir sejak keputusan 43); slot `sk` dibuat dengan status `perlu_konfirmasi`; `GET /api/pencairan/sk` mengalirkan berkas SK dari R2; `sk_awards.fileKey`, `lampiranPage`, `lampiranNo` diisi oleh `scripts/pencairan/load-sk.ts --apply` (halaman Lampiran I 4 sampai 8); `POST .../documents/[kind]/review` menerima `bank: { result, nameSeen }` untuk rekening (cek bank dan keputusan dalam satu panggilan); `POST .../rab/keputusan` menyetujui atau menarik RAB terkelola dan memutuskan butir RAB; keputusan SK tidak memberi tahu kampus.
- **Layar**: `Layar.svelte` (daftar butir, dokumen, panel Catatan, bilah aksi), `Dashboard.svelte` (ringkasan dan grid), `Tahap1Grid.svelte` (grid pilih kampus), `RabTable.svelte`, `TandaTanganView.svelte`, `LampiranView.svelte`, `PembayaranView.svelte`, `RiwayatSheet.svelte`, `PencairanNav.svelte` (Tahap 1, Tahap 2). Dihapus: `Kartu.svelte`, `ItemPanel.svelte`, `Tahap1.svelte`, `TandaTangan.svelte`, `Lampiran.svelte`, rute `/[id]/tanda-tangan`, `/[id]/lampiran`.
- **Masih terbuka**: sama dengan versi 9 (build, deploy, ekstraksi RAB IPB di atas batas, Tahap 2 penampung), ditambah: halaman verifikasi tidak lagi memeriksa sesi; akun uji di produksi sudah dihapus, uji coba memakai PocketBase lokal (dokumen 08, "Uji coba tanpa menyentuh produksi").

## Tambahan 20 September 2026: Catatan percakapan (keputusan 38)

- **Server**: koleksi `notes` (sudah diprovisikan ke produksi), `addNote` dan `forCampus` di `pencairan.ts`, rute `POST .../documents/[kind]/catatan` untuk semua peran, `GET /api/pencairan/[campus]` dan `POST .../versions` memakai `forCampus` untuk akun kampus.
- **Layar**: panel Catatan tetap di bawah dokumen pada semua butir (pesan, kotak tulis yang membesar, Kirim, kotak Catatan internal untuk staf), catatan keputusan menjadi textarea yang membesar. Belum diuji dari sisi akun kampus di produksi (tidak ada akun kampus di sana); pengujian sisi kampus memakai PocketBase lokal.
