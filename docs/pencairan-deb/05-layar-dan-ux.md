# 05. Layar dan UX

Sketsa visual semua layar ada di artefak versi 5 (salinan: [blueprint.html](blueprint.html)). Dokumen ini menuliskan isinya agar bisa dibangun tanpa membuka artefak.

## Layar yang berlaku sejak 19 September 2026 malam (artefak versi 11)

Satu layar per kampus (`Layar.svelte`, `/admin/pencairan/[id]?butir=<kind>`; `/campus/pencairan` dalam mode kampus). Tidak ada kartu, panel, atau halaman terpisah.

- **Kiri, daftar butir**: `sk`, `pks`, `rab`, `permohonan`, `kuitansi`, `invois`, `rekening`, `surat_kuasa` (titik warna keadaan dan satu kata: Sesuai, Periksa, Revisi, Belum, Tidak perlu; butir Format laporan dihapus, keputusan 39), lalu baris penutup Tanda tangan, Lampiran, Pembayaran (abu abu sampai delapan butir selesai). Di ponsel menjadi strip chip di atas dokumen.
- **Bilah atas**: nama butir, chip versi (klik membuka versi lama, "+ versi baru" mengunggah langsung saat berkas dipilih), untuk SK chip nomor SK dan "Buka SK lengkap", untuk RAB tab "RAB terkelola" dan "Berkas asli"; di kanan Nilai SK, Batas, Diajukan, "n dari 9", tombol "?" (Yang dilihat), "Riwayat" (lembar samping).
- **Tengah, dokumen**: SK dibuka pada halaman Lampiran I kampus (`/api/pencairan/sk#page=N`); RAB Tahap 1 sebagai tabel baca saja (`RabTable.svelte`: hanya baris beralokasi Tahap 1, tanpa RAB penuh; keputusan 32b); di bawah dokumen strip catatan yang selalu terlihat (keputusan 32a); berkas lain lewat `FileViewer`; baris penutup lewat `TandaTanganView`, `LampiranView`, `PembayaranView` (isi dan bilahnya sendiri).
- **Bilah bawah**: nilai yang diketik untuk butir itu (tersimpan saat meninggalkan kolom), paling banyak dua chip hasil otomatis, lalu dua tombol dari `DECISION_LABEL`: hijau benar, abu abu salah (membuka satu kotak catatan di bilah yang sama). Rekening: "Nama sesuai di bank" atau "Nama berbeda di bank" (mencatat cek bank dan memutuskan sekaligus, `POST .../review` dengan `bank`). Surat kuasa: "Nama cocok", "Nama berbeda", atau "Tanpa surat kuasa" (keputusan 34); "Tidak diperlukan" otomatis bila pemilik rekening adalah penandatangan PKS, dengan "Tetap periksa". RAB: "Sesuai: jadikan nominal Tahap 1" (`POST .../rab/keputusan`). SK: "Nilai sesuai dengan SK" atau "Nilai berbeda" (catatan ke admin). Setelah tombol hijau, butir berikutnya yang belum selesai terbuka. Enter untuk tombol hijau, Esc kembali ke dashboard.
- **Setelah keputusan** (keputusan 41): bilah aksi menjadi pernyataan (centang hijau atau seru kuning, label, siapa dan kapan, catatan) dengan tombol Ubah keputusan dan Batalkan keputusan; tombol keputusan hanya tampil saat butir belum diputuskan atau sedang diubah.
- **Ringkasan revisi** (`Revisi.svelte`, `/admin/pencairan/[id]/revisi`, keputusan 40): semua butir Perlu revisi satu kampus di satu halaman, tiap blok berisi catatan keputusan, temuan otomatis, dan percakapan Catatan; tombol Salin ringkasan (catatan keputusan saja) dan Cetak; chip butir lain di bawah.
- **Dashboard** (`Dashboard.svelte`, `/admin/pencairan`, keputusan 32c): ringkasan, frasa, saringan, tahun, urutan, legenda, dan grid kampus × sembilan butir. **Tahap 1** (`Tahap1Grid.svelte`, `/admin/pencairan/tahap-1`): grid pilih kampus dengan satu baris saringan. Baris membuka layar daftar periksa pada butir pertama yang belum selesai; sel membuka butirnya. `PencairanNav` memuat tiga tab: Dashboard, Tahap 1, Tahap 2.
- **Tampilan kampus**: layar yang sama, hanya dibaca; catatan pemeriksa dan satu tombol unggah pada butir yang butuh berkas.

## Layar versi 9 (19 September 2026, diganti pada malam yang sama oleh versi 11)

Lembar review `Review draft DEB PF.xlsx` menjadi daftar periksa terbuka: delapan butir per kampus, urutan bebas, beberapa orang, siapa dan kapan tercatat, tidak ada gerbang. Bagian bertanda "(lama)" di bawah menggambarkan alur terpandu sebelumnya dan disimpan sebagai riwayat.

- **Menu Pencairan** (`PencairanNav.svelte`): Dashboard, Tahap 1 (paling banyak 70%), Tahap 2 (sisanya).
- **Dashboard** (`Dashboard.svelte`, `/admin/pencairan`): angka ringkas (Lengkap, menunggu admin, menunggu kampus, batas Tahap 1 seluruh kampus), frasa "mulai dari yang paling dekat Lengkap", pencarian, saringan (semua, menunggu admin, menunggu kampus, hampir lengkap, lengkap, siap dibayar, dibayar), tahun program, urutan keadaan atau nama, legenda, lalu grid kampus × delapan butir. Sel membuka butirnya (`?butir=<kind>`), nama membuka kartu. Tidak ada ekspor Excel.
- **Tahap 1** (`Tahap1.svelte`, `/admin/pencairan/tahap-1`): kartu per kampus dengan "n dari 8", frasa, dan pil menunggu.
- **Kartu pemeriksaan** (`Kartu.svelte`, `/admin/pencairan/[id]`): nama, tahun, nomor SK, Nilai SK, Batas Tahap 1, Diajukan (total RAB 70% yang disetujui), pil "n dari 8 sesuai", frasa; delapan kartu butir (nama, keadaan, satu baris ringkasan, siapa memeriksa dan kapan); "Pemeriksaan otomatis"; "Sebelum dibayar" (PKS bertanda tangan dan asli diterima; permohonan, invois, kuitansi asli diterima; lampiran satu PDF; tanggal pembayaran) yang abu abu sampai semua butir sesuai; Riwayat perubahan di bawah. Keadaan butir: Sesuai, Tidak diperlukan (surat kuasa saat pemilik rekening adalah penandatangan PKS), Perlu konfirmasi (lembar review menulis Sesuai tanpa centang), Menunggu pemeriksaan, Perlu revisi, Belum ada.
- **Panel butir** (`ItemPanel.svelte`, terbuka di atas kartu): kiri berkas dengan strip versi dan "Unggah versi baru" (versi lama tetap bisa dibuka); kanan "Yang dilihat" (pengingat dari catatan reviewer, `LOOK_AT`), "Diketik dari berkas" (`FIELDS`, tersimpan per versi), "Dihitung sistem" (cek untuk butir ini), "Catatan" (utas semua versi; catatan lembar review menjadi entri pertama), keputusan Sesuai atau Perlu revisi (catatan wajib, dikirim ke kampus), tombol butir sebelumnya dan berikutnya, Esc menutup. Butir RAB menampilkan ringkasan RAB terkelola dan tautan ke halaman RAB 70%. Butir Buku rekening memuat pencatatan hasil cek nama di bank (sesuai atau berbeda, nama yang tampil, tangkapan layar).
- **RAB 70% (Tahap 1)** (`Rab.svelte`, `/admin/pencairan/[id]/rab`): satu satunya cek pemblokir adalah total RAB 70% terhadap Batas Tahap 1; RAB penuh hanya pembanding; "Setujui RAB 70%: menjadi nominal Tahap 1".
- **Tanda tangan basah** (`TandaTangan.svelte`, `/admin/pencairan/[id]/tanda-tangan`): data surat (nomor, tanggal, penandatangan, tempat; templat PKS standar atau kampus), tabel PKS, permohonan, invois, kuitansi: nilai terperiksa, pratinjau langsung dan "Unduh dokumen final" (berkas Word dengan QR dan baris penerbit di setiap halaman, tersimpan sebagai versi dengan kode verifikasi), "Unggah pindaian" (versi bertanda tangan) dan pembanding berdampingan dengan tanda "Sesuai dengan dokumen final", "Asli diterima" dengan siapa dan kapan.
- **Lampiran dan pembayaran** (`Lampiran.svelte`, `/admin/pencairan/[id]/lampiran`): enam sumber sesuai urutan lembar 2 (permohonan, invois, kuitansi bertanda tangan; cetakan RAB 70% dari RAB terkelola; buku rekening; surat kuasa bila diperlukan dan PKS bertanda tangan), pratinjau, "Simpan lampiran" (QR dan tautan verifikasi di setiap halaman, halaman ringkasan di akhir, SHA-256 tersimpan), arsip "Lampiran yang sudah dibuat", lalu formulir pembayaran (tanggal, jumlah sama dengan yang diajukan, referensi).
- **Tahap 2** (`Tahap2.svelte`, `Tahap2Kartu.svelte`): daftar dan kartu penampung; dibuka setelah Tahap 1 dibayar dan laporan realisasi diterima. Belum bisa diisi.
- **Verifikasi publik** (`/verifikasi/[kode]`): tanpa masuk; kampus, dokumen, tahap, tanggal terbit, nominal, kode, SHA-256; atau "Kode tidak dikenal".
- **Tampilan kampus** (`Kartu.svelte` mode `campus`, `/campus/pencairan`): kartu yang sama, hanya dibaca, sapaan menurut jam, catatan Perlu revisi dalam kalimat pemeriksa, tombol unggah pada butir yang butuh berkas bila `fillMode` kampus. Tidak melihat pemeriksaan otomatis maupun kampus lain.

## Pola bersama

- **Baca dulu.** Setiap bagian tampil sebagai data baca, dengan tombol Ubah per bagian yang membuka penyuntingan, lalu Simpan dan Batal. Komponen yang sudah ada: `src/lib/components/ui/EditableSection.svelte`, `ReadField.svelte`, `Button.svelte`.
- **Batang SK** di atas setiap layar kampus: nomor SK, Nilai Kegiatan, Batas Termin 1, Termin 2 minimal.
- **Penunjuk tahap** tujuh langkah di ruang kerja kampus: 1 Dasar, 2 Berkas masuk, 3 Periksa berkas, 4 RAB, 5 Rekening, 6 Buat dokumen, 7 Ekspor lampiran.
- **Riwayat perubahan** di bagian bawah setiap halaman (terlipat secara bawaan). Tidak ada halaman audit khusus.
- **Penampil berkas** di dalam halaman: pemilih versi, halaman, perkecil, perbesar, unduh berkas asli.
- Tombol yang belum bisa dipakai tampil redup dengan keterangan alasannya di sampingnya.
- Setiap daftar punya keadaan kosong dengan langkah berikutnya. Setiap halaman punya judul dan satu kalimat penjelas.
- Teks UI bahasa Indonesia, hanya aturan dan langkah berikutnya. Tanpa nama vendor, tanpa alasan teknis, tanpa tanda pisah panjang.
- Tipografi: huruf sistem, akar 16 px, isi 14 sampai 15 px, tidak ada di bawah 10 px, bobot 500, 600, 700, kontras minimal 4,5:1, `--muted:#475569`. Logo PF putih (`/logo-pf-white.png`) di atas latar berwarna.
- Mobile dulu: tanpa gulir mendatar pada lebar 390 px; tata letak tiga kolom menjadi satu kolom.
- Warna status: hijau Sesuai, biru Perlu konfirmasi, kuning tua Perlu revisi, abu Belum ada. Warna merek `#0066B2`. Catatan: nada "green" pada `Badge` lama masih tampil biru (`--green:#075fc7`), perlu dibereskan.

## Direktori Pencairan Termin 1 (lama, diganti 19 September 2026)

Judul "Pencairan Termin 1". Penjelas: "23 kampus penerima sesuai SK. Cari atau saring, lalu pilih kampus untuk memeriksa dokumennya."

- Ringkasan: batang bertumpuk sebaran 161 dokumen menurut status.
- **Kolom pencarian** nama atau kode kampus.
- **Saringan**: tahun program (Semua, Ketiga, Kedua); dokumen yang belum sesuai (tujuh pilihan); urutan (Perlu tindakan dulu, Nama kampus, Nilai terbesar).
- **Chip status dengan jumlah**: Semua, Perlu dikonfirmasi admin, Menunggu revisi, Siap lanjut, Belum ada dokumen.
- Baris hasil "Menampilkan x dari 23 kampus" dan tombol "Atur ulang". Keadaan kosong: "Tidak ada kampus yang cocok. Ubah kata kunci atau tekan Atur ulang."
- Kartu kampus: kode, nama, tujuh ruas status, "x dari 7 sesuai", tahun, Batas Termin 1, tahap saat ini, tindakan berikutnya. Kampus yang menunggu admin tampil lebih dulu.

Dari data nyata: 15 kampus perlu dikonfirmasi admin, 16 menunggu revisi, 0 siap, 3 belum ada dokumen.

## Profil DEB (tahap 1)

"Diisi admin. Kampus dapat melihat tanpa mengubah." Bagian:

1. **Sesuai SK** (terkunci): perguruan tinggi, tahun program, Nilai Kegiatan, judul program.
2. **Alamat kampus**: provinsi, kabupaten atau kota, kecamatan, kelurahan dan kode pos, alamat lengkap. Komponen: `RegionSelect.svelte` dengan data `static/data/regions/**`.
3. **Lokasi program**: desa dan titik peta. Komponen: `LocationPicker.svelte` (Leaflet dan OSM, batas Indonesia).
4. **Kontak dan penandatangan**: mentor, koordinator, local hero sebagai baris nama dan nomor telepon (`src/lib/contacts.ts`, komponen di `shared/profile/`), pejabat penandatangan dan jabatan, kop surat (gambar, opsional).

Ini halaman "data dan dokumen otomatis" yang ditanyakan pengguna: jawabannya ya, ini Profil DEB. Nilai milik satu pencairan (nomor PKS, tanggal surat) ada di tahap 6.

## Penunjuk langkah pencairan (komponen `PencairanTabs.svelte`) (lama, diganti 19 September 2026)

Satu penunjuk langkah untuk seluruh pencairan satu kampus, tampil di atas setiap halaman pencairan. Enam langkah di layar memetakan tujuh tahap yang tersimpan: 1 Dasar (Profil DEB, `/admin/campuses/[id]`), 2 Dokumen (tahap 2 dan 3, `/admin/pencairan/[id]`), 3 RAB (`/rab`), 4 Rekening (`/rekening`), 5 Buat dokumen (`/buat`), 6 Lampiran (`/lampiran`). Langkah yang sudah lewat bertanda centang hijau, langkah saat ini biru, halaman yang sedang dibuka bergaris. Penunjuk ini hanya navigasi; tahap maju karena tindakan (unggah, review, persetujuan RAB, cek bank, pembuatan dokumen, penggabungan PDF).

## Ruang kerja kampus (tahap 2 dan 3), alur terpandu (lama, diganti 19 September 2026)

Dibangun ulang pada 19 September 2026 atas arahan 24 di dokumen 03. Tata letak: judul kampus dengan tiga angka SK (Nilai Kegiatan, Batas Termin 1, Termin 1 diajukan yang "ditetapkan saat RAB disetujui" sebelum ada persetujuan), penunjuk langkah, peringatan Termin 2 bila ada, lalu dua kolom: **daftar dokumen** di kiri (titik warna status, nama, status, dan kata kerja berikutnya: Unggah, Periksa, Konfirmasi, Tunggu revisi, Selesai, plus batang kemajuan "x dari 7 sesuai") dan **area dokumen** di kanan yang berisi penampil berkas asli dan **empat langkah bertumpuk** untuk dokumen terpilih. Hanya satu langkah terbuka pada satu waktu; langkah lain terlipat dengan ringkasan satu baris dan centang bila selesai. Langkah yang terbuka dipilih otomatis (langkah pertama yang belum selesai), dan bisa dibuka manual.

1. **Berkas**: versi yang dibuka (pemilih versi bila lebih dari satu), siapa mengunggah dan kapan, tombol "Unggah versi baru" yang baru menampilkan formulir saat ditekan. Bila belum ada berkas, formulir unggah langsung terbuka.
2. **Isian dari berkas**: isian sesuai jenis dokumen, catatan siapa mengisi dan siapa mengecek ulang, tombol Simpan isian dan "Tandai sudah dicek ulang" (muncul hanya setelah diisi dan belum dicek). Setelah disimpan, langkah Keputusan terbuka.
3. **Keputusan**: pemeriksaan otomatis, penjelasan bila status Perlu konfirmasi, catatan review versi ini (termasuk catatan lembar review), lalu dua tombol: Sesuai (utama) dan Perlu revisi (membuka kotak "Yang harus diperbaiki" dan tombol Kirim catatan revisi). Setelah Sesuai, tombol "Dokumen berikutnya" membawa ke dokumen berikutnya yang belum sesuai.
4. **Tanda terima** (hanya dokumen buatan sistem: PKS, surat permohonan, invois, kuitansi): jejak tiga titik, Dibuat dari data, Pindaian bertanda tangan (unggah pindaian yang menjadi versi baru dan mencatat penerimaan), Asli kertas diterima (tombol "Catat asli sudah diterima"). Setiap titik menampilkan siapa dan kapan, dengan tautan Batalkan.

Pemberitahuan tersimpan tampil sebagai pil kecil di judul dokumen dan hilang sendiri. Riwayat perubahan kampus ada di bagian bawah.

Contoh nyata (PNK, Surat permohonan): berkas menulis Rp52.500.000; pemeriksaan "Nominal melebihi batas. Batas Termin 1 adalah Rp52.499.300."; catatan reviewer asli: "Nominal termin satu tidak sesuai 70% seharusnya 52.499.999, tetapi dibuat 52.500.000 (70% dari 75 jt) dan cukup lampirkan termin 1 saja" (angka reviewer sendiri keliru, jadi sistem yang menghitung); berkas versi 1 "PNK_Permohonan Pencairan Dana Bantuan ...docx".

## RAB (tahap 4)

Judul, versi dan statusnya, tombol Impor dari Excel, Ekspor, Tambah baris. Batang: Nilai Kegiatan, Batas Termin 1, RAB Termin 1, yang masuk ke Termin 2. Pemeriksaan: total terhadap SK, alokasi Termin 1 terhadap batas, volume kali harga terhadap jumlah, dan bila Termin 1 di bawah batas, peringatan "Termin 2 menjadi x% dari Nilai Kegiatan, bukan 30% seperti tertulis di PKS. Periksa pasal Bantuan Dana sebelum membuat PKS." (Q3). Tabel pohon: kode, uraian, volume, harga satuan, jumlah, Termin 1. Kode dibuat aplikasi dari posisi baris (contoh `A.1.a.3`).

Contoh nyata (IPB, Desa Tegal Waru): Nilai Kegiatan Rp71.609.350, batas Rp50.126.545, RAB Termin 1 Rp50.110.400, masuk ke Termin 2 Rp21.498.950; RAB total belum dikirim. Baris nyata kelompok A, kegiatan 1 Pemberdayaan Masyarakat, sub a BioTani: Sarung Tangan Karet 10 unit 20.000; Tepung Tulang Ikan 8 unit 25.000; EM4 Pertanian (1L) 10 unit 25.000; Molase (Tetes tebu) 1L 5 unit 20.000.

## Rekening dan surat kuasa (tahap 5) (lama, diganti 19 September 2026)

Kiri: **penampil pindaian buku rekening** dengan tab untuk beralih ke surat kuasa. Kanan, tiga panel berurutan:

1. Isian buku rekening (nama bank, cabang, nama pemilik, nomor rekening) dengan tanda Diisi dan Dicek ulang, serta hasil "Nomor pada PKS, surat permohonan, invois, dan buku rekening sama."
2. Pemilik rekening dan penerima kuasa: dua kelompok nama, hasil "Kedua nama cocok." atau peringatan dengan langkah berikutnya.
3. Hasil cek ke bank: nama yang muncul di bank, bukti pengecekan (opsional), tombol Nama sesuai dan Nama berbeda.

## Buat dokumen (tahap 6) (lama, diganti 19 September 2026)

Atas: empat prasyarat (RAB disetujui beserta nominal, rekening sudah dicek ke bank, kelengkapan Profil DEB, dan kesesuaian Termin 2 dengan 30% di PKS; bila tidak sesuai, baris itu menjadi peringatan dengan kotak centang "Pasal Bantuan Dana sudah diperiksa" dan Buat PKS tetap redup sampai dicentang). Kiri: **Properti dokumen**, satu satunya tempat nomor dan tanggal surat disimpan (nomor PKS PF, nomor PKS kampus, tanggal perjanjian, nomor surat permohonan, nomor invois, nomor kuitansi, terbilang otomatis) dan **Templat PKS** (Standar atau Khusus kampus ini, "x pasal berbeda dari templat standar", Lihat perbedaan, Pakai templat standar, Unggah templat khusus, Unduh templat standar). Kanan: **pratinjau langsung** dengan tab PKS, Surat permohonan, Invois, Kuitansi; nilai gabungan berwarna lembut, isian yang belum ada merah dan disebut namanya. Bawah: "Simpan sebagai versi baru" dan "Unduh Word", redup sampai lengkap, dengan keterangan "Lengkapi x isian yang ditandai merah untuk menyimpan dan mengunduh."

## Ekspor lampiran (tahap 7) (lama, diganti 19 September 2026)

Daftar isi berurutan dengan status tiap dokumen, tombol "Gabungkan menjadi satu PDF" dan "Unduh rekap semua kampus". Syarat: semua Sesuai dan rekening sudah dicek.

## Pengguna

Daftar akun dengan peran; akun baru punya tombol "Beri peran". Penjelas: "Akun dibuat saat pertama kali masuk dengan Microsoft. Beri peran agar akun dapat bekerja." Riwayat perubahan peran ada di bagian bawah halaman ini.

## Halaman menunggu peran (akun Baru)

Hanya nama pengguna, satu kalimat bahwa admin akan memberi peran, dan tombol keluar. Tidak ada data program.

## LPJ Termin 1 (`/admin/pencairan/[id]/lpj`, dibangun 19 September 2026)

Tiga ubin: Dana Termin 1 (dibayar, atau yang diajukan bila belum tercatat dibayar, dengan pemberitahuan), Sudah dipertanggungjawabkan (jumlah bukti berstatus bukan Perlu revisi), Belum dipertanggungjawabkan (merah bila melebihi dana). Tombol "Tambah bukti" membuka formulir satu kartu: tanggal pada bukti, nomor bukti, penerima, jumlah, bagian RAB (pilihan simpul RAB tingkat 1 sampai 3 dari versi RAB yang disetujui; nonaktif bila RAB belum disetujui), pindaian (PDF atau gambar), memo. Tabel entri dengan status (Menunggu review, Sesuai, Perlu revisi) dan tindakan admin (Sesuai, Revisi dengan catatan). Realisasi per bagian RAB menggulung dari entri. Data: koleksi `lpj_entries`, rute `/api/pencairan/[campus]/lpj` dan `/lpj/[entry]`, modul `src/lib/server/deb/lpj.ts`.

## Sisi kampus (`/campus/pencairan` dan `/campus/lpj`)

Komponen yang sama dengan sisi admin dalam `mode="campus"`: kampus melihat dokumennya sendiri, isian tampil sebagai data baca, tidak ada tombol keputusan, tanda terima hanya jejak. Unggahan dan tambah bukti LPJ hanya aktif bila `campuses.fillMode = campus` (17 kampus berikutnya); untuk 23 kampus mode admin, halaman menjelaskan bahwa admin program yang mengunggah. Menu kampus: Beranda, Pencairan, LPJ, Profil Program, Indikator DEB, Proposal, Forum Q&A, Pusat bantuan, Notifikasi.
