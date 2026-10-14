# Perbaikan kemudahan penggunaan Pencairan ? 6 Oktober 2026

## Pembaruan sesuai arahan pengguna

Pada QA development 6 Oktober, panel global kelengkapan dikelompokkan dihapus atas permintaan pengguna. Validasi per bagian dan penguncian tombol pengajuan ketika belum lengkap tetap berlaku. Pesan error unggah inline yang berulang juga dihapus; penolakan ukuran/format tetap ditampilkan melalui snackbar. Playwright Chrome terlihat memeriksa autosave, kegagalan simpan, retry, dan penolakan file setelah perubahan tersebut. Hasil terbaru: [QA development 14 poin](QA-DEVELOPMENT-14-POIN-2026-10-06.md).

## Lingkup

Branch lokal `fix/pencairan-onboarding`, berdasarkan `development` pada `9c3345c`.
QA memakai Playwright dengan Chrome terlihat pada dummy `127.0.0.1:5191`, dalam konteks browser terpisah. Data dan layanan production tidak disentuh. Poin revisi 4?7 tidak diimplementasikan dalam pekerjaan ini.

## Temuan dan perubahan

| Temuan | Perubahan |
| --- | --- |
| Hanya Data Program menyimpan otomatis; form Administrasi/PKS masih manual. | Autosave 800 ms pada Data Program, Rekening Penerima, Penandatangan Kampus, Identitas Surat dan Kop, serta PKS. RAB tetap menggunakan autosave yang sudah ada. |
| Pindah menu meminta simpan draf melalui popup. | Perpindahan menu/logout menyimpan dan menunggu permintaan yang masih berjalan. Gagal simpan menahan navigasi, mempertahankan isian dan menyediakan retry. Konflik data dari akun lain tetap meminta keputusan pengguna. |
| Daftar kelengkapan menampilkan puluhan pesan sekaligus. | Ringkasan dikelompokkan menurut menu, satu tautan per bagian, jumlah isian dan rincian tertutup secara default. Validasi sebelum pengajuan tetap berlaku. Draf tidak mengunci perpindahan menu. |
| Tautan kop surat membuka Rekening Penerima. | Validasi kop surat diarahkan ke Identitas Surat dan Kop. |
| Nomor PF dummy terlihat tersedia tetapi validasi meminta tombol yang tersembunyi. | Nomor simulasi tidak dianggap nomor terbit. Tampil `masih menunggu surat dari PF`; tidak menghalangi kelengkapan kampus atau pembuatan draf dokumen. Submit berhasil menandai permintaan PF sekali. Adapter lokal yang sudah ada mendeteksi flag tersebut untuk notifikasi admin. |
| Submenu Penandatangan/Surat tidak memiliki Ajukan Revisi. | Tombol memakai scope Administrasi yang sudah ada. Keterangan menjelaskan cakupan Rekening, Penandatangan, serta Surat/Kop; Program, RAB dan PKS tetap terkunci. |
| Sebagian petunjuk masih menggunakan istilah bukti rekening. | Petunjuk kampus dan error admin memakai foto buku rekening. |
| PDF PKS memanjang, memiliki halaman kosong dan logo header terpotong. | Paginasi mengikuti ukuran halaman template, memindahkan paragraf/tabel utuh, mengabaikan cache page break Word, mengulang footer dan membetulkan anchor logo. |
| Placeholder KOP UNIVERSITAS masih tampil bersama kop yang diunggah. | Placeholder header template dibersihkan ketika kop kampus dimasukkan, berlaku untuk DOCX dan PDF baru. |

Autosave menyimpan isian draf. Mengajukan paket, mengirim revisi, menyetujui akses, mencatat dokumen asli, menyimpan lampiran administrasi final dan mencatat pembayaran tetap merupakan tindakan eksplisit pengguna.

## Hasil QA

- Alamat berjenjang, kode pos otomatis, reset turunan ketika provinsi berubah, alamat manual dan kode pos manual bertahan setelah reload: lulus.
- Navigasi/menu Administrasi pada desktop dan mobile 390 px: lulus; tidak ada overflow horizontal.
- Autosave empat form tambahan, pindah menu sebelum debounce, reload, tautan kop dan ringkasan tertutup: lulus.
- Simulasi kegagalan penyimpanan: isian tetap ada, navigasi ditahan, retry tersimpan setelah reload: lulus.
- Poin 13: hanya Program dibuka, perubahan bidang lain ditolak API, submit tanpa perubahan ditolak, persetujuan/versi lain bertahan dan submit mengunci kembali: lulus.
- Poin 14: alasan wajib, pending tetap terkunci, duplikat ditolak, kampus tidak boleh menyetujui, penolakan wajib beralasan, bisa request ulang: lulus.
- Request dari submenu Surat diarahkan ke Administrasi; persetujuan admin membuka Administrasi, revisi penandatangan autosave, Program tetap terkunci, kirim perbaikan mengunci kembali: lulus.
- Kampus mengirim empat dokumen bertanda tangan; admin mencatat empat asli, menyimpan lampiran dan mencatat pembayaran; status bertahan setelah reload dan kampus terkunci setelah bayar: lulus.
- PDF PKS 17 halaman, permohonan 2, invoice 1 dan kuitansi 1: A4, unduhan valid, tanpa halaman kosong, teks isi sebelum/sesudah paginasi sama; QR tanpa logo dan logo header diperiksa visual.

Pemeriksaan final setelah pembersihan placeholder kop dicatat dalam artefak `.qa/onboarding/` dan skrip browser di `scripts/qa/pencairan-{onboarding,regression,pdf}.playwright.mjs`.

## Batas hasil

- QA ini membuktikan flow dummy development. Pengiriman notifikasi/email nyata PocketBase-local dan production belum diuji; flag permintaan otomatis serta pemanggil adapter diperiksa pada kode.
- PDF browser belum dijanjikan identik dengan Microsoft Word. Paragraf/tabel tunggal yang lebih tinggi dari satu halaman menghasilkan error dengan petunjuk unduh DOCX, bukan konten terpotong.
- QR diperiksa visual; pemindaian kamera belum diuji.
- Build sebelum pengiriman GitHub: `npm run build` berhasil (exit 0), adapter-static menulis `build/`. Warning: beberapa chunk lebih dari 500 kB (antara lain 525,48 kB dan 936,79 kB). Log lokal: `.qa/onboarding/build-release.log`.
- Check, lint dan test suite lainnya tidak dijalankan. Tidak melakukan merge atau deploy.
