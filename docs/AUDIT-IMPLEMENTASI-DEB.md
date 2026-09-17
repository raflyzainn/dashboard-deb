# Audit implementasi terhadap dua dokumen Word

> **Status aktif P4 lokal (10 September 2026):** master kampus/lokasi dan indikator bersama tersedia. Baseline/target sama untuk seluruh kampus; aktual/catatan tetap per kampus. P1 masih BELUM. Acuan aktif: [POCKETBASE-P4.md](POCKETBASE-P4.md). Uraian P0/P2/P3 atau prototype di bawah dipertahankan sebagai riwayat; pernyataan mock/Dexie/read-only lama bukan kondisi runtime sekarang.

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

Tanggal pemeriksaan: 8 September 2026.

Catatan lanjutan: matriks di bawah merekam kondisi sebelum permintaan fitur lanjutan pada hari yang sama. Setelah audit, perbandingan teks proposal, kategori dan pencarian isi jawaban forum, serta halaman notifikasi lokal telah ditambahkan. Lihat `PERBANDINGAN-PROPOSAL.md`, `KATEGORI-FORUM.md`, dan `NOTIFIKASI.md` untuk implementasi terbaru. Ekspor rekap dan backend operasional masih belum tersedia.

## Ruang lingkup dan kesimpulan

Audit ini memeriksa proyek `dashboard-deb` terhadap dua dokumen yang ada di root proyek:

1. `Meeting_Recap_and_Web_App_System_Brief.docx`, brief berdasarkan rapat.
2. `DEB_Transformation_Lab_2026_Meeting_Recap_and_Web_App_System_Brief.docx`, versi 2.0 yang menambahkan konteks ToR resmi.

Kedua dokumen merujuk pada sistem yang sama. Dokumen kedua menjadi acuan fakta program, kerangka DEB, roster kampus, dan roadmap; perilaku aplikasi ditelusuri melalui FR01 sampai FR15 pada kedua dokumen. Teks, tabel, serta gambar kerangka indikator dan roadmap yang tertanam dalam dokumen terbaru diperiksa. Audit tidak memverifikasi keaslian ToR/transkrip di luar dokumen yang tersedia.

Proyek sudah mengimplementasikan banyak alur sebagai prototype interaktif. Seluruh data dan PDF tersimpan di IndexedDB browser melalui Dexie. Login merupakan pemilihan peran demo, bukan autentikasi akun nyata. Pertukaran data Kampus dan Admin hanya dapat didemonstrasikan dalam penyimpanan browser/origin yang sama. Implementasi ini belum merupakan sistem operasional untuk 40 kampus.

Label **Sudah** di bawah berarti alur tersedia pada prototype lokal. **Sebagian** berarti ada implementasi awal tetapi bagian perilaku yang diminta belum tersedia. **Belum** berarti implementasi fitur tidak ditemukan. Label ini bukan persentase kesiapan produksi atau pengesahan kebutuhan oleh stakeholder.

## Matriks FR01 sampai FR15

| ID | Kebutuhan | Status prototype | Temuan dan batasan |
|---|---|---|---|
| FR01 | Akun Kampus dan Admin PF | Sebagian | Dua peran, penjagaan route, dan pembatasan data pada service tersedia. Kampus selalu Universitas Contoh. Belum ada 40 akun nyata, kredensial, provisioning, reset password, deaktivasi, maupun otorisasi server. |
| FR02 | Tampilan posisi kampus terhadap target dan gap | Sebagian | Dashboard dan tabel menampilkan baseline, target, aktual, progres, serta indikator yang belum tercapai. Belum ada nilai selisih/gap eksplisit; target masih simulasi. |
| FR03 | Input dan pembaruan indikator | Sudah | Kampus dapat mengubah angka aktual dan catatan berulang kali; angka negatif/tidak hingga ditolak. Input masih terbatas pada indikator numerik dummy, belum kamus data resmi. |
| FR04 | Perbandingan dengan target DEB yang disahkan | Sebagian | Ada perbandingan aktual/target dan status tercapai. Belum memakai kerangka resmi, tipe ada/tidak ada, rentang, aturan per level, dan aturan nilai kosong. Status di bawah target berupa badge netral, belum merah sebagaimana contoh rapat. Semantik warna tetap perlu disepakati. |
| FR05 | Ringkasan PF untuk 40 kampus | Sudah | Dashboard agregat, daftar/detail kampus, pencarian, filter perlu tindak lanjut dan belum mengunggah proposal tersedia. Seluruh 40 kampus fiktif; kategori program resmi belum tersedia. |
| FR06 | Upload proposal berkelanjutan | Sudah | Kampus dapat mengunggah PDF maksimal 10 MB dengan catatan perubahan, tanpa cutoff aplikasi. Ada validasi ekstensi, MIME bila tersedia, ukuran, dan signature PDF. Format serta batas ukuran ini pilihan prototype, belum aturan proposal resmi. Penyimpanan masih lokal. |
| FR07 | Riwayat versi proposal | Sudah | Upload menghasilkan nomor versi baru; versi lama tetap dapat dilihat dan diunduh setelah refresh. Catatan perubahan diisi manual. |
| FR08 | Q&A bersama dan asinkron | Sudah | Kampus membuat pertanyaan, Admin memberi atau memperbarui satu jawaban resmi, kedua peran dapat membaca forum bersama setelah login demo. Belum ada diskusi banyak balasan atau balasan antarkampus; detail tersebut masih terbuka dalam brief. |
| FR09 | Pencarian pertanyaan dan jawaban | Sebagian | Pencarian forum hanya memeriksa judul dan isi pertanyaan, belum teks jawaban Admin. Pencarian FAQ sudah mencakup pertanyaan dan jawaban, tetapi hanya untuk konten yang telah dikurasi ke FAQ. |
| FR10 | FAQ dan urutan popularitas | Sudah | Promosi jawaban ke FAQ, tambah/edit/hapus/urut FAQ, like unik per kampus, dan pengurutan forum paling populer tersedia. Ini fitur opsional dalam brief. |
| FR11 | Feedback koreksi data | Sudah | Admin memberi catatan atau meminta revisi pada indikator kampus tertentu; feedback dipisahkan dari forum. Riwayat feedback tersedia. Status dan rincian ticket masih pilihan prototype. |
| FR12 | Siklus review dan revisi ulang | Sudah | Perubahan indikator mengubah feedback revisi terbuka menjadi `responded`; Admin melihat aktual/catatan terbaru, menutup feedback, atau membuat permintaan revisi baru. Belum menyimpan snapshot nilai sebelum/sesudah atau percakapan respons tersendiri. |
| FR13 | Notifikasi kepada kampus dan PF | Sebagian | Badge revisi, daftar aktivitas, dan toast tersedia. Belum ada event notifikasi per penerima, pusat notifikasi, status dibaca, pengiriman email, atau pemberitahuan ke perangkat pengguna lain. Badge revisi bukan notifikasi khusus bahwa respons baru diterima. |
| FR14 | Rekap yang dapat diunduh | Belum | Ringkasan dashboard tersedia, tetapi tidak ada aksi maupun pembentuk file ekspor rekap. Unduh PDF proposal tidak memenuhi kebutuhan unduh rekap. Format, kolom, filter, dan periode ekspor belum disepakati dalam brief. |
| FR15 | Akses website lewat ponsel | Sudah | CSS responsif, drawer navigasi, dan penyesuaian forum/form tersedia. Tes pada viewport 390 × 844 memeriksa navigasi dan overflow. Belum membuktikan tugas Q&A lengkap di perangkat Android/iOS nyata atau seluruh browser ponsel. |

## Ketidaksesuaian terhadap konteks resmi pada dokumen terbaru

| Konteks resmi | Kondisi implementasi | Tindak lanjut |
|---|---|---|
| Identitas DEB Transformation Lab 2026 | Aplikasi lebih banyak memakai Digitalisasi DEB / Program DEB Putih dan periode 2026. | Selaraskan identitas dan konteks program jika tampilan akan dipakai untuk Transformation Lab. |
| Roster 40 perguruan tinggi | Seed memakai Universitas Contoh dan Universitas Simulasi 02 sampai 40. | Masukkan roster resmi dari lampiran A. Data operasional kampus belum tersedia. |
| 24 kampus Tahun Ketiga dan 16 Tahun Kedua | Model `Campus` belum memiliki angkatan/tahun pendampingan. | Tambahkan metadata cohort sesuai roster. |
| 12 Survive, 24 Recoverable, 4 Pivot | Belum ada field kelompok, badge, filter, atau rekap kelompok. | Tambahkan kelompok program setelah pemetaan kampus dikonfirmasi; jumlah kelompok tidak cukup untuk menebak anggotanya. |
| DEB Putih, Biru, Hijau, Siap Exit | Belum ada model level maupun matriks target per level. | Representasikan level terpisah dari kelompok Survive/Recoverable/Pivot. Aturan penentuan level perlu data resmi. |
| Kerangka indikator DEB Pertamina | Seed berisi 30 indikator generik dalam Tata kelola, Lingkungan, Pemberdayaan. | Ganti dengan kamus data resmi: antara lain kesiapan SDM/lembaga, wisata energi, pangan berkelanjutan, pesisir modern, dan kebutuhan program EBT. |
| Jenis data resmi beragam | `CampusIndicator` hanya memakai angka baseline/target/current dan catatan. | Rancang dukungan tipe ketersediaan, rentang, satuan, periode, serta aturan keberlakuan indikator menurut petunjuk resmi. |
| Mengetahui perubahan sejak pembaruan sebelumnya | Nilai dan catatan ditimpa; aktivitas hanya mencatat pesan umum dan dibatasi 200 entri. | Riwayat nilai sebelum/sesudah belum ada. Detail snapshot dan retensinya tetap keputusan terbuka. |
| Roadmap September sampai Desember 2026 | Pembaruan berulang dan versi proposal mendukung sebagian alur, tetapi tidak ada milestone, kelompok percepatan, atau laporan per periode. | Selaraskan monitoring/reporting dengan tahapan pendampingan. Kalender, pengingat otomatis, dan modul mentoring khusus belum menjadi fitur wajib yang disepakati. |

### Rumus progres perlu perhatian khusus

`src/lib/domain.ts` menghitung `min(current / target * 100, 100)` per indikator, kemudian merata-ratakannya sebagai progres kampus. Dashboard menampilkan hasil sebagai Progres DEB Putih dan rata-rata progres seluruh kampus.

Kedua brief tidak menetapkan persentase kesiapan gabungan yang resmi; dokumen terbaru menegaskan agar tidak menciptakan composite score tanpa persetujuan program. Rumus ini sudah berfungsi dan konsisten dengan seed, tetapi hanya sah sebagai ilustrasi prototype yang diberi label simulasi. Kelulusan tes rumus tidak membuktikan kesesuaian dengan kriteria DEB resmi. Jangan memakai angka itu untuk menyatakan kelayakan naik kelas sebelum aturan disahkan.

## Yang belum tersedia untuk operasional

- Autentikasi nyata dan satu akun per kampus beserta pengelolaan akun.
- Penyimpanan database/file bersama lintas pengguna dan perangkat.
- Otorisasi server yang menegakkan kepemilikan data dan berkas.
- Data kampus, indikator, target, satuan, periode, dan validasi resmi.
- Ekspor rekap serta notifikasi yang dirutekan kepada penerima.
- Mekanisme backup/pemulihan, audit perubahan yang memadai, serta monitoring operasional; tidak ditemukan implementasinya dalam source yang diperiksa.

`docs/POCKETBASE.md` merupakan rancangan transisi. Keberadaan dokumen tersebut tidak berarti integrasi PocketBase sudah aktif. Adapter Cloudflare tersedia dalam proyek, tetapi deployment aktif dan kesiapan operasional tidak diverifikasi oleh audit ini.

## Hal yang belum diputuskan, bukan otomatis kekurangan implementasi

- Akun DMM, tambahan akun dosen, dan akses langsung Holding.
- Impor Excel; rapat menyebut Excel sebagai sumber, belum menetapkan fitur impor.
- Balasan antarkampus, forum anonim, moderasi, lampiran, dan aturan edit/hapus pertanyaan.
- Editor Word di browser, pembuat proposal otomatis, AI penulisan, perbandingan dokumen otomatis, dan rollback versi.
- Reminder bulanan, tenggat ticket, kalender mentoring, serta instrumen digital khusus Social Mapping, ToC, dan IKM. Kegiatan program disebut, tetapi tidak otomatis berarti masing-masing harus menjadi modul aplikasi.
- Format ekspor, cutoff laporan, template proposal, retensi, dan saluran notifikasi. Fitur ekspor/notifikasi diminta, rincian implementasinya masih terbuka.

## Bukti kode

Path relatif terhadap root proyek:

| Bagian | Lokasi bukti |
|---|---|
| Model data dan kontrak service | `src/lib/types.ts` |
| IndexedDB, isolasi data demo, mutasi indikator, feedback, upload, Q&A, FAQ | `src/lib/data/service.ts` |
| Login dan sesi demo | `src/lib/state.svelte.ts`; `src/routes/login/+page.svelte` |
| Penjagaan route berdasarkan peran | `src/routes/(app)/+layout.svelte` |
| 40 kampus dan 30 indikator simulasi | `src/lib/data/seed.ts` |
| Rumus progres | `src/lib/domain.ts` |
| Dashboard dan detail kampus | `src/routes/(app)/_components/Dashboard.svelte`; `Campuses.svelte`; `src/lib/components/CampusTable.svelte` |
| Input, target, status, feedback dan review | `src/routes/(app)/_components/Indicators.svelte` |
| Upload, versi, preview dan unduh PDF | `src/routes/(app)/_components/Proposals.svelte` |
| Forum, pencarian pertanyaan, like dan popularitas | `src/routes/(app)/_components/Forum.svelte` |
| FAQ dan pencarian isi jawaban FAQ | `src/routes/(app)/_components/Faq.svelte` |
| Badge revisi, label simulasi dan drawer | `src/lib/components/Shell.svelte` |
| Layout responsif | `src/app.css` |
| Rencana backend, belum implementasi | `docs/POCKETBASE.md` |

## Verifikasi yang dijalankan

- `npm test`: 10 tes lulus. Mencakup seed, progres, pembatasan data, revisi, validasi, versi PDF, FAQ, persistensi dan reset terisolasi.
- `npm run check`: 0 error, 0 warning dari svelte-check.
- `npm run test:e2e`: 5 tes Playwright lulus, menggunakan Microsoft Edge headless dan konteks data dummy. Mencakup alur lintas peran, PDF, forum/FAQ, persistensi, route, navigasi mobile, serta kegagalan penyimpanan.

Tes tersebut memverifikasi prototype lokal. Tidak ada verifikasi autentikasi produksi, sinkronisasi lintas perangkat, pengiriman notifikasi, ekspor rekap, rumus bisnis resmi, atau deployment aktif. Audit tidak mengubah kode fitur.

## Urutan tindak lanjut yang disarankan

1. Selaraskan data/model dengan brief terbaru, terutama roster, kelompok, level, kamus indikator, dan batas rumus progres simulasi.
2. Lengkapi kekurangan fitur yang sudah jelas: pencarian isi jawaban, gap indikator sesuai aturan, dan ekspor rekap setelah isi/format ditentukan.
3. Bangun autentikasi serta database/file bersama dengan otorisasi server.
4. Tambahkan notifikasi dua arah dan rincian siklus feedback sesuai ruang lingkup rilis yang dipilih.
5. Uji kembali alur dengan data resmi, beberapa akun terpisah, dan perangkat ponsel yang menjadi target.
