# Login mitra: pencairan dan unggah revisi

## Panduan Aplikasi kampus, 23 September 2026

Panduan di `/campus/guide` kembali dapat dibuka melalui dropdown akun kampus. Isinya dibatasi pada Beranda, Pencairan Dana, dan kapan kampus perlu mengirim dokumen; tautan Forum Q&A, Pusat bantuan, serta Notifikasi lama dihapus. SK/RAB dijelaskan sebagai dokumen baca-saja, sedangkan dokumen yang menunggu PF atau sudah sesuai tidak perlu dikirim ulang. Rute kampus lain tetap diarahkan ke Beranda.

QA Playwright pada aplikasi dan salinan PocketBase lokal dengan akun ITERA: sebelum perubahan, `/campus/guide` mengarah kembali ke Beranda; setelah perubahan, halaman Panduan terbuka. Menu akun memuat tautan Panduan Aplikasi dengan penanda halaman aktif. Tautan ke Beranda dan Pencairan Dana berhasil membuka halaman tujuan; dua kartu panduan tampil dan tidak ada tautan fitur lama. Pada lebar CSS 390 px dan 1280 px tidak ada overflow horizontal. Tampilan mobile dan desktop diperiksa secara visual. Tidak ada unggahan atau perubahan data. `npm run build` selesai dengan exit code 0 menggunakan adapter Cloudflare; peringatan lama pada komponen lain dan kunci duplikat `src/lib/pencairan.ts` masih muncul. Tes, check, dan format terminal tidak dijalankan pada perubahan panduan ini; produksi belum diperiksa.

## Beranda: langkah berikutnya, 23 September 2026

Beranda kampus kini memakai data dari GET pencairan kampus sendiri untuk menampilkan progres Tahap 1 dan satu langkah berikutnya. Revisi yang masih boleh diunggah didahulukan, lalu dokumen kosong yang masih boleh diunggah; SK/RAB dan berkas final tidak ditawarkan. Jika tidak ada tindakan kampus, kartu mengarahkan pengguna untuk memantau progres. Keadaan tanpa kampus, tanpa penetapan, dan gagal memuat mendapat pesan terpisah.

QA dan build ulang sebelum pengiriman: browser lokal menampilkan judul umum, penjelasan, saran unggah Permohonan, status PKS, dan petunjuk dropdown akun. Tombol "Buka Permohonan" membuka butir Permohonan yang benar. Lebar CSS 390 px dan 1280 px tidak overflow; konsol browser 0 error. `npm run build` selesai exit 0 dengan adapter Cloudflare; peringatan lama tetap ada pada `Shell.svelte`, `Proposals.svelte`, `pencairan.ts`, `Layar.svelte`, dan `RiwayatSheet.svelte`. Tes/check/format terminal tidak dijalankan ulang pada tahap ini; QA runtime produksi belum dilakukan.

QA Playwright pada aplikasi dan salinan PocketBase lokal dengan akun ITERA: kartu mula-mula menampilkan "1 dari 10 selesai", "unggah Permohonan pencairan dana", dan "PKS sedang menunggu pemeriksaan PF". Tombol "Buka Permohonan" membuka `/campus/pencairan?butir=permohonan`, dan butir tersebut menampilkan status Belum ada beserta formulir unggah. Setelah masukan pengguna, judul hitungan diganti menjadi "Saat ini: proses pencairan dana"; penjelasan "Pantau status pencairan..." dan petunjuk dropdown akun dikembalikan. QA browser ulang menunjukkan ketiganya tampil bersama saran dokumen pada viewport CSS 390 px dan 1280 px tanpa overflow horizontal. Bukti lokal: `.qa/beranda-langkah-berikutnya-mobile-20260923.png` dan `.qa/beranda-penjelasan-mobile-20260923.png`. Tidak ada unggahan atau perubahan data dalam QA ini. Pada QA awal, tes terminal, check, dan build belum dijalankan; status build terbaru dicatat di atas. Produksi belum diperiksa.

## Ringkasan progres kampus, 23 September 2026

Ringkasan di atas halaman Pencairan Dana kini menyebut jumlah selesai dan nama butir yang **Belum ada**, **Perlu revisi**, atau **Menunggu PF** pada baris terpisah. Kalimat umum "Masih ... yang perlu dilengkapi" tidak ditampilkan saat masih ada butir terbuka, karena dapat mencampur berkas yang belum ada dengan kiriman yang sedang diperiksa. Keterangan setelah semua butir selesai tetap tampil.

QA Playwright pada salinan PocketBase lokal: setelah unggah PKS contoh ITERA, ringkasan menampilkan "1 dari 10 selesai", delapan nama butir Belum ada, dan "Menunggu PF (1): PKS". Tampilan jendela 390 dan 1366 diperiksa; tidak ada gulir horizontal halaman. Bukti lokal: `.qa/progres-ringkasan-teks-mobile-20260923.png`. `npm run build` selesai dengan exit code 0; masih ada peringatan Svelte/a11y dan kunci duplikat yang sudah ada sebelumnya.

Pemeriksaan lanjutan sebelum publikasi, 23 September 2026: QA Playwright ulang setelah "Perbarui status" tetap menampilkan daftar tersebut dan tidak ada overflow pada viewport mobile. `npm run check` gagal dengan 128 error dan 6 peringatan di 34 berkas; `npm test` menghasilkan 57 lulus dan 2 gagal (logout demo masih meminta backend; pesan penolakan akun kampus pada pembayaran tidak cocok dengan ekspektasi tes); `npm run format:check` gagal pada 118 berkas. Kunci duplikat di `src/lib/pencairan.ts` sudah ada di HEAD. Build yang berhasil saja belum cukup untuk menyatakan siap produksi. Tidak ada push atau deploy.

Sebelum rencana push, `git fetch gitlab production` menunjukkan HEAD lokal dan `gitlab/production` sama di `50e9fbf` (divergensi 0/0). Kedua perilaku yang menyebabkan tes gagal juga ada di HEAD; perubahan ringkasan lokal terbatas pada `Layar.svelte` dan laporan ini. Karena gerbang verifikasi proyek masih gagal, push ditunda.

Setelah mengetahui batas tersebut, pengguna meminta publikasi perubahan ringkasan tanpa memperbaiki kegagalan lama. Build diulang dan selesai dengan exit code 0 menggunakan adapter Cloudflare. Persetujuan ini tidak mengubah status `check`, tes, atau format yang masih gagal; QA runtime produksi belum dilakukan.

## Verifikasi sebelum publikasi yang diizinkan pengguna

21 September 2026: pengguna mengizinkan push hanya revisi ini ke GitLab `production`. Fetch terbaru menunjukkan basis HEAD dan `gitlab/production` sama (0/0); branch backup perubahan lama tidak digabungkan. Berkas Excel pengguna, `.local`, `.env`, dan screenshot lokal tidak disertakan.

QA browser ulang: login ITERA ke Beranda tanpa sidebar; CTA pencairan berfungsi; Surat kuasa kosong menampilkan form unggah dan tombol kirim nonaktif tanpa berkas; invoice/PDF terbuka, panel metadata kosong tidak dirender; gap mobile transparan 20 px tanpa overflow; desktop kembali ke jarak bawaan tanpa overflow; akses `/campus/questions` kembali ke Beranda. Pengujian pengiriman awal/revisi dan penolakan server tercatat pada QA sebelumnya di bawah. Tidak ada pengiriman dokumen/keputusan baru pada pemeriksaan akhir. Tes terminal/check/build serta deployment produksi belum diverifikasi.

Pernyataan “belum di-push” pada bagian historis di bawah merekam keadaan saat QA tersebut dilakukan, bukan status pengiriman akhir.

## Revisi terakhir: tanpa sidebar, Beranda penyambutan

Bagian ini menggantikan rancangan navigasi/beranda pada laporan historis di bawah.

- Login kampus tetap menuju Beranda: sapaan pagi/siang/sore/malam berdasarkan WIB, pengantar monitoring/evaluasi/pencairan DEB, dan satu tombol menuju Pencairan Dana.
- Sidebar desktop dan drawer mobile kampus tidak dirender; margin kiri dihapus. Dropdown akun berisi Beranda, Pencairan Dana, Keluar. Dukungan dan notifikasi sementara disembunyikan, URL lamanya diarahkan ke Beranda. Admin tidak berubah.
- Ringkasan dashboard terdahulu beserta helper/test khususnya dihapus karena diganti Beranda sederhana. Data dokumen/riwayat unggahan tidak dihapus. Sapaan memiliki cek regresi `tests/campus-home.test.ts`, belum dijalankan lewat terminal.
- QA browser aktual: login ITERA masuk Beranda, sapaan siang tampil, sidebar kampus berjumlah 0 dan margin kiri 0 px; sidebar admin tetap terlihat. Dropdown membuka pencairan dan menutup setelah dipilih; URL Forum Q&A kampus kembali ke Beranda.
- QA mobile CSS 390 px: tanpa hamburger/sidebar, dropdown dapat membuka pencairan lalu kembali ke Beranda; tidak ada overflow horizontal halaman.
- Bukti lokal: [desktop](../../.qa/kampus-tanpa-sidebar-desktop.png), [mobile](../../.qa/kampus-tanpa-sidebar-mobile.png). Tidak ada commit/push/deploy atau tes terminal.

## Lingkup dan basis Git

### Tambahan mobile: indikator geser dan jarak antarbagiannya

Revisi lanjutan setelah umpan balik screenshot: aturan mobile kini berlaku untuk admin dan kampus. Frame dan gap transparan mengikuti latar halaman; kartu navigasi, toolbar, status, review, dan catatan terpisah dengan jarak 20 px (menggantikan 16 px di laporan awal di bawah). Panel metadata kampus tanpa isi tidak dirender, sehingga tidak ada blok putih kosong di bawah PDF. Metadata yang berisi dan kontrol admin tetap dipertahankan. Toolbar/tombol keputusan minimal 44 px, catatan keputusan minimal 88 px.

QA browser lanjutan: invoice ITERA tidak memiliki panel metadata kosong, gap transparan 20 px; admin RAB memiliki padding review 20 × 16 px dan tombol 44 px. Keduanya tanpa overflow horizontal di mobile CSS 390 px. Desktop kembali ke gap bawaan, tanpa overflow. Tidak menekan keputusan, mengirim catatan, atau mengunggah dalam QA ini. Bukti: [kampus](../../.qa/kampus-separated-cards.png), [admin](../../.qa/admin-mobile-spacing.png). Tidak ada tes terminal, commit, push, atau deploy.

- Daftar butir memiliki indikator posisi yang selalu tampil pada mobile, mengikuti geseran, serta teks “Geser untuk melihat dokumen lainnya”. Indikator ini tidak bergantung pada scrollbar bawaan perangkat yang dapat menghilang.
- Khusus kampus di bawah 1024 px: jarak antarbagian 16 px, padding status 16 px, padding catatan 20 × 16 px, textarea minimum 88 px, dan tombol Kirim minimum 44 px di baris tersendiri. Desktop tidak mendapat perubahan jarak tersebut.
- QA browser lokal ITERA: viewport CSS 390 px, daftar digeser dari awal sampai akhir, indikator berpindah, Surat kuasa dapat dipilih dan tombol Kirim dokumen tampil. Invoice/PDF tetap terbuka; halaman tidak overflow horizontal. Pada desktop indikator/petunjuk tersembunyi dan daftar tetap vertikal.
- Bukti: [indikator mobile](../../.qa/kampus-mobile-scroll.png), [jarak mobile](../../.qa/kampus-mobile-spacing.png). Tidak mengunggah/mengirim catatan dalam QA ini. Tes terminal tidak dijalankan; tidak commit/push/deploy.
- Cek regresi berikut dapat dijalankan melalui tool Playwright pada halaman pencairan yang sudah login, bukan melalui terminal:

```js
async (page) => {
  await page.setViewportSize({ width: 351, height: 760 });
  const rail = page.getByRole('complementary', { name: 'Butir' });
  await rail.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await page.waitForFunction(() => {
    const rail = document.querySelector('aside[aria-label="Butir"]');
    const thumb = rail.nextElementSibling.firstElementChild.firstElementChild;
    return rail.scrollLeft > 0 && parseFloat(thumb.style.left) > 0;
  });
  if (!await page.getByText('↔ Geser untuk melihat dokumen lainnya').isVisible()) throw new Error('Petunjuk tidak terlihat');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Halaman overflow');
}
```

- Branch lokal: `feat/login-kampus-pencairan`, dari `gitlab/production` pada `72f68a4bd9b892841d1af1360244018951262369`.
- Fetch 21 September 2026: HEAD dan production tidak berbeda sebelum implementasi. Snapshot perubahan lama `backup/sebelum-revisi-login-kampus-20260921` tidak digabungkan.
- Revisi ini belum di-commit, di-push, atau di-deploy. Dua berkas Excel pengguna tidak diubah.
- Menu kampus terbaru: Beranda, Pencairan Dana serta Dukungan (Forum Q&A, Pusat Bantuan, Notifikasi). Profil, indikator, proposal, LPJ, dan pengaturan tidak ditampilkan.
- Unggah kampus dibuka untuk PKS, permohonan, kuitansi, invoice, rekening, surat kuasa yang kosong/perlu revisi. RAB dan SK tetap hanya baca; tidak ada perubahan perhitungan/persetujuan RAB.
- Formulir meminta pemilihan berkas dan pengiriman eksplisit; catatan opsional. Berkas maksimal 40 MB. Unggah sukses menjadi versi baru dan menunggu pemeriksaan PF.

## QA browser awal — sebelum tambahan Beranda

Lingkungan: `http://127.0.0.1:5176`, backend loopback `127.0.0.1:8097`, salinan lokal `production-copy-1789801517464`. Akun preview kampus PNK dan Admin PF lokal 1. Tidak ada mutasi data produksi.

- [x] Login kampus mengarah ke pencairan; menu Dukungan tetap terlihat.
- [x] URL beranda, profil, indikator, proposal, LPJ, pengaturan diarahkan ke pencairan; halaman Forum Q&A, Pusat Bantuan dan Notifikasi tetap dapat dibuka.
- [x] Panduan Aplikasi tetap dapat dibuka dari menu akun; kartu dan tombol panduannya hanya mengarah ke pencairan serta Dukungan.
- [x] Dokumen sesuai, kosong, dan perlu revisi ditampilkan berbeda; catatan pemeriksa tampil pada dokumen yang perlu revisi.
- [x] PNK dengan `fillMode=admin` mengunggah revisi permohonan melalui formulir; versi 2 tersimpan dan status menjadi menunggu pemeriksaan.
- [x] Unggah surat kuasa yang sebelumnya kosong berhasil menjadi versi 1 dengan status menunggu pemeriksaan.
- [x] Admin melihat versi 2, identitas kampus pengunggah, dan catatan unggahan. Permintaan revisi ulang admin tampil kembali pada akun kampus.
- [x] Versi 1 tetap tersedia dan dapat diunduh (HTTP 200); tampilan versi lama diberi keterangan bahwa status mengacu dokumen terbaru.
- [x] Catatan internal contoh admin tidak muncul pada halaman maupun payload kampus.
- [x] Request browser sebagai kampus untuk unggah dokumen sesuai/menunggu, tiga jenis RAB, kampus lain, flag bertanda tangan, dan keputusan pemeriksaan ditolak server (HTTP 403).
- [x] Berkas `.exe` ditolak (HTTP 400), pesan kesalahan terlihat, pilihan berkas tetap ada agar pengguna bisa memperbaiki.
- [x] Request berkas kosong ditolak HTTP 400; berkas melebihi 40 MB ditolak HTTP 413.
- [x] RAB kampus tidak menampilkan input unggah atau tautan editor admin. Query `?butir=bayar` tidak membuka kontrol pembayaran admin.
- [x] Desktop dan mobile diperiksa. Pada viewport CSS 390 px, tidak ada overflow horizontal halaman; daftar dokumen tetap dapat digeser. Drawer mobile berisi pencairan serta Dukungan.
- [x] Akun ITK tanpa penetapan gelombang pertama melihat penjelasan “Pencairan belum tersedia” dan tautan Forum Q&A, tanpa dibukakan penerimaan baru.
- [x] Respons GET sengaja ditahan sebelum mengirim catatan melalui UI. Sebelum perbaikan, respons lama menghilangkan catatan baru dari tampilan; setelah penambahan nomor generasi pemuatan, catatan baru tetap terlihat saat respons lama dilepas. Catatan QA tetap tersimpan hanya di salinan lokal.

Bukti lokal: [desktop](../../.qa/login-kampus-pencairan-desktop-20260921.png), [mobile](../../.qa/login-kampus-pencairan-mobile-20260921.png). Screenshot memakai dokumen/komentar bertanda QA lokal, bukan hasil review dokumen sesungguhnya. Dua unggahan contoh dan catatan QA tersimpan hanya pada salinan lokal untuk diperiksa pengguna.

## Batas verifikasi

### Tambahan Beranda kampus

- Sesuai persetujuan pengguna berikutnya, login kampus kini menuju `/campus/dashboard`; menu Beranda dan panduannya dipulihkan khusus untuk progres pencairan. Halaman lain yang disembunyikan menuju Beranda, bukan dashboard indikator lama.
- Beranda menggunakan GET pencairan kampus sendiri: empat ringkasan status, prioritas tindakan yang mengikuti izin unggah, catatan revisi, tautan langsung ke butir, dan versi terbaru tiap dokumen. RAB/SK tidak menjadi tugas unggah; statusnya tetap terlihat pada panel PF.
- [x] Login preview PNK menuju Beranda dengan menu Beranda, Pencairan Dana, Dukungan.
- [x] Login ITK yang belum memiliki penetapan pencairan juga menuju Beranda, dengan keadaan kosong dan tautan Dukungan; kembali login PNK memuat data PNK tanpa membawa data ITK.
- [x] Hitungan aktual PNK saat QA: 1 selesai, 3 menunggu PF, 4 revisi, 2 belum ada. Tiga tindakan unggah (permohonan, kuitansi, rekening) mengecualikan RAB dan dokumen menunggu/disetujui.
- [x] Tombol tindakan pertama membuka `?butir=permohonan` dengan formulir Kirim revisi; daftar unggahan menyebut versi aktif serta status yang sama.
- [x] Tampilan desktop dan CSS viewport 390 px diperiksa; tidak ada overflow horizontal halaman. Drawer tetap memuat Beranda, Pencairan Dana, Dukungan.
- [x] Respons error 503 disimulasikan pada browser saja: pesan kegagalan terlihat, tombol Perbarui status berhasil memulihkan data setelah intersepsi dilepas.
- [x] Data semua dokumen selesai disimulasikan pada respons browser saja: tidak ada tombol tugas unggah dan pesan “Tidak ada dokumen yang perlu Anda unggah saat ini” tampil. Tidak ada perubahan status database untuk skenario ini.
- Bukti lokal: [desktop Beranda](../../.qa/beranda-kampus-desktop-20260921.png), [mobile Beranda](../../.qa/beranda-kampus-mobile-20260921.png).
- Review kode terpisah tidak menemukan isu actionable baru pada tambahan Beranda. `tests/campus-overview.test.ts` disiapkan, belum dijalankan melalui terminal.

### QA unggah pertama — kampus tanpa dokumen

- Akun Institut Teknologi Sumatera (ITERA), ID `chvh72efehjjrlw`, pada salinan lokal 8097. Sebelum QA seluruh slot memiliki 0 versi; enam dokumen unggah kampus berstatus `belum_ada`, `fillMode=admin`.
- Dari Beranda, tombol Lengkapi dokumen membuka PKS yang kosong. Formulir Kirim dokumen tersedia tanpa membutuhkan unggahan admin sebelumnya.
- PDF contoh `QA-LOKAL-ITERA-PKS-pertama-20260921.pdf` (613 byte, diberi teks QA lokal) dikirim melalui formulir sebagai kampus. Tersimpan sebagai satu-satunya versi, nomor 1, pengunggah ITERA, status `menunggu_review`.
- Setelah reload, versi 1 dan status Menunggu pemeriksaan tetap tampil; unduh berkas HTTP 200. Input unggah tidak muncul selama menunggu pemeriksaan.
- Beranda menampilkan PDF tersebut pada daftar unggahan; PKS hilang dari daftar tindakan, lima dokumen kosong lainnya tetap dapat dilengkapi. Admin lokal dapat membuka berkas versi 1 dari halaman pencairan ITERA.
- Bukti: [unggah pertama ITERA](../../.qa/itera-unggah-pertama-20260921.png). Berkas contoh tetap tersimpan hanya di salinan lokal; tidak ada perubahan kode aplikasi, data production, atau push dalam QA ini.

### Perbaikan pratinjau Excel macet

- File lokal `RAB DEB PNK.xlsx` tersedia (HTTP 200, 12.166.064 byte), bukan file hilang. Rentang lembar tercatat `A1:WWN186` dan `A1:WWD140`, meski isi aktual hanya sampai kolom AJ dan J. Konversi seluruh rentang ke HTML membuat jutaan sel dan membekukan tab.
- Pratinjau Excel dibatasi 500 baris × 50 kolom, termasuk rentang sel gabungan. Pemberitahuan batas tampil dan file asli tetap utuh untuk diunduh. Tidak mengubah RAB terkelola atau membuka unggah RAB.
- QA browser setelah perbaikan: lembar pertama berhasil tampil dengan 9.154 sel, pindah ke lembar kedua berhasil, zoom 110% bekerja, dan navigasi ke Forum Q&A tetap responsif.
- `tests/excel-preview.test.ts` ditambahkan untuk batas rentang besar/sel gabungan dan menjaga data sumber tidak berubah; belum dijalankan melalui terminal.

- Test suite, typecheck, lint, dan build terminal tidak dijalankan sesuai AGENTS.md. `tests/campus-upload.test.ts` disiapkan untuk aturan unggah, tetapi belum dieksekusi.
- OAuth Microsoft, deployment Cloudflare, dan penyimpanan produksi tidak diuji. Redirect OAuth diperbarui melalui pemeriksaan kode; browser QA menggunakan login preview lokal.
- Tidak mengubah skema PocketBase atau mekanisme transaksi/concurrency modul pencairan yang sudah ada.
- Aturan halaman yang disembunyikan adalah pembatasan navigasi, bukan pencabutan seluruh API modul lama. Batas mutasi unggah pencairan tetap diperiksa di server.
