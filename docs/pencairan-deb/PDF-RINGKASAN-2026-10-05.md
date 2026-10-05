# PDF otomatis sesuai data pengajuan

## Perilaku

Pada branch fix/dokumen, bagian Administrasi, PKS, dan Ringkasan menampilkan PKS, permohonan, invoice, dan kuitansi yang sudah dibuat tanpa klik Pratinjau. Ini berlaku juga pada /campus/pencairan?butir=pks.

PDF bersumber dari DOCX pengajuan yang sama dengan tombol DOCX: nomor PKS PF, nomor PKS kampus, rekening, nama, dan data lain tidak diambil dari contoh tetap. Simpan perubahan form lalu buat ulang dokumen jika ditandai kedaluwarsa. Versi pengajuan terkunci tetap mengikuti arsip versi yang dipilih; data terkini tidak mengganti isi arsip secara diam-diam.

Tombol kartu ringkas (tinggi minimum 36 px): Buat ulang, PDF, DOCX. Tautan unduh tambahan pada FileViewer disembunyikan lewat showDownload=false, dan judul Pratinjau berulang dihapus. Toolbar bawaan pembaca PDF browser tetap tersedia.

## Mode dummy statis (5185 dan deployment)

- createApi menangani GET format=pdf melalui engine dokumen yang sama, termasuk pemeriksaan akses, sebelum konversi.
- browser-document-pdf.ts menggambar DOCX dengan docx-preview dalam dokumen iframe terpisah. html2canvas membuat gambar tiap halaman; pdf-lib menyusunnya menjadi PDF. Tidak mengirim dokumen ke layanan eksternal.
- Kop, isi, dan footer berasal dari DOCX. QR polos berisi identitas simulasi berdasarkan hash sumber; bukan verifikasi resmi.
- PDF berupa gambar halaman: teks belum dapat diseleksi/dicari. Tata letak mengikuti docx-preview dan font browser, sehingga bisa berbeda dari Microsoft Word/LibreOffice.
- Cache di memori menggunakan SHA-256 isi DOCX, maksimum 8 dokumen atau 32 MB. Preview dan unduhan berbagi hasil yang sama. Permintaan konversi diproses berurutan dan permintaan serentak dengan sumber sama digabungkan; kegagalan dapat dicoba ulang.
- Aset PDF contoh tetap dan skrip pembuatnya sudah dihapus. Tidak perlu LibreOffice pada deployment statis.

## Mode PocketBase lokal (5176)

- GET format=pdf melewati otorisasi kampus/admin dan pemeriksaan versi yang sudah ada; download=1 menghasilkan attachment.
- DOCX diberi QR polos lalu dikonversi LibreOffice lokal. PDF memiliki kode, hash SHA-256, dan cache plain-pdf-1 tersendiri.
- Antrean maksimum 12 permintaan aktif/menunggu. Profil dan folder sementara per proses, timeout 60 detik, lalu dibersihkan. Hasil disimpan melalui object storage lokal yang sudah ada.
- Backend konversi hanya aktif pada development dengan instance lokal 8097. Tidak mengubah konfigurasi atau layanan production.
- Jalankan npm run dev:local dan buka http://127.0.0.1:5176. DEB_LIBREOFFICE_PATH dapat dipakai untuk lokasi instalasi khusus.

## Status pemeriksaan

Pemeriksaan kode mencakup sumber DOCX yang sama untuk tampilan/unduhan, penggantian cache ketika isi berubah, dan pemisahan mode dummy dengan backend lokal. QA browser belum dilakukan karena tool browser tidak tersedia. Build mode mockup pada 6 Oktober 2026 setelah perubahan konversi browser berhasil (exit 0), dengan warning chunk lebih dari 500 kB. Build tidak memverifikasi hasil visual atau konversi runtime. Check, lint, dan tes terminal tidak dijalankan sesuai instruksi pengguna.

html2canvas 1.4.1 ditambahkan. npm melaporkan Node lokal 24.10.0 berbeda dari kebutuhan repo 22.x, serta 12 temuan audit dependensi (4 rendah, 5 sedang, 3 tinggi); belum dianalisis dan tidak dijalankan audit fix. Publikasi ke branch fix/dokumen dan PR ke development diminta pengguna pada 6 Oktober 2026.
