# Tematik DEB — 15 Oktober 2026

Branch `feat/tematik-deb` dibuat dari GitLab `production` pada `75ee8df4151132d6d9d1e65bb6a3ba43105b7d72`. Implementasi lokal memakai server yang sudah aktif di port 5176.

## Perilaku

- Profil & Monitoring Program → Profil Program → Informasi program menampilkan dropdown satu tema utama: Ketahanan Pangan, Pesisir Modern, atau Wisata Energi, sesuai materi DEB SoBI 2026 dari pengguna.
- Penjelasan tematik berada langsung di bawah dropdown, maksimal 1.000 karakter. Ekonomi dan ekonomi sirkular merupakan pendekatan, bukan pilihan tema tambahan.
- Kedua nilai memakai `campuses.program.thematic` dan `thematicDescription`, melalui PATCH profil existing. Nilai boleh kosong agar profil lama dan penyimpanan bagian informasi lainnya tetap kompatibel. Tidak ada tema yang dipilih otomatis.
- Ringkasan detail kampus admin memakai komponen yang sama, sehingga nilai kampus tampil dan bisa diperbarui admin melalui Ubah.
- Server menolak tema selain tiga pilihan, tipe nonteks, dan penjelasan di atas batas. Kepemilikan kampus, transaksi, pemeriksaan konflik, serta audit existing tetap digunakan. Tidak mengubah field `theme` lama atau dokumen pencairan.
- Tidak perlu migrasi schema PocketBase karena nilai berada dalam JSON profil existing.

## QA browser lokal

- [x] Akun kampus Universitas Papua: ketiga pilihan tampil; simpan Ketahanan Pangan beserta penjelasan, lalu reload mempertahankan keduanya.
- [x] Batalkan perubahan setelah mengganti tema dan penjelasan mengembalikan nilai tersimpan.
- [x] Lebar viewport 390 px: lebar dokumen dan konten sama-sama 380 px, tanpa overflow horizontal.
- [x] Admin PF: Ringkasan Universitas Papua menampilkan tema dan penjelasan yang sama.
- [x] PATCH melalui browser lokal: tema Ekonomi Sirkular, penjelasan 1.001 karakter, dan nilai tema berupa angka masing-masing ditolak 400.
- [x] Admin mengosongkan kembali dua field QA, simpan dan reload menunjukkan Belum diisi. Riwayat audit QA tetap tersimpan pada instance lokal.
- [ ] Pengujian ulang akses lintas kampus dan konflik simpan bersamaan khusus field baru.

Tes unit daftar tematik ditambahkan di `tests/program-thematics.test.ts`, belum dijalankan. Tidak menjalankan tes terminal, check, lint, atau build. Belum commit, push, PR/MR, atau deploy; production tidak diubah.
