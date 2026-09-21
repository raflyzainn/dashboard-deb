# Simbol status tabel pencairan

Disetujui dan diterapkan lokal pada 19 September 2026, tanpa perubahan data atau hak akses.

Dashboard Pencairan dan tabel Tahap 1 memakai penanda yang sama:

- ✓ Sesuai.
- × Perlu revisi, bukan penolakan final.
- ? Perlu konfirmasi.
- Ikon jam: menunggu pemeriksaan.
- — Tanpa surat kuasa / tidak diperlukan.
- ○ Belum ada berkas.

Warna tetap menjadi petunjuk tambahan. Legenda teks tersedia pada kedua tabel. Setiap tautan sel memiliki nama kampus, jenis dokumen, dan status pada label aksesibilitas; simbol dekoratif disembunyikan dari pembaca layar. Area klik berukuran 32 × 32 CSS pixel dan fokus keyboard memakai garis luar yang terlihat.

## QA browser lokal

- Kedua tabel: 184 sel memiliki simbol dan label lengkap, serta legenda enam status.
- Tab memindahkan fokus ke sel SK; bingkai fokus terlihat. Enter membuka butir SK pada kampus yang dipilih.
- Tampilan desktop diperiksa pada 1440 × 1000; tampilan Tahap 1 pada 390 × 844 diperiksa untuk legenda dan gulir tabel.
- Bukti lokal: `.playwright-mcp/pencairan-simbol-desktop.png` dan `.playwright-mcp/pencairan-simbol-mobile.png`.
- Tidak menjalankan tes/check/build terminal. Belum menguji dengan pembaca layar nyata atau melakukan audit aksesibilitas menyeluruh.

Pemeriksaan regresi singkat berikut dapat dijalankan di Console browser setelah membuka salah satu tabel sebagai admin lokal (tidak mengubah data):

```js
const legend = document.querySelector('[aria-label="Keterangan simbol status"]');
const cells = [...document.querySelectorAll('table a[aria-label]')];
if (legend?.children.length !== 6 || !cells.length) throw Error('Legenda atau tabel belum lengkap');
for (const cell of cells) {
  if (!cell.querySelector('[aria-hidden="true"]') || !cell.getAttribute('aria-label').includes(' · ')) {
    throw Error('Simbol atau label sel belum lengkap');
  }
}
```
