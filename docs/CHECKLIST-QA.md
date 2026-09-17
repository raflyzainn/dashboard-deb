# Checklist QA Digitalisasi DEB

Gunakan checklist ini untuk pengujian manual sebelum rilis. Semua butir sengaja belum ditandai: hasil pengujian lokal sebelumnya tidak otomatis berlaku pada deployment yang akan dirilis.

## Identitas pengujian

- Tanggal:
- Penguji:
- Branch / commit:
- URL frontend:
- URL / instance PocketBase:
- Lingkungan: lokal / staging / production
- Browser dan perangkat:
- Akun yang digunakan: Admin, Kampus A, Kampus B (tulis nama kampus saja; jangan mencatat password atau token).

## Cara menandai

- `[ ]` = belum diuji.
- `[x]` = lulus, hasil aktual sesuai harapan.
- Jika gagal, biarkan `[ ]` dan tambahkan `GAGAL — BUG-01` di akhir butir. Catat detailnya pada tabel temuan.
- Jika terhalang konfigurasi/data, tambahkan `TERBLOKIR — alasan`.
- Jika tidak berlaku, tambahkan `N/A — alasan`, jangan tandai sebagai lulus.
- Simpan screenshot atau hasil pemeriksaan sebagai bukti. Tutupi email pribadi, token aktivasi, cookie, dan informasi rahasia.

Uji perubahan data, email, dan penghapusan memakai akun/data uji di staging yang terpisah. Untuk pengiriman eksternal, gunakan alamat penerima uji yang disepakati. Jangan menjalankan seed/reset pada database operasional.

## 1. Data awal dan lingkungan

- [ ] Frontend terhubung ke instance PocketBase yang memang dituju; URL, data, dan lingkungan tidak tertukar.
- [ ] Jumlah kampus sesuai roster yang disepakati: 40 kampus untuk roster saat ini. Nama dan singkatan dicocokkan satu per satu, bukan hanya jumlahnya.
- [ ] Tidak ada entri tambahan “QA P4 - Kampus pengujian lokal” pada roster operasional.
- [ ] Data contoh/QA, proposal simulasi, forum contoh, dan indikator simulasi sudah dipisahkan dari data operasional sebelum go-live.
- [ ] Baseline, target, satuan, kategori, rumus progres, dan ambang kategori peta sudah disetujui pemilik program.
- [ ] Profil, wilayah, dan koordinat kampus telah divalidasi; lokasi perkiraan dikenali sebagai perkiraan.
- [ ] Pengujian memakai build/commit yang sama dengan kandidat rilis.

## 2. Login dan sesi

- [ ] Email/password akun aktif yang benar membawa pengguna ke dashboard sesuai role.
- [ ] Password salah ditolak dengan pesan yang jelas tanpa membocorkan detail akun.
- [ ] Akun belum aktif atau dinonaktifkan tidak dapat masuk.
- [ ] Refresh dan membuka tautan langsung tetap mempertahankan sesi yang sah.
- [ ] Logout mengakhiri sesi; membuka kembali halaman privat meminta login.
- [ ] Sesi kedaluwarsa ditangani dengan jelas dan tidak menampilkan data pengguna sebelumnya.
- [ ] Setelah berganti akun, data, notifikasi, dan draft tampilan akun lama tidak terbawa.
- [ ] Ikon tampilkan/sembunyikan password bekerja; password tetap tersamarkan secara default.
- [ ] Tautan aktivasi akun mudah ditemukan pada login kampus dan membuka alur yang benar.
- [ ] Pada build production, pilihan akun QA tidak tersedia; akses langsung API preview juga ditolak.

## 3. Aktivasi akun dan email

> QA 14 September 2026: **14 lulus pada sandbox lokal, 1 terblokir**. Penerimaan email diuji melalui inbox Mailpit; hasil ini tidak membuktikan inbox/spam eksternal atau kesiapan production. Laporan dan batas pengujian: [Hasil QA aktivasi dan email](QA-AKTIVASI-EMAIL-2026-09-14.md).

- [x] Admin dapat menyimpan nama PIC dan email untuk kampus uji; data tetap tersimpan setelah refresh.
- [x] Menyimpan PIC/email tidak langsung mengirim email aktivasi.
- [x] Permintaan aktivasi dengan email terdaftar berhasil dan halaman “Periksa email Anda” menampilkan alamat tujuan yang benar.
- [x] Email tidak terdaftar memperoleh respons umum tanpa membuat undangan atau mengirim email.
- [x] Format email tidak valid dan email yang sudah dipakai kampus lain ditolak saat pengaturan PIC.
- [x] Status pengiriman berubah dari antrean menjadi terkirim, atau gagal dengan status yang dapat ditindaklanjuti.
- [x] Email benar-benar diterima pada inbox/spam penerima uji; status `sent` di backend saja belum cukup untuk butir ini.
- [x] Pengirim, nama kampus/PIC, logo, isi pesan, tombol, dan versi teks email tampil benar.
- [ ] Tautan aktivasi menggunakan domain HTTPS deployment yang benar, bukan localhost atau domain staging yang salah. **TERBLOKIR — domain deployment HTTPS belum diuji; tautan sandbox masih localhost.**
- [x] Tautan dapat dibuka di browser/perangkat lain dan menampilkan tahap pembuatan password.
- [x] Password kurang dari 8 karakter, tanpa angka, tanpa huruf kapital, atau konfirmasi berbeda ditolak oleh UI dan backend.
- [x] Password yang memenuhi syarat dapat disimpan; akun kemudian berhasil login dan status admin berubah menjadi aktif.
- [x] Tautan yang sudah digunakan, kedaluwarsa, diubah, atau dicabut ditolak.
- [x] Permintaan ulang mengikuti cooldown; undangan sebelumnya tidak dapat dipakai setelah diganti.
- [x] Gangguan SMTP tidak ditampilkan sebagai pengiriman berhasil; retry/status gagal dapat diamati di backend.

## 4. Pemulihan dan ganti password

- [ ] Lupa password menampilkan alamat tujuan pada tahap periksa email dan mengirim tautan ke penerima uji yang sesuai.
- [ ] Pemulihan password berhasil dengan tautan sah; password lama tidak berlaku lagi.
- [ ] Ganti password tersedia saat login dan meminta password saat ini.
- [ ] Password saat ini yang salah, password baru yang sama, atau konfirmasi berbeda ditolak.
- [ ] Ganti password berhasil mencabut sesi lama; login ulang memakai password baru berhasil.
- [ ] Akun lain tetap tidak terpengaruh oleh perubahan password akun uji.

## 5. Hak akses dan keamanan data

Periksa lewat antarmuka dan request API. Tombol yang disembunyikan saja belum membuktikan backend aman.

- [ ] Pengunjung tanpa login tidak bisa membaca data privat atau melakukan perubahan melalui API.
- [ ] Akun kampus tidak bisa mengakses endpoint admin: akun PIC, master, audit, dan keputusan review.
- [ ] Kampus A tidak bisa membaca/mengubah indikator, feedback privat, pengajuan, atau proposal Kampus B dengan mengganti ID di URL/request.
- [ ] Unduhan PDF tetap memeriksa hak akses; URL atau ID file milik kampus lain tidak membuka dokumen privat.
- [ ] Forum Q&A dan FAQ bersama tetap dapat dibaca oleh role yang berhak sesuai desain.
- [ ] Role, campus ID, identitas penulis/penerima, dan waktu yang dipalsukan dalam request tidak menggantikan identitas server.
- [ ] Request mutasi dari origin lain ditolak.
- [ ] Cookie sesi memakai HttpOnly dan Secure pada HTTPS; token/secret tidak tampil di bundle frontend atau respons API.
- [ ] Akun yang dinonaktifkan atau diubah aksesnya tidak dapat terus memakai sesi lama.
- [ ] Percobaan login dan permintaan email berulang dibatasi; pesan batas percobaan dapat dipahami.

## 6. Dashboard dan navigasi

- [ ] Semua menu admin dan kampus dapat dibuka lewat klik, refresh, serta URL langsung.
- [ ] Tidak muncul halaman gagal dimuat, error console, atau request API gagal tanpa penjelasan.
- [ ] Jumlah kampus, proposal, indikator, revisi, dan notifikasi cocok dengan data backend yang dapat diakses akun.
- [ ] Progres dan ringkasan kategori berubah sesuai pembaruan data.
- [ ] Aktivitas terbaru mengacu pada tindakan dan kampus yang benar.
- [ ] Navigasi cepat antarhalaman tidak menampilkan respons lama pada halaman baru.
- [ ] Ketika backend tidak tersedia, UI menampilkan error dan opsi mencoba lagi tanpa mengganti data dengan dataset dummy.

## 7. Kampus mitra dan akun kampus

- [ ] Daftar kampus, detail, dan tab Ringkasan/Indikator/Proposal/Feedback dapat dibuka.
- [ ] Pencarian nama/singkatan/wilayah dan filter daftar kampus memberikan hasil yang benar.
- [ ] Tab Akun kampus menampilkan total roster serta statistik email, aktivasi, dan akun aktif yang benar.
- [ ] Setiap filter status akun menghasilkan jumlah yang cocok dengan backend: Email belum diisi, Belum aktivasi, Dalam antrean, Menunggu aktivasi, Gagal dikirim, dan Aktif.
- [ ] Ringkasan “Menampilkan X dari Y kampus” memakai seluruh hasil filter, bukan hanya 10 baris halaman saat ini.
- [ ] Pencarian dan filter dapat digabung; tidak ada hasil menampilkan 0 dari total roster.
- [ ] Saat request filter berjalan, tampil status memuat; respons request lama tidak mengganti hasil filter terbaru.
- [ ] Pagination pertama/berikutnya/sebelumnya benar; mengganti filter mengembalikan halaman ke awal.
- [ ] Edit, batal edit, simpan PIC/email, serta muat ulang status bekerja tanpa kehilangan perubahan yang belum disimpan saat berpindah halaman daftar.
- [ ] Email duplikat terhadap data di halaman lain tetap ditolak backend.
- [ ] Perubahan email akun aktif memerlukan konfirmasi dan mencabut akses/tautan lama sesuai alur aplikasi.
- [ ] Konflik edit dari dua sesi ditampilkan dan tidak menimpa perubahan terbaru secara diam-diam.
- [ ] Tambah/edit profil dan lokasi kampus berjalan pada data uji; koordinat tidak valid ditolak.
- [ ] Penghapusan kampus yang memiliki relasi ditolak; data kampus lain tidak ikut terhapus.

## 8. Indikator, pengajuan, dan review

- [ ] Master indikator aktif tampil sesuai kampus; baseline/target bersama dan aktual/catatan per kampus tidak tertukar.
- [ ] Nilai aktual dan catatan tersimpan setelah refresh; nilai tidak valid ditolak.
- [ ] Progres sesuai rumus yang disepakati, termasuk nilai nol dan aktual melebihi target.
- [ ] Kampus dapat mengajukan data lengkap; status menjadi pending dan snapshot pengajuan tersimpan.
- [ ] Pengajuan pending mengunci perubahan yang memang dilarang oleh aturan workflow.
- [ ] Admin dapat meminta revisi dengan catatan; kampus yang benar menerima pemberitahuan.
- [ ] Kampus dapat menindaklanjuti revisi dan mengajukan ulang sesuai aturan.
- [ ] Admin dapat menyetujui pengajuan; status dan riwayat keputusan konsisten setelah refresh.
- [ ] Snapshot/riwayat pengajuan lama tidak berubah ketika data terkini diperbarui.
- [ ] Klik ganda atau retry setelah koneksi terganggu tidak membuat pengajuan/keputusan ganda.
- [ ] Master draft tidak muncul sebagai indikator aktif; aktivasi dan perubahan target mengikuti pembatasan pengajuan pending.
- [ ] Perubahan master tercatat pada audit; pencarian dan pagination audit bekerja.

## 9. Proposal dan file

- [ ] Unggah PDF valid berhasil pada hosting tujuan, termasuk file mendekati batas 10 MiB.
- [ ] File kosong, bukan PDF, PDF palsu, dan file melebihi batas ditolak dengan jelas.
- [ ] Proposal tersimpan pada kampus yang benar dengan versi baru, nama file, dan catatan perubahan.
- [ ] Preview/download berhasil setelah refresh dan melalui sesi baru yang berhak.
- [ ] Versi lama tetap tersedia; mengunggah versi baru tidak menimpa file sebelumnya.
- [ ] Perbandingan dua versi menampilkan perubahan sesuai isi PDF dan arah versi yang dipilih.
- [ ] PDF tanpa teks yang bisa diekstrak, termasuk hasil scan, tidak membuat halaman crash dan dapat ditangani pengguna.
- [ ] Gangguan upload/retry tidak menghasilkan versi ganda atau sukses palsu.

## 10. Forum Q&A, FAQ, dan notifikasi

- [ ] Pertanyaan awal, jawaban resmi, dan balasan tampil sebagai kartu berurutan; nomor balasan dan kutipan menjelaskan konteksnya.
- [ ] Sesudah jawaban resmi tersedia, kampus penanya dan admin dapat saling membalas; kampus lain hanya membaca.
- [ ] Balasan kampus mengubah status menjadi "Menunggu tanggapan admin"; balasan admin mengembalikannya menjadi "Sudah dijawab".
- [ ] Memperbarui jawaban resmi tidak menghilangkan status menunggu tanggapan; isi FAQ tidak berubah karena balasan diskusi.
- [ ] Balasan muncul otomatis tanpa refresh dan tanpa menghapus draf yang sedang diketik.
- [ ] Pengiriman yang gagal mempertahankan draf; mencoba kembali tidak menggandakan pesan atau notifikasi.
- [ ] Diskusi panjang memuat 50 pesan terbaru; "Muat balasan sebelumnya" mempertahankan urutan dan posisi baca.
- [ ] Notifikasi balasan diterima pihak lawan diskusi, bukan pengirim atau kampus lain, dan membuka pesan terkait.
- [ ] Balasan tidak dapat diedit/dihapus; referensi pesan dari diskusi lain ditolak backend.
- [ ] Kampus dapat mengajukan pertanyaan dengan kategori; judul/isi kosong atau kategori tidak valid ditolak.
- [ ] Pencarian, kategori, status jawaban, dan urutan forum menghasilkan pertanyaan yang sesuai.
- [ ] Admin dapat menjawab/memperbarui jawaban; kampus lain dapat membaca jawaban bersama.
- [ ] Like/unlike tidak menggandakan suara dari kampus yang sama dan tetap benar setelah refresh.
- [ ] Admin dapat menjadikan jawaban sebagai FAQ, mengedit, mengurutkan, dan menghapus FAQ uji.
- [ ] Pertanyaan/file yang tidak ada ditangani dengan pesan yang jelas.
- [ ] Notifikasi diterima akun yang benar dan membuka halaman yang sesuai.
- [ ] Tandai dibaca memperbarui daftar dan badge; status tetap tersimpan setelah refresh.
- [ ] Pengguna tidak bisa menandai notifikasi milik akun lain sebagai dibaca melalui API.
- [ ] Teks yang mengandung HTML/script ditampilkan sebagai teks aman, tidak dieksekusi.

## 11. Tampilan dan kemudahan penggunaan

- [ ] Login, aktivasi, dashboard, tabel akun, detail kampus, forum, dan modal terbaca pada desktop serta mobile.
- [ ] Tidak ada tombol penting terpotong; tabel lebar memiliki scroll yang dapat digunakan.
- [ ] Menu mobile, tutup modal, tombol kembali, dan navigasi browser bekerja.
- [ ] Semua input memiliki label; navigasi keyboard dan indikator fokus terlihat.
- [ ] Status loading, sukses, error, dan hasil kosong jelas serta tidak hanya dibedakan lewat warna.
- [ ] Alamat email panjang dan nama kampus panjang tidak merusak layout.
- [ ] Label prototype/simulasi yang tersisa sesuai lingkungan dan tidak menyesatkan pengguna production.

## 12. Deployment dan operasional

- [ ] `npm run check`, `npm test`, dan `npm run build` lulus pada kandidat rilis dengan Node yang sesuai konfigurasi deployment.
- [ ] Tes backend dan browser yang relevan lulus pada instance pengujian terisolasi; catat perintah dan hasilnya di bukti QA.
- [ ] Frontend dan PocketBase dapat diakses lewat HTTPS; request browser tidak terkena mixed content.
- [ ] Environment production tersimpan permanen: `PB_URL`, `DEB_PUBLIC_URL`, `DEB_MAIL_MODE=external`, serta `DEB_INVITATION_KEY` yang stabil dan rahasia.
- [ ] Proses production tidak membawa penanda instance lokal/akun QA; frontend tidak mengaktifkan preview development.
- [ ] Restart server mempertahankan konfigurasi, database, file proposal, dan antrean email.
- [ ] Migrasi dan hook PocketBase terpasang pada versi yang benar, termasuk worker email dan aset logo email.
- [ ] Batas upload/request hosting sesuai alur proposal aplikasi; diuji pada hosting tujuan, bukan hanya Vite lokal.
- [ ] Backup database dan file berjalan terjadwal; restore berhasil diuji pada instance terpisah.
- [ ] Log, kapasitas penyimpanan, antrean gagal, dan kesehatan server dapat dipantau oleh penanggung jawab.
- [ ] Log dan bukti QA tidak menyimpan password, token undangan, cookie, atau kredensial SMTP.
- [ ] Rencana rollback aplikasi/migrasi dan penanggung jawab insiden sudah ditentukan.

## Di luar cakupan rilis: Microsoft SSO

Integrasi Microsoft belum selesai dan tidak boleh ditandai lulus autentikasi hanya karena tombolnya tampil.

- [ ] “Masuk sebagai Karyawan” membuka tampilan khusus Microsoft; tombol kembali membuka login kampus.
- [ ] Tombol Microsoft menampilkan pemberitahuan yang jujur bahwa layanan belum aktif, tanpa membuat sesi palsu.
- [ ] Pemilik rilis menyetujui pengecualian Microsoft SSO untuk rilis ini dan menentukan apakah akses karyawan ditampilkan atau disembunyikan.

## Catatan temuan

| ID | Bagian / URL | Langkah reproduksi | Hasil aktual | Hasil yang diharapkan | Dampak | Bukti | Status / hasil uji ulang |
|---|---|---|---|---|---|---|---|
| BUG-01 | | | | | | | |

## Keputusan rilis

- Jumlah lulus:
- Jumlah gagal:
- Jumlah belum diuji / terblokir:
- Pengecualian yang disetujui:
- Keputusan: belum siap / siap staging / siap production
- Disetujui oleh / tanggal:

Jangan menyatakan siap production jika masih ada kegagalan pada hak akses, kebocoran/kehilangan data, aktivasi/login utama, file proposal, atau pemulihan backup. Temuan tampilan minor dapat dicatat sebagai pengecualian dengan persetujuan pemilik rilis.
