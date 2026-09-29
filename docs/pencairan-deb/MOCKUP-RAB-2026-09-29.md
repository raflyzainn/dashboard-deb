# Mockup aplikasi dan pembagian RAB — 29 September 2026

Status: branch pengujian `feat/rab-dummy-all-campuses`; acuan GitLab `production` b5d9037. Dikirim ke GitHub dan GitLab atas permintaan pengguna; bukan deployment produksi.

## Menjalankan dan masuk

Jalankan `npm run dev` atau `npm run dev:rab-mockup`, lalu buka http://127.0.0.1:5182/login.
Pilih **Masuk sebagai akun lokal**. Tersedia 2 admin dan 80 akun kampus untuk 40 kampus. Berpindah akun melalui Keluar, lalu masuk lagi. Kontrol mengambang DATA DUMMY dihapus.

## UI dan data

Memakai route, layout, dan komponen SvelteKit aplikasi asli. Adapter `mockups/app` melengkapi layanan demo yang sudah ada untuk pencairan, pengguna, audit, dan pengaturan. Data disimpan di IndexedDB `deb-full-app-dummy-v1`, terpisah per kampus. Nama/logo kampus berasal dari roster aplikasi; transaksi, akun, dan dokumen adalah simulasi.

Mode Vite `mockup` mengganti layanan data dan realtime. Hooks menolak API backend sebelum membuat klien PocketBase; SK contoh dilayani middleware lokal. Tidak memakai koneksi PocketBase. Konfigurasi adapter pengembangan masih dapat membaca env; ini bukan bukti koneksi backend. Build/deploy tidak dikerjakan.

## Alur RAB terbaru

1. Kampus mengunduh Excel `.xlsx` contoh, mengisi RAB 100%, lalu mengunggahnya pada butir RAB 100%.
2. Seluruh rincian terbaca dan tampil. Alokasi unggahan baru kosong, belum otomatis dibagi berdasarkan persentase.
3. Kampus memilih jumlah tiap item untuk tahap 70%. Tombol 70% memindahkan seluruh jumlah ke tahap pertama; tombol 30% memindahkan seluruhnya ke tahap kedua. Input jumlah memungkinkan pembagian, misalnya 10 unit menjadi 7 dan 3 unit. Sisa jumlah otomatis masuk tahap kedua.
4. Nominal dihitung dari jumlah dikali harga satuan. Jumlah tidak boleh negatif atau melebihi volume sumber; maksimal empat desimal. Total tahap pertama harus positif dan maksimal 70% nilai SK, mengikuti aturan aplikasi sekarang. Persentase bukan kewajiban pembagian setiap item.
5. Simpan pembagian menyimpan draf, termasuk yang belum lengkap. Tombol lanjut hanya aktif saat seluruh item terbagi dan total memenuhi batas. Perubahan input belum tersimpan sampai tombol simpan ditekan.
6. Periksa RAB 70% dan RAB 30%; tabel menampilkan jumlah unit sesuai tahap. Konfirmasi dan ajukan ke PF. Draf terkunci saat menunggu pemeriksaan.
7. Admin memakai halaman dan tombol keputusan yang ada. Ketiga butir RAB harus sesuai sebelum disetujui.

File dibatasi 2 MB, 500 item, 1.000 baris, 30 kolom. Nilai SK simulasi Rp20 juta. File asli tersimpan lokal. Sesi lokal adalah simulasi, bukan autentikasi produksi.

## QA browser

- [x] Halaman admin dashboard, kampus, pengguna, pencairan, verifikasi, master indikator, proposal, forum, FAQ, notifikasi, dan sebaran memuat data.
- [x] 40 kampus dan 82 akun awal; status pencairan antarkampus berbeda.
- [x] Tandai semua notifikasi dibaca bertahan setelah muat ulang.
- [x] Kontrol mengambang hilang; masuk melalui pilihan akun lokal.
- [x] Unggah XLSX menghasilkan enam item dan Rp20 juta.
- [x] Pembagian kuantitas kampus-006: 20 paket menjadi 10 paket pada setiap tahap, total Rp14 juta/Rp6 juta.
- [x] Simpan dan buka ulang mempertahankan seluruh jumlah input.
- [x] Jumlah melebihi volume ditolak; nominal melebihi batas memblokir lanjut.
- [x] Pengajuan berubah menjadi menunggu PF; admin melihat alokasi dan jumlah per tahap.
- [x] Sebelum perubahan kuantitas, persetujuan tiga butir pada kampus-001 menghasilkan status lengkap tanpa mengubah kampus lain.
- [ ] Belum mengulang semua mutasi seluruh menu, seluruh akun, dan keputusan revisi setelah perubahan kuantitas.
- [ ] Tes terminal, check, lint, build, dan recalculation LibreOffice tidak dijalankan.

QA di atas menggunakan tool browser Playwright. Publikasi branch diminta pengguna setelah QA; tidak membuat MR/PR atau deploy.

## Kampus yang disisakan untuk uji manual

Pada browser lokal saat penyerahan, keenam kampus berikut belum memiliki RAB 100%, 70%, maupun 30%:

| ID | Kampus |
| --- | --- |
| campus-011 | Politeknik Negeri Kupang |
| campus-016 | Universitas Hasanuddin |
| campus-021 | Universitas Mulawarman |
| campus-026 | Universitas Pertamina |
| campus-031 | Politeknik Negeri Cilacap |
| campus-036 | ITPB |

Pilih akun kampus tersebut lewat **Masuk sebagai akun lokal**, buka Pencairan Dana, lalu RAB 100%. Keenam kampus tidak dipakai untuk unggah QA sehingga pengguna dapat mencoba dari kosong. Data uji pengguna akan tetap tersimpan setelah unggah; tidak direset otomatis. Pada browser baru, seed juga menyediakan campus-001 dan campus-006 dalam keadaan kosong. Data IndexedDB browser tidak ikut Git; skenario awalnya berasal dari kode.
