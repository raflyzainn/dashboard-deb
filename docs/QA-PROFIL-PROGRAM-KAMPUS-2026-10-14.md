# Profil Program kampus — 14 Oktober 2026

## Perubahan lokal

- Kartu Lengkapi Profil Program di Beranda menuju `/campus/profile`. Menu akun dan Panduan Aplikasi menyediakan tautan yang sama.
- Komponen profil existing dipakai untuk kontak Mentor/Koordinator/Local hero, lokasi, informasi program, estimasi RAB, dan deskripsi. Perubahan lokal sebelumnya yang menghapus Tim Pendamping dipertahankan.
- Sembilan isian kesiapan rencana aksi dapat dilengkapi kampus melalui formulir yang langsung terbuka, dengan Simpan perubahan/Batalkan perubahan. Admin tetap menggunakan tombol Ubah. Label dan field dipakai bersama Ringkasan admin.
- Profil dibaca dari data navigasi kampus sendiri; tidak membuka API dashboard atau modul indikator. Penyimpanan menggunakan endpoint profil existing, memeriksa pemilik kampus, daftar field, tipe/panjang input, dan mencatat riwayat.
- API menolak perubahan `pfTeam` oleh kampus dan mempertahankan nilai lama saat field lain diperbarui. Tidak mengubah schema, database production, SK, RAB pencairan, ataupun dokumen pengajuan yang sudah dibuat.

## Checklist verifikasi

- [x] Pemeriksaan kode: jalur Beranda, menu akun, Panduan, halaman profil, sumber data admin, API dan riwayat ditelusuri.
- [x] Tes regresi akses halaman/API dan pemetaan halaman diperbarui. Belum dieksekusi.
- [x] Browser lokal 5176: masuk kampus, buka profil melalui kartu/menu, ubah dan simpan data, muat ulang, cocokkan Ringkasan admin.
- [x] Browser: Batalkan perubahan mengembalikan nilai tersimpan, respons simpan 503 mempertahankan draf, nilai kosong dapat disimpan, lebar 390 px tanpa overflow, dan Tim Pendamping tidak muncul.
- [x] Browser/API: profil kampus lain ditolak 403, `pfTeam` ditolak 403, angka pada isian teks ditolak 400.
- [ ] Browser/API: regresi semua modul yang tetap ditutup.

## Hasil QA lokal

Playwright berhasil dibuka ulang setelah izin pengguna. Masuk sebagai Universitas Wiralodra melalui pemilih akun lokal, membuka kartu profil, menyimpan EBT eksisting, muat ulang, lalu melihat nilai yang sama pada Ringkasan admin di konteks browser terpisah. Nilai uji dikembalikan menjadi kosong; riwayat perubahan QA tetap tercatat pada database lokal.

Setelah revisi formulir langsung: tujuh bagian langsung menampilkan tombol Simpan perubahan, tanpa tombol Ubah. Simpan dan Batalkan tetap membiarkan formulir terbuka. Draf Subholding tidak hilang ketika EBT disimpan. Penyimpanan berhasil bertahan setelah muat ulang. Pemeriksaan ini dilakukan melalui browser, bukan test runner terminal.

Server lokal dijalankan dengan `npm run dev` pada port 5176, PocketBase lokal 8097. Saat pemuatan awal macet, watcher Vite dibatasi agar mengabaikan `.worktrees`, dan sumber Tailwind dibatasi ke `src`. Setelah restart, login, beranda, profil, dan Ringkasan admin dapat dibuka. Penyebab tunggal kemacetan belum dibuktikan dengan profiling.

Tes terminal, check, lint, dan build tidak dijalankan. Belum commit/push/deploy.

Regresi admin setelah revisi formulir: Ringkasan tetap memiliki enam tombol Ubah dan tidak langsung menampilkan input Subholding. Formulir langsung hanya diaktifkan oleh halaman profil kampus.

Kartu kontak kampus dirapatkan: padding lebih kecil, tanpa kotak berlapis, Nama/Nomor telepon berdampingan jika ruang cukup, serta tombol Simpan/Batal yang lebih singkat. QA Playwright pada viewport 1440 dan 390 px: tinggi kartu satu kontak sekitar 322 px, tidak ada overflow horizontal pada mobile, tambah/hapus kontak dan Batal berfungsi. Screenshot desktop diperiksa. Tidak ada perubahan penyimpanan data pada revisi ukuran ini.

## Perbaikan pemisahan nama dan telepon

Parser sebelumnya hanya mengenali awalan 0/62 sehingga nomor lain yang diterima formulir terbaca sebagai bagian nama setelah disimpan. Parser bersama kini membaca format tersimpan `Nama (nomor)` terlebih dahulu; nomor tanpa awalan Indonesia ditampilkan apa adanya tanpa tambahan 0. Tidak memerlukan migrasi data lama.

QA browser: reproduksi gagal sebelum perbaikan; sesudah perbaikan, pembacaan ulang nomor 222222313123, 2222222222, +6281234567890, dan 081234567890 mempertahankan nama/nomor masing-masing. Dua kontak Koordinator existing tampil dengan kolom nomor terisi. Kontak Mentor sementara disimpan dari kampus, dimuat ulang, lalu nama dan nomornya diverifikasi di Ringkasan admin. Dua nomor Koordinator juga terlihat di admin tanpa pesan Nomor belum diisi. Kontak Mentor sementara dihapus kembali; kontak pengguna tidak diubah. Tes regresi `tests/contacts.test.ts` ditambahkan, belum dijalankan melalui terminal.

QA ini belum mencakup semua butir Excel 2.1–2.4 mengenai pengisian awal pengajuan, pemakaian data di dokumen, serta penandaan dokumen setelah perubahan nama program. Menu Pelaporan 1.7 tidak termasuk implementasi ini.

## Negara dan format nomor WhatsApp

- Pilihan negara default Indonesia +62, tersedia kode negara lain melalui metadata `libphonenumber-js/max`. Nomor nasional dan nomor internasional yang ditempel dapat dibaca; hasil simpan memakai format internasional.
- Validasi format dipakai formulir, PATCH profil, dan pembuat tautan WhatsApp bersama, termasuk dialog kirim akses admin. Nomor lama yang tidak jelas kode negaranya tidak dibuatkan tautan otomatis. Tidak ada verifikasi kepemilikan/akun WhatsApp atau pengiriman pesan.
- QA Playwright: `123` ditolak oleh formulir dan PATCH mengembalikan 400; `081234567890` tersimpan sebagai `+6281234567890`, bertahan setelah muat ulang, serta tautan admin tepat `https://wa.me/6281234567890`. Pilihan Singapura dengan `81234567` tersimpan sebagai `+6581234567`, dengan negara/nomor tetap benar setelah muat ulang. `2222222222` tanpa kode negara tidak menghasilkan tautan. Kontak Mentor sementara dihapus kembali.
- Dependensi dipasang dengan `--ignore-scripts`; tidak menjalankan test/check/build. npm melaporkan Node lokal 25.5.0 sementara proyek meminta 22.x.

Pemilih negara kemudian dirapatkan menjadi satu baris dengan nomor: bendera dan panah dropdown selebar 48 px di kiri, input nomor di kanan. Nama negara/kode tetap tersedia dalam pilihan dan tooltip. Gambar bendera menggunakan FlagCDN. QA browser: bendera Indonesia berhasil dimuat, pilihan Singapura berfungsi, nomor dan dropdown sejajar pada desktop/mobile tanpa overflow horizontal, dan Batal mengembalikan nilai tersimpan.

## QA publikasi GitLab production / PR GitHub

Permintaan publikasi 14 Oktober 2026 memberi izin build dan push GitLab production serta PR GitHub menuju production. Perubahan profil disiapkan terpisah pada basis gitlab/production a48ee6c; pekerjaan LPJ dan perubahan lokal lain tidak disertakan.

Review kode menemukan angka pendek dalam nama seperti Budi (12) tersangka nomor telepon. Parser diperbaiki dengan minimal tujuh digit pada format nomor dalam kurung. QA browser pada worktree publikasi port 5176 / PocketBase lokal 8097: nama Budi (12) tanpa telepon berhasil simpan/muat ulang; Budi (2026) dengan nomor Indonesia tetap satu kontak setelah muat ulang. Kesiapan EBT tampil pada Ringkasan admin, tautan WhatsApp admin tepat wa.me/6281234567890; pilihan Singapura bertahan setelah simpan/muat ulang. Bendera dimuat dan pemilih negara/nomor sejajar pada lebar 390 px tanpa overflow. PATCH kampus lain/pfTeam ditolak 403 dan nomor berkode negara tidak valid ditolak 400. Kontak dan isian QA dikembalikan; riwayat QA tetap ada pada database lokal.

Review ulang tidak menemukan masalah Critical/Important tambahan. Risiko lama penyimpanan program secara bersamaan tetap ada karena API memperbarui keseluruhan objek program tanpa pemeriksaan revisi. Build pertama berhasil (exit 0); build final setelah perbaikan parser berhasil dengan exit 0 (Cloudflare adapter, SSR 51,88 detik). Percobaan sandbox sempat gagal spawn EPERM; pengulangan dengan izin proses esbuild berhasil. Warning relevan: punycode deprecated, chunk besar, Node lokal 25.5.0 sementara engine proyek 22.x; peringatan tsconfig sementara hanya muncul sebelum .svelte-kit dibuat pada build pertama. Test suite/check/lint tidak dijalankan. Belum membuktikan deployment aktif atau status CI remote.

## Penghapusan petunjuk bawah Beranda kampus

Atas permintaan lanjutan pengguna, dua teks Baru pertama kali? Baca panduan pengajuan dan Untuk keluar, buka menu akun di kanan atas. dihapus dari kartu pencairan Beranda. Perubahan ini sebelumnya hanya lokal dan belum ikut commit profil pertama. QA browser localhost:5176/campus/dashboard memastikan keduanya tidak muncul dan tautan Buka Profil Program tetap tersedia. Berkas halaman di worktree publikasi disamakan dengan halaman lokal yang diperiksa. Build wajib dijalankan ulang sebelum push GitLab production dan pembaruan branch PR GitHub #46.

## Tile OpenStreetMap pada profil

Pengguna melaporkan tile OSM berisi Access blocked 403. Penelusuran menemukan halaman login memakai Referrer-Policy: no-referrer; navigasi SPA dari login ke Beranda lalu Profil mempertahankan kebijakan itu, sehingga permintaan tile tidak mengirim Referer. [Kebijakan tile OSM](https://operations.osmfoundation.org/policies/tiles/) mewajibkan Referer pada aplikasi web.

LocationPicker kini mengatur referrerPolicy strict-origin-when-cross-origin khusus gambar tile melalui opsi Leaflet. Header privasi login/API tetap dipertahankan; tile hanya mengirim origin situs, tanpa path profil/ID kampus/query. Tidak mengganti penyedia, menyamarkan User-Agent, mem-proxy, atau menambahkan cache-busting. Komponen yang sama digunakan profil kampus, Ringkasan admin, dan master kampus.

QA Playwright localhost:5176, alur login -> navigasi SPA -> Profil: sebelum perbaikan, header Referer tidak ada (tile lokal masih merespons 200, jadi 403 pengguna tidak direproduksi di jaringan QA). Sesudah perbaikan, Referer adalah http://localhost:5176/, properti gambar strict-origin-when-cross-origin, 12 tile viewport merespons 200, atribusi terlihat. Screenshot peta diperiksa: jalan dan pin tampil, tanpa gambar Access blocked. Belum memverifikasi tile pada deployment aktif/IP pengguna; OSM tetap layanan eksternal best-effort.

Build final gabungan penghapusan petunjuk dan perbaikan OSM berhasil, exit 0, adapter Cloudflare (SSR 46,04 detik). Warning tetap punycode deprecated dan chunk besar. Test suite/check/lint tidak dijalankan.
