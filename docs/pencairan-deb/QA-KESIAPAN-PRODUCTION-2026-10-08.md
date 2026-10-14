# QA kesiapan production - 8 Oktober 2026

Pekerjaan lokal atas permintaan perbaikan dan pengujian kesiapan rilis. Tidak melakukan commit, push, deploy, perubahan konfigurasi atau database production. Frontend 127.0.0.1:5176 dan PocketBase QA bertanda 8097; akun kampus 905/906 dan Admin PF lokal memakai konteks browser terpisah. Data sintetis Kampus QA Lokal 4 (`64eeefc9435d61d`), bukan transfer bank nyata. Pengajuan QA lama tidak direset.

## Perbaikan

- Mutasi RAB lama menggunakan transaksi bersama untuk perubahan versi/baris, pemeriksaan revisi, lock pembayaran, nominal dan audit. Kegagalan tidak boleh meninggalkan separuh versi. Permintaan melebihi kapasitas batch ditolak sebelum commit.
- Permintaan nomor PF, perubahan nomor PF dan permintaan akses revisi menyimpan notifikasi bersama perubahan pengajuan. Rollback dan retry diuji; penerima dibatasi pada admin aktif atau akun kampus terkait. Validasi notifikasi super_admin mengikuti rute /admin/.
- Tombol Kirim perbaikan menampilkan bagian yang belum berubah dan tidak aktif sebelum perbaikan tersimpan. Submit memeriksa ulang setelah autosave, sebelum membuat dokumen. Revisi khusus dokumen tetap boleh dibuat ulang otomatis.
- Lifecycle autosave formulir pengajuan dan editor RAB diperbaiki: komponen yang sudah dihancurkan menghentikan loop save/flush dan mengabaikan respons lama. Kondisi owner Svelte dihancurkan saat PATCH tertunda terbukti membuat versi lama mengirim berulang; tes regresi versi perbaikan hanya mengirim satu PATCH.
- Pemeriksaan tipe diperbaiki pada layanan HTTP lama, tipe workspace/journey, guard dokumen, dan konversi PDF. Perintah check memakai konfigurasi Svelte root eksplisit agar checkout lain yang tidak dilacak tidak menjadi konfigurasi proyek aktif.
- Helper pemulihan lokal memverifikasi database dan objek pada salinan terpisah. Helper smoke Cloudflare memakai environment terisolasi dan menolak credential bindings yang tidak diharapkan.
- Label aktif tidak lagi menyebut semua capaian sebagai simulasi; penanda data yang memang `simulated` atau `targetSimulated` dipertahankan. Default URL publik development diselaraskan ke launcher 5176; nilai environment eksplisit tetap diutamakan.

## QA browser aktual

1. Membuat pengajuan baru: Data Program dan alamat wilayah, RAB manual Rp20 juta, alokasi 14 dari 20 unit (Rp14 juta/6 juta), rekening, penandatangan, tanggal/nomor surat, kop, PKS, empat dokumen otomatis, lalu submit.
2. Nomor PKS PF kosong tidak menghalangi submit. Notifikasi admin `Nomor PKS PF diperlukan` benar-benar tersimpan untuk QA4 pada 02:14 UTC. Admin mengisi nomor; akun kampus menerima `Nomor PKS PF sudah tersedia` pada 02:15 UTC.
3. Revisi khusus dokumen setelah nomor PF berubah: PKS dan permohonan dibuat ulang, kirim perbaikan HTTP 200. Riwayat pengajuan bertambah.
4. Revisi isian PKS: tombol kirim awalnya disabled. Dua akun membuka revisi sama; simpan akun905 HTTP 200, akun906 dengan revisi lama HTTP 409, nilai yang belum tersimpan tetap ada pada input akun906. Akun905 mengirim revisi HTTP 200; riwayat menjadi tiga pengajuan.
5. Admin menyetujui RAB 100%, Termin 1, Termin 2, PKS, permohonan, kuitansi, invois dan pemeriksaan rekening lewat UI; semua respons keputusan HTTP 200.
6. Kampus mengunggah empat PNG uji sebagai pindaian, semuanya HTTP 200. Admin mencatat empat dokumen asli diterima, semuanya HTTP 200. Simpan lampiran HTTP 201: tujuh halaman, id `35402ea6130842e`, SHA-256 `f00f62f87a1c08a839c092c9a667d7194feb4beb6a477763f11fc6ad174b9b25`.
7. Catat pembayaran lokal Rp14.000.000, tanggal 2026-10-08, referensi `QA-LOKAL-20261008-004`. Setelah reload, server tetap menyimpan nominal/tanggal/referensi dan kampus menampilkan proses Tahap 1 selesai. PATCH pengajuan setelah dibayar ditolak HTTP 409.
8. Mengetik ketika respons save ditahan: perubahan baru dipertahankan dan dikirim sesudah respons pertama, dua PATCH lalu berhenti. Simpan biasa satu PATCH. Perubahan wilayah selama save disusul navigasi juga selesai dengan dua PATCH.
9. Retry pembayaran identik mengembalikan 200 tanpa menaikkan revisi atau menambah notifikasi; referensi berbeda dengan revisi lama ditolak 409. Akun kampus tidak bisa membaca pengajuan kampus lain (403). Notifikasi pembayaran tetap satu.
10. Halaman Notifikasi kampus benar-benar menampilkan nomor PKS PF tersedia dan satu notifikasi pembayaran QA4. Health API frontend HTTP 200.

Screenshot: `output/qa-production-campus-paid.png`, `output/qa-production-admin-paid.png`. Sejumlah locator QA awal salah menebak judul/label dan timeout; diperbaiki setelah membaca DOM/rute, tidak dihitung sebagai kegagalan aplikasi atau bukti lulus. Satu PNG fixture tidak dapat didekode browser untuk kop; diganti PNG canvas uji yang valid. Dokumen ini tidak menilai keabsahan tanda tangan atau isi berkas sintetis.

## Verifikasi terminal dan recovery

- Regresi gabungan akhir: `npm test`, exit 0, 66 lulus/0 gagal. Log `output/production-tests-final.log`. Termasuk konflik transaksi RAB vs pembayaran, rollback notifikasi, upload/ZIP, HTTP, logout, revisi dan lifecycle autosave formulir/RAB.
- `npm run check`, exit 0, 0 error/0 warning Svelte. Log `output/production-check-final.log`.
- `npm run build`, exit 0, adapter Cloudflare. Log `output/production-build-final.log`. Warning tersisa: deprecation punycode dan beberapa chunk >500 kB; bukan kegagalan build.
- `node scripts/qa/cloudflare-smoke.mjs`, exit 0 setelah build akhir. Log `output/production-cloudflare-smoke-final.log`. SSR/API anonim, preview akun disabled, origin guard, logout cookie dan body parser lulus; proses Wrangler yang dibuat sendiri dihentikan.
- `git diff --check`, exit 0 dengan pengaturan pemeriksaan CRLF (`cr-at-eol`) untuk checkout Windows; tidak menormalisasi berkas pengguna secara massal.
- [Recovery lokal](QA-RECOVERY-LOKAL-2026-10-08.md): 2 database, 48 tabel, 598 objek cocok; clone8098 health 200 lalu dihentikan. Ini snapshot sebelum alur QA4 selesai, bukan backup paling baru.
- [Smoke Cloudflare](QA-CLOUDFLARE-SMOKE-2026-10-08.md): SSR, API anonim, preview disabled, origin guard, cookie logout dan parser. Jalankan ulang setelah build dengan `node scripts/qa/cloudflare-smoke.mjs`. Backend smoke sengaja loopback tidak tersedia, tanpa kredensial.

## Temuan terbuka dan batas rilis

- Anomali PATCH autosave tanpa input baru hingga revisi server >1600 ditelusuri ke lifecycle. Dengan compiler Svelte terpasang, owner dihancurkan saat PATCH pending: kode sebelum perbaikan mengirim empat PATCH sampai batas harness dan tes gagal; setelah perbaikan satu PATCH, hasil false, respons terlambat tidak mengganti fields. Skenario lifecycle ini terbukti dan diperbaiki. Jejak HMR lengkap kejadian browser awal tidak tersedia, jadi pemicu tepat kejadian awal tidak diklaim terbukti. QA browser alur biasa dilakukan sebelum guard lifecycle terakhir; regresi lifecycle akhir dibuktikan lewat compiler test.
- Autentikasi SSO, pengiriman email nyata, cookie domain/HTTPS, R2 remote, batas resource Cloudflare dan observabilitas hosting belum diuji pada staging yang menyerupai target. Smoke tanpa backend bukan bukti login production.
- Tes transaksi memakai transport terkontrol untuk memaksa kegagalan, bukan mematikan database/storage aktif. Uji dua akun di browser memakai PocketBase lokal nyata. Uji beban banyak kampus serentak belum dijalankan.
- Runtime lokal Node25.5.0; package meminta Node22.x. Recovery memakai node:sqlite experimental dan digest tabel dalam memori. Verifikasi pada runtime target tetap diperlukan.
- Pemulihan lintas mesin, konfigurasi/kunci environment eksternal dan R2 belum tercakup. Objek yang terunggah sebelum transaksi database gagal bisa menjadi objek tanpa referensi; tidak dihapus otomatis agar data tidak hilang.
- Bukti 14 revisi sebelumnya tetap tersedia di [QA 14 revisi](QA-EDGE-CASES-DAN-14-REVISI-2026-10-07.md). Run ini memperbarui bukti alur baru/notifikasi/revisi/pembayaran; tidak mengklaim mengulang seluruh kombinasi Excel, kamera QR, perangkat, rekening kuasa, atau semua data historis.

Status: perbaikan lokal dan QA alur inti selesai, dengan verifikasi akhir dicatat di atas. Belum menjadi persetujuan go-live: staging dengan runtime, SSO, email, storage, domain dan beban target tetap diperlukan.

## Tambahan akses notifikasi kampus

Ikon lonceng header kini tersedia untuk kampus, tepat di sebelah dropdown akun, memakai rute dan hitungan notifikasi yang sudah ada. Target klik 44 x 44 piksel, label aksesibel, indikator belum dibaca, dan penanda halaman aktif tersedia. Membuka lonceng menutup dropdown akun.

QA Playwright pada PocketBase lokal: desktop 1440 x 900 dan mobile 390 x 844 berhasil membuka /campus/notifications melalui klik dan keyboard Enter. Mobile tidak mengalami overflow horizontal. Dua notifikasi aktual tampil; setelah Tandai semua dibaca, hitungan menjadi nol dan indikator menghilang, tetap nol setelah reload. Screenshot lokal: output/qa-campus-notification-bell-mobile.png.

Build setelah perubahan lonceng berhasil: npm run build exit 0, adapter Cloudflare, 48,56 detik. Log lokal output/build-notification-delivery.log. Warning punycode dan chunk >500 kB masih ada. Percobaan build dalam sandbox gagal spawn EPERM; build ulang dengan izin proses berhasil. Test suite/check tidak diulang untuk perubahan header ini; hasil sebelumnya tercatat di atas.
