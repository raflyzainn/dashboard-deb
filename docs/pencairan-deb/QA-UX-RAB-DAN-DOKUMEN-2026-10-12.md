# QA UX RAB dan lokasi dokumen — 12 Oktober 2026

Lingkup: development lokal, Vite 5176 dan PocketBase 8097. QA menggunakan Playwright browser; bukan bukti production atau pemeriksaan menyeluruh aplikasi.

## Temuan dan perbaikan

- Tombol Periksa RAB 100% sebelumnya tetap aktif saat total berbeda dari SK. Kini total harus sama persis; finalisasi manual pada API juga menolak total kurang/lebih. Draf tetap boleh disimpan.
- Total sesuai SK tetapi nama kosong, satuan hanya angka, Qty pecahan, atau baris tambahan kosong sebelumnya masih memungkinkan tombol pemeriksaan aktif. Kini tombol memakai parser RAB yang sama dengan finalisasi dan menampilkan alasan validasi.
- Navigasi langkah 2 sebelumnya dapat aktif ketika baris yang sedang diedit tidak valid. Kini memakai kesiapan yang sama dan memfinalisasi perubahan melalui tindakan pemeriksaan; langkah 3/4 tidak dapat dilewati dari editor.
- Daftar dokumen otomatis sebelumnya muncul di Rekening Penerima dan PKS. Kini hanya muncul di tab Dokumen. Isian rekening dan PKS tetap tersedia.
- Tombol permintaan nomor PKS PF dihapus. Saat nomor PKS kampus tersimpan dan nomor PF masih kosong, permintaan ditandai otomatis dan notifikasi admin dibuat dalam transaksi yang sama. Marker permintaan mencegah notifikasi berulang; alur submit lama tetap menjadi fallback.
- Panel permintaan akses revisi menghapus teks berulang `Akses hanya untuk ...` untuk seluruh scope. Padding dan jarak panel diperkecil; alasan, keputusan admin, dan tindakan permintaan tetap tersedia.
- Sidebar memindahkan status ke bawah label agar status panjang tidak memaksa nama bagian terpecah di tengah kata.
- Perubahan rekening mempertahankan tautan file lama dengan marker `stale`, serta mewajibkan unggahan ulang sebelum pengajuan. Permintaan revisi tidak menghapus file. File yang boleh diedit memiliki pilihan ganti dan hapus; hapus memakai modal aplikasi dengan nama file, Batal, dan Hapus file. API menguji scope file dan revisi draf; tindakan melepas file aktif, tanpa menghapus arsip versi lama.

## Bukti browser

- SK Rp20 juta: total Rp30 juta dan Rp15 juta mengunci tombol; POST finalisasi langsung ditolak HTTP 400 dengan pesan total harus sama dengan SK.
- Nama kosong, baris kosong, satuan `123`, dan Qty `2.5` dengan harga disesuaikan agar total tetap sama: tombol terkunci.
- Rincian valid Rp20 juta berhasil difinalisasi dan membuka langkah pemeriksaan, melalui tombol utama maupun navigasi langkah 2.
- Simulasi HTTP 500 pada autosave: isian tetap tersedia, status belum tersimpan, tombol coba simpan lagi muncul. Setelah simulasi dilepas, penyimpanan dan finalisasi kembali berhasil.
- Rekening Penerima pada data lokal: panel dokumen tidak muncul. Untuk memeriksa ketiga tab pada status draf, respons GET status journey diubah menjadi draf hanya di browser: panel rekening 0, PKS 0, Dokumen 1. Tidak mengubah status database untuk pemeriksaan tampilan ini.
- Kampus QA terisolasi untuk PKS otomatis: isian spasi tidak memicu permintaan; autosave nomor PKS memicu notifikasi admin dengan status pengajuan tetap draf. Notifikasi terlihat pada halaman admin (1), perubahan nomor berikutnya tidak menggandakan notifikasi (tetap 1), dan kampus berhasil melanjutkan ke Dokumen tanpa nomor PF. Tombol permintaan manual tidak tampil. Akun QA sementara dihapus setelah pemeriksaan.
- File rekening lokal: sesudah respons autosave berhasil, perubahan bank mempertahankan file dan peringatan setelah reload; unduh file HTTP 200. Unggah pengganti HTTP 200 menghilangkan marker dan blocker. Simulasi unggah HTTP 500 mempertahankan file aktif. Hapus HTTP 200 menampilkan blocker unggahan yang belum lengkap.
- Modal hapus aplikasi: nama file terlihat, Batal mempertahankan file, konfirmasi Hapus file HTTP 200 menutup modal.
- Fixture respons GET browser untuk status pending/approved: pada viewport 1024, label submenu mempunyai lebar sekitar 145px dan status berada di bawah label. Pending mempertahankan tautan file, mengunci input, serta menyembunyikan hapus. Revisi scope administrasi membuka bank tetapi penandatangan tetap terkunci. Ini pemeriksaan UI dengan fixture, bukan pengajuan/approval nyata baru.

## Pemeriksaan kode dan batas

- Backend progress telah menolak draf item yang belum diperiksa serta total tidak sesuai SK; perlindungan ini dipertahankan.
- Kandidat lanjutan dari pemeriksaan kode: kesiapan unduh surat kuasa saat identitas belum lengkap, dan tombol kirim pada beberapa scope revisi sekaligus. Belum direproduksi menyeluruh dan belum dinyatakan sebagai bug terkonfirmasi.
- Celah notifikasi pengajuan pada adapter `src/lib/server/deb/journey.ts` sudah diperbaiki: penambahan riwayat pengajuan oleh kampus memicu `pencairan_pengajuan` untuk admin/super-admin aktif dalam transaksi yang sama. Judul membedakan pengajuan pertama dan perbaikan; tautan membuka kampus terkait. Autosave tidak menambah riwayat sehingga tidak memicu notifikasi ini.
- QA browser pengiriman perbaikan melalui tombol kampus: submit HTTP 200, notifikasi pengajuan 6 terlihat di admin, tautan detail membuka `/admin/pencairan/1aaa9f6a9c7d798?butir=pks`. Submit ulang ditolak HTTP 409 dan jumlah notifikasi tetap 1. Pengajuan pertama belum dikirim ulang melalui browser; cabang awal/perbaikan, riwayat tidak berubah, autosave, dan actor admin dicakup test regresi yang ditambahkan pada `tests/journey-notifications.test.ts` tetapi tidak dijalankan.
- Test regresi ditambahkan di `tests/rab-items-budget.test.ts`, `tests/pks-auto-request.test.ts`, dan `tests/journey-file-retention.test.ts`, tetapi tidak dijalankan sesuai larangan tes terminal. Check/lint tidak dijalankan. Build sebelum publikasi yang diminta pengguna berhasil exit 0; warning `punycode` deprecated dan chunk lebih besar dari 500 kB. Tidak deploy.
- Referensi file yang sudah dilepas oleh kode lama tidak otomatis dipulihkan oleh perubahan ini. File pengganti perlu diunggah jika tidak ada lagi referensi file aktif.
