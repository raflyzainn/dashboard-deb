# QA Beranda dan breadcrumb, 7 Oktober 2026

QA memakai tool Playwright pada server lokal `http://127.0.0.1:5176`,
PocketBase lokal 8097, akun Universitas Pasir Pangaraian dengan pengajuan draf.
Tidak mengubah isian atau mengunggah dokumen. Endpoint `/api/health` menjawab 200.

## Perubahan dan hasil

- Sebelum perubahan: viewport 1366×768 memiliki tinggi dokumen 910 px.
- Padding dan jarak kartu dirapatkan, paragraf pengantar yang berulang dihapus.
  Sapaan, status aktual, tindakan pengajuan, panduan, dan footer tetap tampil.
- Sesudah perubahan: tinggi dokumen sama dengan tinggi viewport pada 1920×911,
  1366×768, 1366×658, 1280×720, serta 390×844. Tidak ada scroll horizontal.
- Pada 320×740 konten tetap dapat digulir vertikal, tanpa overflow horizontal.
- Pencairan menampilkan `Ruang kerja / Beranda / Pencairan Dana`.
  Klik Beranda dan aktivasi lewat Enter menuju `/campus/dashboard`.
- Breadcrumb tetap benar setelah reload langsung di Pencairan. Panduan aplikasi
  juga memiliki tautan Beranda. Halaman aktif memakai `aria-current="page"`.
- Screenshot desktop dan mobile diperiksa. Breadcrumb mobile tidak menabrak menu akun.
- Tidak ada pageerror pada pemeriksaan navigasi terakhir setelah reload.
  Sesi awal tanpa login menghasilkan 401 `/api/session`; selama HMR sempat ada
  warning Svelte `derived_inert`, tidak terlihat lagi setelah reload penuh.

Bukti lokal: `.playwright-mcp/beranda-compact-desktop-20261007.png` dan
`.playwright-mcp/breadcrumb-mobile-20261007.png`.

## Pemeriksaan ulang melalui tool Playwright

Jalankan fungsi berikut melalui `browser_run_code_unsafe` setelah login akun draf
di server lokal. Bukan perintah terminal.

```js
async (page) => {
  await page.setViewportSize({ width: 1366, height: 658 });
  await page.goto('http://127.0.0.1:5176/campus/dashboard');
  const action = page.getByRole('link', { name: 'Lanjutkan pengajuan', exact: true });
  await action.waitFor();
  const fits = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollHeight <= root.clientHeight && root.scrollWidth <= root.clientWidth;
  });
  if (!fits) throw new Error('Beranda membutuhkan scroll');
  await action.click();
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await breadcrumb.getByRole('link', { name: 'Beranda', exact: true }).click();
  await action.waitFor();
  if (new URL(page.url()).pathname !== '/campus/dashboard') throw new Error('Tujuan Beranda salah');
}
```

Tes terminal, check, dan lint tidak dijalankan. Alur lama dengan banyak tugas
unggahan, semua status pengajuan, dan deployment tidak diuji pada sesi ini.
Production tidak diubah.

## Build sebelum publikasi

Atas permintaan push langsung ke `development` GitHub dan GitLab, `npm run build`
dijalankan pada 7 Oktober 2026 dan berhasil dengan exit 0. Mode `mockup` memakai
adapter-static dan menghasilkan direktori `build/`. Hasil ini merupakan bukti
build lokal, bukan bukti deployment.
