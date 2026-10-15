# Pelaporan kampus setelah pencairan

## Tujuan dan basis kerja

Membangun Pelaporan sesuai `Revisi_DEB_Ringkas_Audit_Kode.xlsx`, khususnya 1.7, 9.1–9.7, N5, dan prasyarat LPJ pada 7.5–7.6. Branch `feat/pelaporan-kampus-20261014` dibuat dari production GitLab commit `fa84daee78dbb0317a33b10e30820ed236663261`. Pekerjaan berada dalam worktree terpisah; perubahan lokal surat permohonan dan pekerjaan lain tidak dibawa otomatis.

Keputusan pengguna pada 14 Oktober 2026:

1. Kampus mulai mengisi Pelaporan setelah pembayaran Tahap 1 tercatat.
2. Artikel memiliki tiga pilihan: menulis di aplikasi, mengunggah Word, atau mengunggah PDF.
3. Semua bukti LPJ harus berstatus Sesuai sebelum admin menyatakan LPJ selesai.

Dokumen ini adalah rancangan untuk ditinjau, belum pernyataan bahwa implementasi selesai.

## Tampilan dan alur kampus

- Beranda dan menu akun menyediakan Pelaporan setelah T1 memiliki tanggal pembayaran dan nominal pembayaran positif. Sebelum pembayaran, Beranda menjelaskan bahwa Pelaporan tersedia setelah dana dicairkan. URL langsung tetap dapat menampilkan keadaan terkunci; API menolak operasi tulis sebelum pembayaran.
- Halaman `/campus/pelaporan` memuat dua bagian jelas: LPJ Penggunaan Dana T1 dan Keluaran Pelaporan. Halaman LPJ lama mengarah ke bagian LPJ ini agar tidak ada dua alur pengisian.
- LPJ menggunakan komponen dan penyimpanan bukti existing: tanggal, nomor bukti, penerima, nominal, bagian RAB, memo, dan pindaian. Satu invoice/satu pindaian/satu entri. Pilihan RAB hanya berasal dari RAB kampus yang disetujui.
- Empat kartu keluaran: Laporan pelaksanaan, Infografis, Video profil, Artikel. Setiap kartu menampilkan status, versi terkini, catatan admin, dan riwayat versi. Berkas lama tetap tersedia setelah revisi.
- Unggah atau simpan teks menghasilkan draf. Kampus memilih Kirim untuk diperiksa pada keluaran tersebut. Selama menunggu review, isi versi yang dikirim tidak dapat diubah. Jika perlu revisi, penggantian menghasilkan versi baru, bukan menimpa berkas lama.
- Form langsung tersedia ketika bagian dapat ditulis. Tidak menambah sidebar kampus; mengikuti pola menu akun dan kartu aplikasi yang sudah ada. Tampilan mobile tidak boleh melebar keluar halaman.

## Keluaran dan validasi

| Keluaran | Pengisian tahap ini | Batas dan pemeriksaan |
| --- | --- | --- |
| Laporan pelaksanaan | Unggah PDF atau Word `.docx` | Maksimal 20 MB, pemeriksaan isi/ekstensi existing |
| Infografis | Unggah PDF | Maksimal 20 MB; generator menunggu template yang disepakati |
| Video profil | Unggah video MP4 yang sudah jadi | Maksimal 40 MB, durasi paling lama 120 detik; format/durasi diperiksa server dari metadata MP4, bukan hanya nilai browser |
| Artikel | Pilih teks web, Word `.docx`, atau PDF | Teks memiliki judul maksimal 200 karakter dan isi maksimal 50.000 karakter; berkas maksimal 20 MB |

Nomor versi, penulis, waktu, hash, ukuran dan tipe berkas dicatat server. Nama berkas/teks tidak dirender sebagai HTML. Teks artikel ditampilkan sebagai teks biasa dengan paragraf; tidak menambah editor rich text. Artikel berbentuk berkas tetap dapat dibuka/diunduh oleh admin yang berhak.

Video tidak dibuat atau disunting di aplikasi. Batas dua menit tetap berlaku ketika pengguna melewati validasi frontend. MP4 tanpa metadata durasi yang valid, berkas kosong, ekstensi palsu, dan file terlalu besar ditolak. Untuk berkas Office gunakan pemeriksaan ZIP yang sudah ada.

## Review admin dan penyelesaian LPJ

- Halaman `/admin/pencairan/[id]/pelaporan` menyediakan keluaran dan LPJ kampus tersebut. Tautan tersedia dari kartu pencairan/Tahap 2. Admin dapat membaca semua versi dan memberi keputusan Sesuai atau Perlu revisi; revisi wajib memiliki catatan.
- Status keluaran: Draf, Menunggu pemeriksaan, Perlu revisi, Sesuai. Tidak ada persetujuan otomatis karena berkas berhasil diunggah.
- Tombol Selesaikan LPJ aktif hanya jika pembayaran tercatat, ada setidaknya satu bukti, dan semua bukti berstatus Sesuai. API memeriksa ulang ketiga syarat itu. Admin tetap harus menekan tombol; kumpulan bukti Sesuai tidak otomatis menutup LPJ.
- Penyelesaian mencatat admin dan waktu. LPJ yang selesai tidak menerima penambahan atau perubahan bukti. Admin dapat membuka kembali dengan alasan wajib; pembukaan kembali membatalkan kesiapan LPJ untuk T2 dan tercatat pada audit.
- Rancangan tidak mewajibkan total pengeluaran sama persis dengan dana diterima. Sisa atau kelebihan tetap terlihat; tidak menambah aturan bisnis yang belum diminta.
- Kesiapan prasyarat T2 ditampilkan dari status penyelesaian LPJ server, bukan dari teks petunjuk. Pengajuan/dokumen/pembayaran T2 penuh pada poin 7.4 merupakan pekerjaan tersendiri; perubahan ini tidak mengklaim alur T2 lengkap atau membuka pembayaran T2 otomatis.
- Pelaporan tahunan dinyatakan lengkap jika empat keluaran versi terkini sudah Sesuai. Mengunggah versi baru mengembalikan keluaran tersebut ke Draf dan membatalkan kelengkapan itu. Status ini menjadi informasi kesiapan tahun berikutnya, tanpa mengunci login, seluruh menu, atau membuat pengajuan tahun berikutnya otomatis.

## Penyimpanan dan akses

- Gunakan PocketBase dan storage R2/lokal existing. Keluaran pelaporan disimpan terpisah dari daftar dokumen wajib pencairan T1 agar tidak mengubah denominasi progres, paket tanda tangan, atau lampiran pencairan.
- Tambahkan collection `report_versions` dengan relasi kampus, SK dan pencairan T1; jenis keluaran; versi; format teks/berkas; judul/isi; metadata berkas; status; penulis; pemeriksa; waktu pemeriksaan dan catatan. Indeks unik menjaga versi per SK/jenis. Versi yang telah dikirim mempertahankan kontennya.
- Periode mengikuti SK yang mendasari pencairan, bukan tanggal komputer atau isian tahun bebas. SK/relasi harus ditentukan server. Riwayat antar-SK tidak digabung sebagai satu laporan tahunan. Alur pencairan saat ini hanya memiliki satu pencairan per kampus/termin; dukungan pengajuan lintas tahun secara penuh tetap memerlukan alur periode/pencairan yang terpisah.
- Status penyelesaian LPJ memakai metadata kecil pada `disbursements.properties`, dipisahkan dari data formulir pengajuan. Gunakan pola transaksi/batch dan revisi existing agar simpan metadata tidak menimpa perubahan bersamaan. Dokumen artikel tidak dimasukkan ke properties karena kapasitasnya terbatas.
- Collection pelaporan tidak memberi akses tulis langsung ke browser. Endpoint mengizinkan admin atau kampus pemilik, memeriksa pembayaran, relasi kampus/SK, status terkini, revisi, ukuran input, isi berkas dan transisi status. Akun baru, kampus lain, dan permintaan melewati UI tetap ditolak.
- Simpan berkas baru dengan key unik; jika penyimpanan metadata gagal, versi sebelumnya tetap aktif. Storage key tidak boleh dipilih oleh client. File diakses melalui endpoint yang memeriksa kepemilikan, bukan URL publik.
- Audit mencatat unggah/simpan draf/kirim/keputusan/penyelesaian/pembukaan LPJ. Notifikasi memakai layanan existing untuk kiriman kampus dan catatan revisi. Tidak mengirim email/WhatsApp otomatis.

## Pemetaan Excel dan batas pekerjaan

| Poin | Hasil tahap ini |
| --- | --- |
| 1.7 | Menu dan akses dengan pemicu pembayaran T1 yang dipilih pengguna |
| 9.1 | Empat keluaran terpisah dan review admin |
| 9.2 | Unggah laporan tetap tersedia; form narasi terstruktur menunggu template resmi |
| 9.3 | Unggah PDF infografis tersedia; generator tidak dibuat tanpa template |
| 9.4 | Unggah MP4 dan validasi dua menit pada server |
| 9.5 | Tiga pilihan artikel sesuai keputusan pengguna |
| 9.6 | LPJ transaksi dibuka dan diperbaiki untuk alur setelah pembayaran |
| 9.7 | Kelengkapan empat keluaran diperiksa; belum ada penguncian seluruh akses/tahun berikutnya otomatis |
| N5 | Tetap dicatat menunggu Excel kolom narasi pengelola; tidak mengarang isian resmi |
| 7.5–7.6 | LPJ selesai oleh admin menjadi prasyarat T2 yang nyata; tidak membangun paket T2 penuh |
| 9.8 | Bahan laporan/infografis/artikel dapat dibaca/diunduh; tidak membuat fitur pembuat katalog/buku |

## Verifikasi dan pelaksanaan

QA memakai tool Playwright pada localhost port 5177 dengan PocketBase lokal 8097. Siapkan akun/kampus QA bertanda untuk kondisi sebelum dan setelah pembayaran; jangan memalsukan status pembayaran kampus pengguna atau menyentuh production. Schema baru hanya diterapkan pada instance lokal bertanda, dengan skrip/runbook migrasi yang dapat ditinjau untuk rilis nanti.

Kasus wajib: akses sebelum pembayaran; akses kampus lain; unggah masing-masing jenis; video 120 detik dan lebih dari 120 detik; MIME/ekstensi palsu; teks artikel; draf/kirim/review/revisi; riwayat versi; simpan bersamaan; gagal storage; semua bukti Sesuai sebelum LPJ selesai; pembukaan LPJ; kelengkapan empat keluaran; tampilan admin/kampus dan mobile.

Tidak menjalankan test suite/check/lint/build terminal tanpa izin. Tidak commit/push/PR/merge/deploy pada permintaan pengembangan ini. Setelah rancangan disetujui, tulis rencana implementasi ringkas dan kerjakan di branch baru ini.
