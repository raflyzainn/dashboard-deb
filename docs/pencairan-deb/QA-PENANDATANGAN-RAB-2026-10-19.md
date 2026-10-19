# Penandatangan PKS terpisah dan tanda tangan RAB otomatis

Sumber: review Dashboard DEB 10 Oktober 2026, slide Proses Pencairan Dana. Keputusan 51.

## Perubahan

- Tab Penandatangan Kampus: label menjadi Nama dan Jabatan penandatangan PKS. Petunjuk lama "Gunakan satu perwakilan kampus..." diganti dengan "PKS ditandatangani pejabat kampus yang berwenang, misalnya rektor, wakil rektor, atau mentor." Di bawahnya ada kotak baca saja: penandatangan RAB, surat permohonan, invois, dan kuitansi adalah Mentor dari Data Program.
- Surat permohonan, invois, dan kuitansi tidak lagi mengganti nama Mentor dengan penandatangan PKS. Baris Koordinator pada tiga surat itu tetap dihapus.
- Perubahan penandatangan PKS hanya menandai PKS untuk dibuat ulang, tidak lagi ketiga surat lainnya.
- RAB yang diunduh kampus dan admin: blok tanda tangan berisi `Kota, tanggal unduhan`, nama Mentor, dan nama Koordinator. Templat kosong tidak berubah.

## Test dan build

- Test baru `tests/penandatangan-rab.test.ts` (3 test): blok tanda tangan RAB terisi, templat kosong tetap berisi isian, surat memakai Mentor dan PKS tetap memakai pejabat PKS. Lulus.
- Test suite penuh: kegagalan yang tersisa (manual item drafts, signed DOCX, p1-legal, page-reads, dan dua test transaksi yang kadang gagal) juga gagal pada `production` tanpa perubahan ini.
- `npm run build` lulus. `npm run check` hanya melaporkan error yang sudah ada di modul monitoring, pelaporan, dan LPJ, tidak ada di berkas yang diubah.

## QA browser 19 Oktober 2026

Playwright pada dev server branch di port 5178 dan PocketBase lokal 8097, akun lokal kampus berstatus draf dengan RAB tujuh baris.

1. API RAB mengembalikan nama Mentor dan Koordinator.
2. Tombol unduh RAB 100% menghasilkan berkas dengan baris `<kota>, 19 Oktober 2026`, tanpa `(Nama Mentor)`, `(Nama Koordinator)`, atau `DD-MM-YY`. Kampus uji belum mengisi kota, sehingga kota tetap titik titik untuk ditulis tangan.
3. Tab Penandatangan Kampus menampilkan label PKS, petunjuk baru, dan kotak Mentor; teks lama hilang.
4. Lebar 390 px tanpa overflow horizontal. Tidak ada error halaman.

Production dan data kampus asli tidak dimutasi.
