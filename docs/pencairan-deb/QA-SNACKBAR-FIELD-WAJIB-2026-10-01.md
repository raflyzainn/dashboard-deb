# Snackbar, isian wajib, dan petunjuk pengguna baru

Pembaruan 5 Oktober 2026: atas permintaan pengguna, snackbar kini hilang otomatis setelah 5 detik; tombol X tetap tersedia. Lihat [QA panel penutup](QA-PANEL-PENUTUP-2026-10-05.md) untuk bukti browser dan batas pemeriksaan. Ketentuan penutupan manual di bawah merupakan riwayat.

Tanggal: 1 Oktober 2026. Target: frontend `127.0.0.1:5176`, PocketBase `127.0.0.1:8097`, branch `feat/pencairan-pocketbase-local`. Perubahan ini belum di-commit atau di-push.

## Masalah yang ditemukan

1. Pemeriksaan rekening menerima klik saat Nama di bank kosong. Server menolak dengan HTTP 400, tetapi pesan lokal berada di header yang sudah terlewat saat scroll.
2. Catatan revisi sempat dipakai sebagai pengganti nama di bank. Kedua isian mempunyai arti berbeda dan sekarang divalidasi terpisah.
3. Penyimpanan field pemeriksaan menandai data sebagai tersimpan sebelum permintaan berhasil. Keputusan pemeriksaan juga dapat berlanjut setelah penyimpanan gagal.
4. Snackbar halaman biasa berada di belakang dialog native. Menaikkan z-index saja tidak cukup.
5. Beranda hanya mengenali alur pengajuan baru dalam mode mockup. Pengajuan PocketBase mendapat daftar unggah dari alur lama, termasuk instruksi yang tidak cocok untuk dokumen yang dibuat aplikasi.
6. Panduan kampus masih menyatakan RAB hanya dapat dilihat. Instruksi itu tidak berlaku untuk pengajuan baru.
7. Notifikasi menyebut penyimpanan simulasi dalam browser; halaman gagal muat menyarankan izin penyimpanan browser meskipun masalah berasal dari server.

## Perilaku sekarang

- `src/lib/feedback.ts` menyediakan `reportError(message)`. Fungsi mengembalikan teks sehingga pesan dekat field dapat dipertahankan sekaligus ditampilkan sebagai snackbar.
- Layanan HTTP bersama meneruskan kegagalan ke snackbar: validasi server, izin, sesi, konflik, server bermasalah, timeout, koneksi, dan respons JSON yang tidak terbaca. Pesan validasi spesifik dari backend dipertahankan; pesan generik server diganti petunjuk bahasa Indonesia.
- Pemeriksaan sesi anonim dan pembatalan request karena pergantian akun tidak diperlakukan sebagai kegagalan tindakan pengguna.
- Root layout menangani native `invalid`, error JavaScript, serta Promise yang tidak tertangani. Detail internal tetap di console, pesan pengguna berisi tindakan pemulihan.
- `ErrorSnackbar.svelte` dipakai halaman dan dialog. CSS menyembunyikan salinan halaman saat dialog terbuka; snackbar dalam dialog dapat dilihat dan ditutup. Animasi menghormati `prefers-reduced-motion`.
- Error tidak hilang otomatis sebelum dibaca. Pengguna dapat menutupnya; mutasi HTTP yang berhasil membersihkan error sebelumnya.
- Validasi lokal/file juga memakai helper: pengajuan, RAB, pemeriksaan dokumen, lampiran, bukti transfer, pratinjau, login/password, akun, profil/kontak/lokasi, peta, grafik, dan salin teks. Verifikasi QR memberi snackbar ketika kode tidak ditemukan atau koneksi gagal.
- Nama di bank kosong atau hanya spasi: fokus kembali ke field, snackbar menyebut field, tidak mengirim keputusan. Catatan revisi tetap wajib untuk keputusan revisi dan tidak menggantikan nama di bank.
- Keputusan menunggu penyimpanan field berhasil. Gagal simpan tidak menandai field sebagai sudah tersimpan.

## Isian wajib

- Label yang membungkus `required` atau `aria-required="true"` mendapat bintang merah dari CSS bersama. Label terpisah pada formulir autentikasi diberi bintang eksplisit.
- Data Program: nama kegiatan, alamat, desa, kabupaten/kota, mentor, koordinator. Kecamatan tetap opsional sesuai validator yang ada.
- Administrasi: jenis rekening, identitas bank/rekening, penandatangan, tempat surat, nomor dan tanggal surat. Identitas/tanggal kuasa wajib saat jenis rekening kuasa dipilih.
- Bukti rekening/kop/surat kuasa ditandai wajib bila berkas yang diperlukan belum tersimpan; tidak mewajibkan unggah ulang berkas yang sudah ada.
- RAB: unggah Excel serta input jumlah/harga yang diedit ditandai wajib. Pencarian bukan field wajib.
- PKS: nomor kampus dan nomor PF wajib. Data surat/pengaturan PF memakai `aria-required` ketika diperlukan untuk penerbitan; penyimpanan draf tetap dapat dilakukan bertahap.
- Nama di bank wajib; Cabang tetap opsional. Catatan keputusan diberi keterangan bahwa kewajibannya hanya saat meminta revisi.
- Pembayaran mempertahankan `required` pada tanggal dan referensi transfer. Bukti transfer tetap opsional.
- Native validation menyebut field invalid pertama, sesuai fokus browser. Email salah format mendapat petunjuk bahasa Indonesia.
- Field wajib berarti harus lengkap sebelum tindakan akhir. Draf pengajuan tetap boleh belum lengkap, dan autosave tidak diblokir oleh tanda bintang.

## Petunjuk pengguna baru

Beranda pengajuan baru menampilkan satu tindakan sesuai status: lanjutkan pengajuan, pantau PF, perbaiki pengajuan, lengkapi tanda tangan, atau lihat pembayaran. Daftar unggah alur lama tidak ikut ditampilkan pada pengajuan baru. Beranda menyediakan tautan panduan.

Panduan menjelaskan tujuh langkah: SK/Data Program, RAB, Administrasi/PKS, pembuatan dokumen, pengiriman ke PF, revisi/tanda tangan, dan pembayaran. Ada penjelasan beda draf dan pengajuan terkirim, petunjuk nomor PKS PF, serta perbedaan pengajuan lama/manual. Pengajuan/pembayaran Tahap 2 masih belum tersedia; pembagian RAB Termin 2 sudah ada.

## QA yang benar-benar dijalankan

Melalui tool browser Playwright, bukan terminal:

- `scripts/qa/snackbar-required.playwright.js`: **41 pemeriksaan berhasil**. Cakupan: nama bank kosong/spasi, fokus, tidak ada request invalid, catatan revisi, bintang wajib vs opsional, HTTP 400/401/403/409/500, koneksi putus, JSON rusak, input tetap tersedia, tombol dapat dicoba ulang, snackbar mobile 390x844, modal, email invalid, field kampus, lima status Beranda, dan panduan tujuh langkah. Tidak ada uncaught page error dalam run terakhir.
- Kegagalan server/koneksi dalam skrip dipasang melalui interception browser. Tujuh request keputusan tidak mencapai backend. Lima status Beranda juga dipasang pada respons GET; ini membuktikan pemetaan UI, bukan mengulang transaksi persetujuan/pembayaran sebenarnya.
- Run terakhir mencegat mutasi pencairan di konteks kampus, termasuk pencatatan halaman terakhir. Run eksplorasi sebelumnya hanya menavigasi halaman kampus; metadata halaman terakhir dapat berubah otomatis. Tidak mengubah isian, keputusan, pembayaran, atau membuat akun/kampus QA baru.
- Lima belas halaman admin berhasil dimuat tanpa alert error atau uncaught JavaScript error: Beranda, direktori pencairan, Tahap 1, Tahap 2, antrean periksa, pengaturan pencairan, review kampus, daftar kampus, master indikator, peta, proposal, pengguna, forum, pusat bantuan, notifikasi. Ini pemeriksaan pemuatan halaman, bukan semua mutasi pada masing-masing fitur.
- Kegagalan GET pusat bantuan dipasang sebagai HTTP 500. Snackbar dan tombol Coba muat ulang muncul; setelah koneksi dipulihkan, tombol memuat kembali halaman dan error hilang.
- Verifikasi QR: kode tidak dikenal dan request jaringan yang digagalkan menampilkan snackbar yang berbeda dan sesuai penyebab.
- Detail kampus Fakfak berhasil dimuat. Enam modul autentikasi, lokasi/wilayah, serta profil/kontak berhasil dimuat melalui Vite di browser tanpa uncaught error. Pemeriksaan pemuatan ini tidak menggantikan type-check atau pengujian semua aksi komponennya.
- Screenshot `.playwright-mcp/snackbar-required-mobile.png` diperiksa secara visual: pesan terbaca di viewport, tombol tutup tersedia, Nama di bank bertanda merah, Cabang tidak ditandai wajib.

Belum dijalankan: lint, pengujian perangkat fisik, pengulangan seluruh transaksi bisnis di semua menu, dan deploy produksi. Tidak mengklaim semua kemungkinan kegagalan telah diuji. Perubahan ini tidak mengubah aturan bisnis atau mengaktifkan Tahap 2.

## Panduan untuk sesi berikutnya

- Jalankan skrip QA di atas melalui tool Playwright `browser_run_code_unsafe` dengan argumen `filename`, setelah stack lokal aktif. Skrip bergantung pada kampus Fakfak masih mempunyai rekening yang bisa diperiksa; jika keputusan sudah berubah, gunakan fixture QA terisolasi, jangan membatalkan keputusan pengguna.
- Saat menambah tindakan, gunakan layanan HTTP yang ada. Error lokal yang ditangkap harus memanggil `reportError`; jangan hanya menyetel teks inline atau console.
- Gunakan `required` pada input native untuk tindakan akhir. Untuk penyimpanan parsial, gunakan penanda yang tidak menolak draf dan validasi tindakan akhir sesuai aturan server.
- Label wajib harus cocok dengan validator. Jangan menandai field opsional atau seluruh checkbox sebagai wajib secara massal.
- Dialog native baru perlu memakai `ErrorSnackbar` di dalamnya. Modal bersama sudah menyediakannya.
- Jangan menyatakan semua fitur bebas error berdasarkan smoke test halaman. Catat perbedaan pengujian UI dengan request yang dicegat, transaksi PocketBase sebenarnya, dan validasi produksi.

## Validasi terminal sebelum push

Atas instruksi pengguna pada 1 Oktober 2026:

- `npm run build`: berhasil (exit 0), menghasilkan situs statis di `build` dengan mode `mockup`. Kompilasi ini bukan bukti deployment backend PocketBase. Build masih mengeluarkan warning aksesibilitas, reaktivitas, duplicate key RAB, dan ukuran chunk.
- `npm run check`: gagal, 141 error dan 11 warning pada 32 berkas. Contoh: duplicate key RAB, tipe Role finance, tipe buffer backend, dan ketidakcocokan kontrak layanan. Tidak menyatakan pemeriksaan tipe lulus.
- `npm test`: gagal memuat beberapa suite karena `import.meta.env.MODE` tidak tersedia dalam runner Node/tsx (`src/lib/data/demo/store.ts`). Baris ini dikonfirmasi juga ada pada HEAD sebelum perubahan ini. Proses yang tidak menyelesaikan suite kemudian dihentikan; tidak ada hasil kelulusan seluruh suite. Runtime mesin Node v25.5.0, sedangkan package meminta Node 22.x.
- `git diff --check`: berhasil tanpa kesalahan whitespace.
- Pengguna meminta push ke branch fitur GitLab dan GitHub. Validasi di atas belum membuktikan kesiapan merge ke production. Berkas Excel pengguna, env, dan data PocketBase tidak termasuk perubahan yang dikirim.

## Koreksi navigasi wajib — 2 Oktober 2026

Aturan terbaru pengguna: isian wajib pada langkah aktif harus lengkap sebelum
melanjutkan. Aturan ini menggantikan keterangan lama yang hanya membatasi
pengiriman akhir; penyimpanan draf parsial tetap diperbolehkan.

- CampusJourney memakai blocker dari validator pengajuan yang sudah ada untuk
  menonaktifkan Lanjut. Navigasi maju lewat menu samping diperiksa juga.
- Kembali dan peninjauan pengajuan terkunci tetap tersedia.
- Setelah RAB disimpan, snapshot dimuat sebelum mengevaluasi kelengkapan untuk
  berpindah ke Administrasi.
- Caption label Data Program, Administrasi, PKS dan RAB memiliki bintang inline.
  Kecamatan tetap opsional; unggahan yang sudah tersimpan tidak wajib diulang.
- Pada salinan video 5186, perekaman Playwright memperlihatkan Kabupaten/kota
  kosong membuat Lanjut nonaktif; klik RAB tetap berada di Data Program.
  Sesudah seluruh field wajib terisi, Lanjut aktif dan halaman RAB terbuka.
  Screenshot lengkap diperiksa: bintang berada setelah label tanpa duplikasi.
- Tool browser MCP gagal dibuka karena profil sedang digunakan sesi lain.
  Pengamatan di atas dilakukan dalam perekaman Playwright yang diminta pengguna.
  Skrip regresi untuk tool browser: scripts/qa/journey-required-navigation.playwright.js;
  skrip tersebut belum dijalankan. Test suite, check, lint dan build tidak dijalankan.
- Video revisi disimpan lokal di demo-videos; video, fixture dan database salinan
  tidak disertakan dalam commit kode.
- Perekaman lanjutan: RAB lengkap berhasil menuju Administrasi, Lanjut pada Administrasi kosong nonaktif, dan Kembali tetap berhasil menuju RAB.

## Revisi Administrasi menjadi halaman terpisah — 5 Oktober 2026

- Setelah RAB, alur kampus menjadi Rekening Penerima → Penandatangan Kampus → Identitas Surat dan Kop → PKS → Dokumen. Tiap langkah memiliki tampilan dan tautan navigasi sendiri.
- Surat kuasa berada pada Identitas Surat dan Kop dan hanya muncul untuk rekening pihak yang diberi kuasa, setelah data rekening dan penandatangan tersedia.
- Pembuatan, pratinjau, unduhan, dan pengajuan dokumen hanya tampil di Dokumen. PKS menyediakan isian nomor PKS kampus dan permintaan nomor PKS PF.
- Daftar kuning kelengkapan di halaman pengisian Administrasi dihapus. Lanjut dan navigasi maju memvalidasi langkah yang dilewati, menampilkan alert, dan tetap di halaman saat belum lengkap. Draf tetap dapat disimpan.
- Kunci tersimpan administrasi dan ringkasan dipertahankan untuk kompatibilitas tautan/draf lama, dengan label Rekening Penerima dan Dokumen. Penandatangan dan surat memiliki kunci langkah sendiri. Tidak mereset data pengguna.
- Branch berasal dari development; revisi label Foto Buku Rekening tetap berada di branch terpisah.
- Pemeriksaan dilakukan melalui pembacaan diff; QA browser belum dijalankan karena tool browser tidak tersedia. Tes terminal, check, lint, dan build tidak dijalankan sesuai instruksi proyek.

### Nomor PKS PF wajib disimpan admin — riwayat sebelum revisi placeholder

- Pengisian nomor PKS PF otomatis pada mode dummy dihapus. Nomor contoh lama dengan awalan PKS-PF/DUMMY/2026/ baru diakui setelah admin menyimpannya secara eksplisit. Nilai tersimpan dan arsip dokumen lama tidak dihapus.
- Validasi bersama menolak lanjut dari PKS, pembuatan dokumen baru, dan pengajuan jika nomor PF belum tersedia. Form admin dimulai kosong; permintaan nomor PF tetap tersedia pada kampus.
- Pemeriksaan melalui diff; interaksi browser dan tes terminal belum dijalankan.

## Pengecualian Data Program ke RAB — 5 Oktober 2026

- Instruksi terbaru pengguna menggantikan aturan 2 Oktober khusus perpindahan
  Data Program ke RAB: tombol Lanjut dan tab RAB tetap tersedia saat isian belum lengkap.
- Field Data Program tetap wajib sebelum mengirim pengajuan. Validasi langkah
  lain dan pengiriman akhir tetap berlaku.
- QA browser lokal 5176 melalui scripts/qa/journey-required-navigation.playwright.js
  berhasil untuk tombol Lanjut dan tab RAB dengan enam field wajib dikosongkan
  pada respons browser. Mutasi dicegat; data PocketBase tidak diubah.
- Pemeriksaan hanya mencakup perpindahan tersebut. Tes, check, lint, dan build
  terminal tidak dijalankan.
- Menjelang PR, pengguna mengizinkan build: `npm run build` berhasil (exit 0)
  pada salinan kode yang masuk PR, mode `mockup`, menghasilkan situs statis di
  `build`. Warning awal tsconfig hasil generate pada salinan baru dan ukuran
  chunk di atas 500 kB tetap tercatat. Test suite, check, dan lint tidak dijalankan.

## Jeda snackbar simpan draf — 5 Oktober 2026

- Pesan sukses simpan draf dibatasi maksimal sekali setiap 20 detik selama
  komponen pengajuan terbuka. Batas dihitung dari pesan sukses terakhir yang
  ditampilkan; penyimpanan otomatis tetap berjalan dan error tidak dibatasi.
- QA browser melalui `scripts/qa/draft-snackbar-cooldown.playwright.js` berhasil:
  pesan pertama tampil, simpan kedua berhasil tanpa pesan berulang, pesan tampil
  kembali setelah jam browser dimajukan 21 detik, dan error tetap langsung tampil.
  Mutasi pengajuan dicegat sehingga data PocketBase tidak diubah.
- Build ulang kode PR setelah perubahan jeda berhasil (exit 0), mode `mockup`,
  menghasilkan situs statis; warning ukuran chunk di atas 500 kB tetap ada.


### Placeholder nomor PKS PF — 5 Oktober 2026

- Nomor PKS PF yang belum tersedia pada isi surat menggunakan “masih menunggu surat dari PF”. Placeholder tidak ditampilkan sebagai keterangan pada halaman PKS atau Dokumen. Kampus wajib mengirim permintaan nomor PKS PF terlebih dahulu; setelah terkirim, kampus dapat melanjutkan ke Dokumen, membuat/pratinjau/mengunduh dokumen, dan mengajukan selama persyaratan lain sudah lengkap. Aturan ini menggantikan kewajiban menunggu nomor PF pada revisi sebelumnya.
- Teks yang sama digunakan dalam isian template, metadata dokumen, properti pencairan, dan riwayat pengajuan. Nomor asli pada data admin tetap kosong sampai diisi admin; nomor dummy lama yang belum dikonfirmasi memakai placeholder.
- Validasi bersama memeriksa permintaan nomor PF pada navigasi, pembuatan dokumen, dan pengajuan. Permintaan yang sudah tersimpan tidak perlu dikirim ulang. Jika nomor asli sudah tersedia, permintaan tidak diperlukan. Saat admin menyimpan nomor sebenarnya, alur revisi yang sudah ada meminta kampus membuat ulang dokumen dan mengajukan kembali. Arsip versi sebelumnya dipertahankan.
- Pemeriksaan kode: penelusuran validasi bersama, sumber data template, penyimpanan pengajuan, dan alur pembaruan nomor oleh admin. QA browser belum dilakukan karena tool browser tidak tersedia. Tes terminal, check, lint, dan build tidak dijalankan sesuai instruksi proyek.

### Perbaikan sidebar kampus — 5 Oktober 2026

- Screenshot pengguna menunjukkan label dan status sidebar melebar keluar kolom 240 px. Pada desktop, status kini ditempatkan di bawah label; label panjang dapat membungkus dalam kolom. Navigasi horizontal mobile tetap memakai tata letak sebelumnya.
- Pratinjau pengajuan yang sudah terkirim mengambil berkas tersimpan. Perubahan placeholder tidak menulis ulang arsip; dokumen perlu dibuat ulang melalui alur revisi untuk memakai aturan terbaru.
- Penyebab ditelusuri melalui kode CSS sidebar dan pembacaan berkas pada engine. Hasil visual belum diverifikasi melalui browser karena tool tidak tersedia; tes terminal tidak dijalankan.

### Salinan PKS dummy lama dan status sidebar

- Label Menunggu PF pada sidebar alur kampus dihapus; status pengajuan dan indikator titik tetap tersedia.
- Nomor dengan awalan PKS-PF/DUMMY/2026/ diperlakukan sebagai nomor simulasi, termasuk yang pernah disimpan admin. Dokumen baru menggunakan placeholder sampai tersedia nomor sebenarnya.
- Pada mode dummy, pratinjau/unduhan PKS tersimpan yang belum selesai atau dibayar mengganti nomor simulasi dengan “masih menunggu surat dari PF” pada salinan yang disajikan. Isi arsip tersimpan dipertahankan. Dokumen final dan berkas bertanda tangan tidak diubah. Ini memperbarui perilaku pratinjau lama yang dijelaskan sebelumnya.
- Pengajuan baru tetap memerlukan permintaan nomor PF jika nomor sebenarnya kosong. Pengajuan lama berstatus menunggu tidak dibatalkan otomatis.
- Pemeriksaan melalui diff dan penelusuran alur kode; QA browser belum tersedia, tes terminal tidak dijalankan.

### Sinkronisasi revisi kedua dengan development

- Branch feat/administrasi-dropdown digabungkan dengan development 5e6fbf6: lokasi program bertingkat dan alamat lengkap, perpindahan Data Program ke RAB saat belum lengkap, serta jeda notifikasi simpan draf 20 detik.
- Halaman administrasi terpisah, permintaan nomor PF sebelum lanjut, placeholder dalam surat, serta perbaikan sidebar dipertahankan.
- Konflik diselesaikan melalui pemeriksaan kode dan diff. QA browser belum dilakukan karena tool tidak tersedia. Build, check, lint, dan test suite tidak dijalankan pada sinkronisasi ini.

### Submenu Administrasi

- Navigasi kampus mengelompokkan Rekening Penerima, Penandatangan Kampus, Identitas Surat dan Kop, PKS, dan Dokumen di bawah tombol Administrasi yang dapat dibuka/tutup.
- Kelompok otomatis terbuka saat pengguna masuk ke salah satu halaman tersebut, termasuk melalui tombol Lanjut dan tautan langsung. Membuka/menutup kelompok tidak berpindah halaman. Pemilihan submenu tetap memakai navigasi dan validasi yang ada.
- Tombol memakai aria-expanded dan aria-controls; submenu tertutup disembunyikan dari fokus keyboard. Nama panjang dapat membungkus pada desktop dan mobile.
- Pemeriksaan melalui pembacaan kode dan diff. QA browser belum dilakukan karena tool browser tidak tersedia; build, check, lint, dan tes terminal tidak dijalankan.

- Tampilan submenu mengikuti referensi pohon navigasi: chevron di kiri judul Administrasi, ikon dokumen, garis vertikal, dan anak menu menjorok. Teks menu memakai biru tua #0b2545 dengan latar aktif tipis; warna titik status tetap mengikuti status. Pemeriksaan visual browser belum dilakukan.

- Penyesuaian referensi terbaru: tampilan baris kembali ke label kiri/status kanan dan latar aktif putih. Titik draf/menunggu memakai biru tua #2868ad; Administrasi memakai titik yang sama dengan chevron di kanan untuk membuka submenu. Ikon dokumen pada judul dihapus. Pemeriksaan baru sebatas kode, belum QA browser.

### Validasi sebelum publikasi revisi Administrasi

- Build npm run build berhasil (exit 0), mode mockup, menghasilkan situs statis di build. Warning ukuran chunk lebih dari 500 kB tetap ada.
- Seluruh commit development 5e6fbf6 sudah masuk. Diff diperiksa. QA browser oleh agen belum dilakukan karena tool tidak tersedia; test suite, check, dan lint tidak dijalankan.


### Gabungan PR Administrasi dan revisi bagian ? 6 Oktober 2026

- Submenu Administrasi memakai izin edit pada kategori Administrasi yang sudah dipakai alur revisi; bagian lain tetap hanya dapat dilihat.
- Nomor PKS PF yang belum tersedia memakai placeholder pada dokumen dan riwayat setelah permintaan dikirim, sementara isian admin untuk nomor sebenarnya tetap kosong.
- Build dan QA browser untuk gabungan ini belum dilakukan saat catatan ini ditulis.
