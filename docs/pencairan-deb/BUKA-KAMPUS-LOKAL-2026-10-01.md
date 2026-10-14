# Pembukaan Tahap 1 untuk kampus lokal

Atas permintaan pengguna, 17 kampus yang belum memiliki pencairan Termin 1 dibuka pada PocketBase lokal 8097. Masing-masing mendapat SK simulasi Rp75.000.000 (7.500.000.000 sen). Nomor SK berawalan `SK-DUMMY-LOKAL`; catatan menegaskan bukan SK resmi. Tidak ada file SK palsu yang dibuat atau keputusan persetujuan otomatis.

## Perubahan

- `fundedWave=1`, `fillMode=campus`. Tahun program sebelumnya kosong diberi `kedua` untuk simulasi lokal; perlu konfirmasi sebelum penggunaan nyata.
- Pengajuan `submissionStatus=draf`, Tahap 1, slot dokumen kosong, tanpa versi RAB maupun berkas administrasi/PKS.
- Data Program memakai pemetaan `ensureJourney` yang sudah ada. Alamat, lokasi, mentor, dan koordinator yang tersedia digunakan. Profil program asli tidak diubah. Nama kegiatan hanya mengambil `programTitle` jika tersedia; narasi panjang `description` tidak dianggap nama kegiatan.
- Jenis rekening dan tanggal PKS memakai default alur yang sudah ada. Nomor rekening, penandatangan, nomor surat, nomor PKS, serta berkas tetap kosong.
- Kampus yang sebelumnya sudah memiliki pengajuan tidak direset. Tidak ada collection tambahan atau perubahan produksi.

## Cara kerja dan pemulihan

Perintah maintenance: `node --import tsx scripts/pocketbase/journey-local.mjs --open-unopened`.

Memakai pengaman instance lokal yang sudah ada, helper KINDS/ensureJourney, dan satu batch transaksional. Target hanya kampus tanpa pengajuan Termin 1. Skrip menolak jika target ternyata sudah memiliki SK, sehingga tidak menimpa alokasi lama. Pengulangan tidak mereset pengajuan yang telah dibuat.

Salinan record kampus sebelum perubahan dan daftar record yang dibuat disimpan pada `.local/pocketbase/maintenance/open-unopened-2026-10-01T01-24-14.226Z/before-and-created.json`. `applied.json` menandai batch berhasil. Ini manifest pemulihan perubahan data, bukan backup penuh baru. Jangan menghapus record dari manifest bila pengguna sudah mulai mengisi pengajuan tersebut; pemulihan perlu meninjau dependensi baru terlebih dahulu.

## QA browser

- Login Universitas Pertamina (`campus-006`): halaman Pencairan terbuka, SK Rp75 juta terlihat.
- Alamat Data Program sesuai profil yang sudah ada; rekening/nomor PKS/berkas kosong.
- RAB membuka langkah Upload Excel, diikuti Periksa 100%, Atur Termin 1, dan Periksa Termin 2. Petunjuk total upload Rp75 juta tampil. Tidak melakukan upload agar data awal tetap kosong.
- Dari sesi admin, GET pengajuan dan RAB untuk seluruh 17 kampus membuktikan nilai SK sama, status draf, rekening/nomor PKS/berkas kosong, dan nol versi RAB. Hasil: 17/17.
- Bentuk pemeriksaan tersimpan di `scripts/qa/pocketbase-local-unopened.playwright.js`; jalankan hanya melalui tool browser dengan sesi admin. Pemeriksaan keadaan kosong tidak lagi relevan setelah kampus mulai mengisi.
- Build, typecheck, dan test terminal tidak dijalankan. Tidak commit/push.

## Perapian login lokal

Dropdown akun dengan nama panjang sempat melebarkan kolom grid sehingga dropdown dan tombol keluar dari kartu. Pada `src/routes/login/+page.svelte`, kolom dibatasi dengan `min-w-0`, `grid-cols-1`, dan select selebar kontainer; label panjang dipotong pada tampilan terpilih. Komponen tombol dan mekanisme login tetap digunakan.

QA Playwright pada lebar 1440, 768, 390, dan 320 piksel: tidak ada overflow halaman, dropdown/tombol berada di dalam kartu dengan lebar sejajar. Login Universitas Pertamina berhasil menuju `/campus/dashboard`. Screenshot lokal: `.playwright-mcp/login-local-mobile-fixed.png`.

## Kelompok dropdown akun

### File contoh SK Rp75 juta

`static/contoh-rab/04_RAB_75_Juta.xlsx` tersedia untuk pengujian kampus dengan SK dummy Rp75 juta. Berisi lima item, rumus subtotal/total, serta petunjuk pembagian Rp52,5 juta dan Rp22,5 juta melalui aplikasi. Harga hanya simulasi. File contoh lama Rp20 juta tetap dipertahankan. Parser Excel aplikasi diuji melalui tool browser dan membaca lima item dengan total Rp75 juta; rumus memiliki hasil cache untuk pembacaan awal. LibreOffice tidak tersedia pada lingkungan ini; cache formula sederhana dihitung saat pembuatan, Excel diatur menghitung ulang saat dibuka. Tidak mengunggah ke record kampus agar draf pengguna tetap utuh.

Login lokal memakai optgroup native: **Sudah ada data pencairan**, **Pengajuan masih kosong**, dan **Admin**. Server menentukan kelompok berdasarkan keberadaan versi RAB, versi dokumen selain SK, nominal pengajuan/pembayaran, status sudah diajukan/revisi/selesai, berkas pengajuan, atau isian administrasi/nomor surat. SK dummy dan Data Program saja tidak dianggap pengajuan terisi. Data diperiksa ulang saat daftar akun dimuat, bukan daftar nama kampus yang dikunci di UI. Akun dummy yang tidak menyediakan metadata ini tetap berada di kelompok Akun kampus.

QA browser: ditemukan 24 akun pada kelompok terisi, 19 akun pada kelompok kosong, dan 1 admin (jumlah akun, bukan kampus). Universitas Pertamina masuk kelompok kosong dan akun QA 901 masuk terisi. Pada lebar 390 piksel tidak ada overflow; pemilihan Universitas Pertamina berhasil login. Keanggotaan dapat berubah setelah data kampus diisi. Belum build/test terminal atau push.

### Kelompok tetap setelah kampus mulai mengisi

Mengikuti koreksi pengguna, kategori login sekarang mengikuti pembagian awal sebelum uji pengisian. Kampus yang dibuka kosong oleh provisioning lokal ditandai SK-DUMMY-LOKAL/2026/ pada SK dan tetap pada kelompok awal walaupun kemudian mengunggah RAB, mengisi administrasi, atau mengajukan. Pengelompokan tidak lagi dihitung dari aktivitas pengajuan. Tidak ada data pengajuan yang dihapus atau dipindahkan. Uraian pengelompokan dinamis di atas merupakan perilaku sebelumnya dan telah digantikan.

QA browser: Sorong yang sudah mengunggah RAB dan mengajukan tetap berada di kelompok awal kosong, bersama Universitas Pertamina. Kelompok berdasarkan asal provisioning kini 26 akun lama/QA, 17 akun kampus yang dibuka kosong, 1 admin. Hitungan tidak sama dengan snapshot klasifikasi aktivitas sebelumnya (24/19), karena kategori kini menunjukkan asal provisioning, bukan kelengkapan aktual. Build tidak dijalankan dan perubahan belum dipush.
