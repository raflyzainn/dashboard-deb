# QA pengguna baru - 8 Oktober 2026

## Lingkungan dan batas

QA memakai tool Playwright, frontend http://127.0.0.1:5176 dan PocketBase lokal 8097. Frontend sempat terputus ketika server dijalankan ulang; setelah pulih, login dan health PocketBase merespons 200. Kendala startup tidak dihitung sebagai hasil pengujian alur bisnis.

Konteks browser QA terpisah dari sesi pengguna. Akun: campus-903, admin-1, serta akun lokal Universitas Pasir Pangaraian (draf), Universitas Indonesia (revisi rekening), dan Politeknik Negeri Fakfak (menunggu PF). Tidak mengubah isian bisnis atau mengirim pengajuan milik kampus tersebut; navigasi draf UPP dikembalikan ke Identitas Surat dan Kop. Login/logout dan navigasi dapat memperbarui metadata/audit lokal. Request perubahan pada pengajuan QA yang sudah dibayar ditolak 409.

## Temuan yang diperbaiki dan diverifikasi ulang

1. **Dokumen menjadi jalan buntu saat belum lengkap.** Tombol Buat/Siapkan/Ajukan nonaktif, tetapi ringkasan hanya menampilkan kekurangan untuk bagian ringkasan, sehingga isian wajib di bagian lain tidak terlihat. Ringkasan kini menampilkan seluruh blocker validasi bersama tombol menuju bagian terkait. Browser membuktikan daftar kekurangan terlihat dan tombol Buka PKS menuju bagian PKS.
2. **Rincian pembayaran kampus tidak terlihat dari Lihat pembayaran.** Tautan membawa ke Dokumen sementara tanggal/nominal/referensi hanya lengkap di admin. Panel kampus kini menampilkan tanggal pembayaran 7 Oktober 2026, Rp10.800.000, dan referensi QA-SIMULASI-20261007 di area progres yang sama dengan bukti transfer. Tampilan mobile diperiksa.
3. **Admin ditawari perubahan keputusan setelah dibayar.** Ubah/Batalkan keputusan masih aktif meskipun API menolak perubahan. Tombol kini nonaktif dengan penjelasan pengajuan sudah dibayar dan terkunci; guard canDecide juga memperhitungkan pembayaran. Browser memverifikasi dua tombol nonaktif pada RAB pengajuan QA2 yang sudah dibayar.
4. **Petunjuk nomor PF bertentangan.** Dashboard admin menyatakan nomor PF diperlukan agar kampus membuat dokumen. Teks kini menjelaskan pengajuan dapat berjalan sambil menunggu nomor PF, dan nomor diperlukan untuk dokumen final yang benar. Browser memverifikasi teks baru. Tidak mengubah aturan maupun nomor PKS database.

## Hasil pemeriksaan hari ini

| Skenario | Bukti hasil |
| --- | --- |
| Login kosong | Validasi input/pesan isi email dan kata sandi terlihat |
| Login salah | Pesan Email atau password tidak sesuai terlihat |
| Login akun lokal | Kampus dan admin masuk ke ruang kerja masing-masing |
| Beranda kampus desktop | 1440x900 dan 1366x768: tinggi dokumen sama dengan viewport, tidak memerlukan scroll |
| Panduan Aplikasi | Bisa dibuka dari Beranda; menjelaskan draf, RAB, administrasi, nomor PF, Dokumen, revisi, tanda tangan dan pembayaran |
| Data Program draf dilewati | Tombol Lanjut membawa ke RAB meskipun isian program belum lengkap |
| RAB kosong/tidak lengkap | Periksa RAB menampilkan kesalahan kolom dan bilangan bulat positif; tidak membuat RAB valid |
| Unduh template | Browser menerima Template_RAB_DEB.xlsx |
| HTML dinamai xlsx | Ditolak: Arsip Office rusak atau terenkripsi; tidak tersimpan sebagai item RAB |
| PKS tanpa nomor PF | Placeholder masih menunggu surat dari PF dan petunjuk boleh melanjutkan terlihat |
| Dokumen draf tidak lengkap | Seluruh blocker terlihat; pembuatan dan pengajuan tetap nonaktif |
| Status Menunggu PF | Beranda memberi petunjuk tidak mengirim ulang; halaman Dokumen hanya lihat dan tidak menawarkan mutasi |
| Revisi rekening | Catatan PF terlihat; input rekening aktif, Data Program terkunci; tidak mengirim ulang atau mengubah isian |
| RAB QA sudah dibayar | Data RAB versi 7 dan perbandingan dua termin terlihat; admin tidak bisa membuka ubah/batalkan keputusan |
| Pembayaran kampus | Tanggal, jumlah dibayar dan referensi terlihat; bukti transfer opsional dijelaskan |
| Mobile 390x844 | scrollWidth 380 <= viewport 390 pada pencairan/rincian pembayaran; tidak ditemukan overflow horizontal pada skenario ini |
| Baca workspace sendiri | 200 |
| Baca workspace kampus lain | 403 |
| PATCH pengajuan QA yang sudah dibayar | 409 dengan pesan pengajuan terkunci |
| Logout gagal 500 (intersepsi browser) | Pesan kegagalan terlihat; pengguna tetap di halaman kampus |
| Logout normal + reload | Kembali ke login; GET workspace privat 401 |
| Dashboard admin dan pencarian kampus | Bisa mencari QA2 dan membuka detail serta butirnya |
| Halaman admin tambahan | Review Kampus, Kampus mitra, Master indikator, Peta Persebaran, Proposal, Pengguna, Forum Q&A, Pusat bantuan berhasil dimuat; tidak ditemukan elemen alert pada pengamatan tersebut |

Bukti screenshot: output/qa-pengguna-baru-2026-10-08/dokumen-kekurangan.png, pembayaran-mobile.png, admin-keputusan-terkunci.png.

## Temuan tersisa dan bukti yang belum ada

- Label simulasi/prototype masih muncul pada beberapa halaman indikator/peta. Backend runtime sudah PocketBase, tetapi data lokal juga memuat record simulasi historis. Tidak menghapus penanda seolah data tersebut resmi; copy dan penanda status data perlu diaudit saat rilis.
- Tombol Kirim perbaikan pada revisi rekening bisa aktif sebelum isian diubah, walaupun petunjuk meminta perbaikan. Pemeriksaan kode menemukan server menolak revisi tanpa perubahan. Tidak menekan tombol itu pada pengajuan asli lokal hanya untuk menguji penolakan, dan tidak menonaktifkan berdasarkan revisionBlockers saja karena revisi dokumen dapat dibuat ulang saat submit. Perlu QA khusus dengan pengajuan sintetis untuk membuktikan perilaku semua lingkup revisi.
- Peta menampilkan 43 kampus belum dapat dipetakan karena koordinat kosong/tidak valid. Empty state terlihat, bukan crash; belum memverifikasi kelengkapan koordinat tiap record sumber.
- Pemilih akun lokal adalah alat QA development, bukan bukti login email yang valid/Microsoft SSO production. SSO, pergantian role, pemulihan password dan produksi tidak diuji.
- Hari ini tidak mengulang pengisian baru lengkap, upload valid, autosave saat jaringan lambat, pengajuan, pemeriksaan, tanda tangan, lampiran, dan pembayaran dalam satu siklus. Bukti siklus sebelumnya ada di QA-EDGE-CASES-DAN-14-REVISI-2026-10-07.md; bukan pengganti bukti setelah perubahan hari ini.
- Tidak menjalankan tes/check/lint/build terminal, load test, uji dua admin serentak, kegagalan storage/DB di tengah transaksi, atau deployment. Tidak ada commit/push/perubahan production.

Kesimpulan: empat masalah kejelasan yang ditemukan sudah diperbaiki dan dicek ulang pada browser lokal. Skenario yang diuji memberikan hasil sesuai tabel; belum cukup untuk klaim seluruh flow atau production bebas error.
