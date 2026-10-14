# Perbaikan awal privasi pengajuan - 12 Oktober 2026

Lingkup: poin 1 yang disetujui pengguna, yaitu izin revisi dokumen, penyamaran rekening pada ringkasan/riwayat, serta pemeriksaan akses berkas. Basis development `5fc1855`; QA dilakukan lokal tanpa perubahan production. Pengguna kemudian meminta commit dan push ke development.

## Perubahan

- `canEditField` dan `canUploadFile` memeriksa field/file pada lingkup revisi yang benar-benar terbuka. Revisi `dokumen` tidak lagi memberi izin mengubah nomor PKS kampus. Navigasi PKS dan regenerasi dokumen tetap memakai izin bagian yang sudah ada, sehingga kampus dapat mengirim perbaikan dokumen tanpa membuka isian.
- Helper penyamaran rekening yang sudah ada dipindah ke modul bersama. Backend tetap mengekspor nama `mask` agar pemanggil lama tetap kompatibel. Ringkasan dan seluruh riwayat menampilkan hanya tiga digit terakhir; nomor pendek disamarkan seluruhnya. Layar Rekening tetap menampilkan nomor lengkap bagi akun yang berhak.
- Guard akses berkas yang sudah ada ditelusuri dan diuji; tidak ditemukan kebutuhan mengubah otorisasi endpoint dalam cakupan ini.
- Dua tes regresi ditambahkan di `tests/pengajuan-privacy.test.ts`, tetapi runner terminal tidak dijalankan sesuai AGENTS.md.

Penyamaran adalah perubahan tampilan, bukan enkripsi atau penghapusan nomor dari data sumber/API yang memang dibutuhkan akun berwenang. Dokumen resmi tidak diubah atau ditutup sebagian; aksesnya tetap mengikuti otorisasi server.

## QA browser aktual

Tool Playwright, frontend `http://127.0.0.1:5176`, PocketBase lokal bertanda 8097. Akun admin-1 dan satu akun sementara campus-909 menggunakan konteks terpisah. Akun QA lama yang telah dihapus tidak dihidupkan kembali. Pengajuan sintetis `1aaa9f6a9c7d798` dipakai ulang; kampus/dokumen production tidak diubah.

| Skenario | Hasil |
|---|---|
| Sebelum perbaikan: revisi dokumen mengizinkan nomor PKS | Pemeriksaan helper di browser menghasilkan true; kebocoran izin API telah dibuktikan pada QA awal sesi ini. |
| Sesudah perbaikan: PF mengganti nomor PKS | PATCH PF 200, lingkup terbuka hanya dokumen. Input nomor kampus disabled. PATCH nomor kampus ditolak 400 dengan pesan isian terkunci. |
| Regenerasi/kirim revisi dokumen | Berhasil; status kembali menunggu, riwayat bertambah sekali, stale kosong, nomor kampus tetap sama. |
| Revisi PKS biasa | Review admin 200, nomor PKS kampus enabled; kirim tanpa perubahan disabled; edit dan kirim perbaikan berhasil. |
| Lingkup dokumen + Program | Pemeriksaan helper: judul Program boleh diedit, nomor PKS tetap ditolak. Tidak menjalankan putaran mutasi gabungan end-to-end. |
| Izin unggah | Helper mengizinkan rekening pada revisi administrasi dan menolak rekening pada dokumen saja. |
| Ringkasan dan lima riwayat | Hanya tiga digit terakhir terlihat. Nomor lengkap tidak ditemukan pada teks main. |
| Layar Rekening | Nomor lengkap tetap tersedia untuk akun pemilik kampus yang sah. |
| Berkas rekening/PKS kampus sendiri | 200; Cache-Control no-store, private; X-Content-Type-Options nosniff. |
| Tanpa sesi membuka rekening/PKS | 401. |
| Membaca rekening, PKS, lampiran, bukti transfer kampus lain | Seluruhnya 403. |
| ID versi dari kampus lain dipasang pada URL kampus sendiri | Ditolak 400 tanpa berkas. |
| Mobile 390 x 844 | Ringkasan tersamarkan; scrollWidth 380, tidak melebihi viewport 390. |

Screenshot lokal: `output/qa-privacy-summary-20261012.png` dan `output/qa-privacy-mobile-20261012.png`.

Konteks QA ditutup setelah pemeriksaan. Akun sementara dan notifikasi/receipt miliknya dibersihkan; metadata cleanup berada pada `.local/pocketbase/maintenance/qa-privacy-20261012`. Pengajuan sintetis dan riwayat QA dipertahankan.

## Batas

Tidak menjalankan test suite, check atau lint terminal. Build wajib sebelum publikasi yang diminta pengguna berhasil exit 0 dengan adapter Cloudflare pada kode perbaikan ini; warning punycode dan chunk lebih dari 500 kB. Log lokal `output/build-privacy-20261012.log`. Tes regresi yang ditambahkan belum dieksekusi. Tidak melakukan deploy. Pemeriksaan ini tidak mencakup enkripsi hosting, retensi, hak subjek data, SOP insiden, SSO/email/R2 production, atau uji beban; bukan pernyataan kepatuhan UU PDP menyeluruh.
