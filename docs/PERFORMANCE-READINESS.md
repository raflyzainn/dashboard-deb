# Pemeriksaan performa dan respons halaman

Validasi lokal 15 September 2026, Chrome melalui Playwright, PocketBase terisolasi dengan 40 kampus, 30 definisi, dan 1.200 indikator. Angka berikut adalah ukuran body JSON UTF-8 sebelum kompresi, bukan waktu respons atau kapasitas pengguna serentak.

## Perubahan

- Workflow memuat koleksi dan record sesuai operasi; histori notifikasi, audit, proposal, dan receipt tidak lagi ikut dibaca pada setiap mutasi.
- Tandai semua notifikasi berjalan dalam batch 500 dengan receipt retry per batch. Transaksi master yang melewati kapasitas ditolak sebelum ada penyimpanan sebagian.
- Rate limit membaca key terkait dan membersihkan maksimal 100 record kedaluwarsa per panggilan, termasuk ketika permintaan ditolak. Key aktif tetap dipertahankan.
- Dashboard admin, daftar kampus, dan peta menerima ringkasan capaian per kampus. Review menerima indikator terkini hanya untuk kampus dengan pengajuan pending; snapshot pengajuan dan feedback tetap tersedia.
- Query halaman memilih field yang dipakai mapper. Proposal/indikator kampus hanya memuat identitas kampus sendiri; forum tetap membutuhkan direktori kampus untuk nama penulis.

## Pengukuran sebelum dan sesudah

| Respons halaman | Sebelum (byte) | Sesudah (byte) | Pengurangan |
| --- | ---: | ---: | ---: |
| Dashboard admin | 246.792 | 30.986 | 87,4% |
| Daftar kampus admin | 243.509 | 27.703 | 88,6% |
| Peta admin | 243.509 | 27.703 | 88,6% |
| Review kampus / alias indikator admin | 293.472 | 115.609 | 60,6% |
| Proposal kampus | 7.176 | 713 | 90,1% |

Statistik dashboard tetap 40 kampus, progres rata-rata 66%, proposal 35/40, dan 10 kampus memerlukan tindak lanjut. Paritas perhitungan ringkasan dengan data indikator lengkap diuji pada unit test dan tampilan dashboard.

## Cakupan Playwright

25 rute/variasi: dashboard, proposal, daftar/detail forum, FAQ, dan notifikasi untuk kedua role; review beserta alias, daftar kampus, tab akun beserta alias, peta, master, empat tab detail kampus untuk admin; indikator dan panduan untuk kampus.

Audit memakai respons API nyata. Pemeriksaan mencakup status API, koleksi yang dikirim, scope detail kampus/pertanyaan, error JavaScript, tampilan NaN, dan overflow pada viewport 390 piksel. Respons tambahan juga diukur: akun 1.539 byte, master 8.829 byte, audit master kosong 51 byte. Identitas sesi tetap dimuat untuk autentikasi dan navigasi.

Enam tes browser utama lulus, termasuk perubahan password kedua role, pencabutan sesi lama, edit PIC, aktivasi email lokal, login/logout, dan audit 25 halaman. Empat tes tambahan lulus untuk statistik/peta, hasil navigasi terlambat, refresh halaman setelah mutasi, retry kegagalan, dan respons kosong. Mock hanya digunakan pada tes tambahan untuk mensimulasikan keterlambatan/kegagalan; pengukuran payload tidak memakai mock.

Artefak lokal: `.qa/production-readiness/admin-page-payload.json`, `campus-page-payload.json`, dan `admin-dashboard.png`. JSON menyimpan ukuran/jumlah/status, tanpa isi record atau kredensial.

## Menjalankan ulang

Verifikasi akhir: 37 unit/regression test dan 16 tes PocketBase native lulus; pemeriksaan Svelte/TypeScript menghasilkan 0 error dan 0 warning. Skenario native mencakup 2.100 notifikasi, retry, batas transaksi, pembersihan rate limit, rollback, scope pengguna, dan alur pengajuan/review.

```sh
npm test
npm run check
npm run build
npx tsx --test --test-concurrency=1 tests/pocketbase/performance.test.ts tests/pocketbase/masters.test.ts tests/pocketbase/workflows.test.ts
```

Tes PocketBase membuat database disposable dan membutuhkan port 8097 kosong. Untuk browser, jalankan `npm run p1:sandbox` dan `npm run mail:serve` di terminal terpisah, lalu `npm run test:p1` untuk fixture lokal dan `npm run test:e2e:p1`. Hentikan sandbox sebelum menjalankan tes disposable di atas.

## Batas dan penerapan

- Schema menambah `idx_auth_limits_until` pada `auth_limits(until)`. Pastikan index ini diterapkan di PocketBase tujuan saat maintenance; perubahan source tidak mengubah database production. Provisioning penuh juga memiliki efek konfigurasi autentikasi, sehingga gunakan prosedur deployment yang sudah ada.
- Ringkasan mengurangi transfer ke browser, tetapi server masih membaca indikator untuk menghitung agregat. Daftar/forum/riwayat yang memakai `getFullList()` masih perlu pagination atau agregasi database ketika volumenya meningkat.
- Fence revisi masih global; write serentak lintas pengguna dapat saling retry. Batch master memiliki batas 1.999 operasi penyimpanan ditambah satu fence. Perubahan ini tidak membuktikan throughput pada beban production.
- Tidak ada error aplikasi yang ditemukan dalam cakupan pengujian ini. Load test, konfigurasi Cloudflare Pages, dan pengujian production belum dilakukan; hasil ini bukan jaminan seluruh aplikasi bebas bug.
