# Digitalisasi DEB

Prototype monitoring DEB Putih untuk Admin Pertamina Foundation dan 40 kampus mitra. Seluruh data merupakan simulasi. Aplikasi berjalan tanpa backend aktif, dengan penyimpanan lokal browser yang tetap tersedia setelah refresh dan pergantian role.

## Menjalankan

Prasyarat: Node.js 22 LTS (minimal 22.13) dan npm. Tidak memerlukan `.env`, akun, atau server PocketBase.

```powershell
cd dashboard-deb
npm install
npm run dev
```

Buka **http://127.0.0.1:5176**. Port menggunakan `strictPort`; jika terpakai, pilih secara eksplisit:

```powershell
npm run dev -- --port 5178
```

Gunakan origin yang sama selama demo. `localhost:5176` dan `127.0.0.1:5176` memiliki penyimpanan browser berbeda, begitu juga port lain.

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Server pengembangan pada port 5176 |
| `npm run check` | TypeScript strict dan pemeriksaan Svelte |
| `npm test` | Pengujian domain dan transaksi IndexedDB menggunakan fake-indexeddb |
| `npm run test:e2e` | Pengujian browser Playwright, Microsoft Edge headless |
| `npm run build` | Build melalui adapter Vercel |
| `npm run preview` | Preview pada port 4176 |

Suite E2E memakai Microsoft Edge yang terpasang di komputer. Jika tidak tersedia, pasang browser Chromium dengan `npx playwright install chromium`, lalu hapus `channel: 'msedge'` dari konfigurasi Playwright. Suite otomatis menyalakan server dev bila belum berjalan; test port default adalah 5176.

## Deployment Vercel

Proyek memakai `@sveltejs/adapter-vercel`, preset `sveltekit` pada `vercel.json`, dan Node.js 22.x. Adapter menghasilkan `.vercel/output` berisi konfigurasi routing, aset statis, dan fungsi server. Folder ini diabaikan oleh Git.

Pada Vercel, gunakan root repository, Framework Preset **SvelteKit**, Build Command **npm run build**, dan Output Directory **default / override dimatikan**. Jangan isi Output Directory dengan `public`, `static`, atau `.svelte-kit/output/client`. `vercel.json` mengembalikan output directory ke default framework.

Deploy commit terbaru dari branch `main`. Redeploy deployment lama dapat tetap memakai commit lama yang masih menggunakan adapter Cloudflare. Log sukses harus menunjukkan `Using @sveltejs/adapter-vercel`. Verifikasi build lokal tidak menjamin deployment Vercel sudah aktif.

Prototype tidak memerlukan environment variable atau backend untuk demo. Data tetap disimpan per browser dan origin; deployment baru dengan domain berbeda memiliki penyimpanan yang berbeda.

Referensi: [adapter Vercel SvelteKit](https://svelte.dev/docs/kit/adapter-vercel) dan [konfigurasi Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Fitur dan alur demo

### Kampus

Klik **Masuk sebagai Kampus** untuk menggunakan Universitas Contoh. Tersedia dashboard, 30 indikator dalam tiga bidang, pembaruan nilai aktual dan catatan, feedback Admin, upload proposal PDF dan riwayat versi, forum bersama, serta FAQ.

### Admin PF

Klik **Masuk sebagai Admin PF** untuk melihat ringkasan dan daftar 40 kampus. Gunakan **Review Kampus** untuk memeriksa pengajuan, meminta revisi, dan mengonfirmasi data DEB. Admin membaca nilai isian kampus dan memberi feedback per indikator; angka hanya dapat diubah oleh kampus. Alur lengkap dan riwayat versi dijelaskan dalam [Review Kampus](docs/REVIEW-KAMPUS.md). Admin dapat membaca proposal seluruh kampus, menjawab pertanyaan, serta mengelola FAQ.

### Demo revisi lintas role

1. Admin → Kampus mitra → Universitas Contoh → Indikator → Tinjau → isi feedback dengan **Minta revisi data** aktif.
2. Keluar/ganti peran → Kampus → Indikator → Perbarui nilai aktual dan catatan.
3. Masuk kembali sebagai Admin → feedback berubah menjadi **Sudah ditanggapi**.
4. Pilih **Tandai selesai** untuk menutup revisi. Riwayat feedback tetap tersimpan.

Login Kampus selalu mewakili Universitas Contoh; gunakan kampus ini untuk demo lintas role. Nama dan aktivitas kampus lain merupakan data fiktif untuk menunjukkan monitoring dan forum lintas kampus.

### Demo proposal

Kampus → Proposal → Unggah versi baru → pilih PDF maksimal 10 MB → isi catatan perubahan → Ajukan. Versi lama tetap dapat dibuka dan diunduh, termasuk setelah refresh. Validasi memeriksa ekstensi, MIME bila tersedia, ukuran, dan signature `%PDF-`; ini bukan pemeriksaan lengkap terhadap struktur atau keamanan dokumen.

PDF contoh dibuat sebagai dokumen PDF valid dengan konten simulasi. Ringkasan perubahan pada versi seed diberi label simulasi. Upload pengguna memiliki catatan perubahan manual.

Bagian **Bandingkan versi proposal** membaca teks dari dua PDF yang dipilih. Pilih versi dasar dan pembanding secara bebas, tukar arah, lalu tinjau baris merah yang dihapus dan baris hijau yang ditambahkan. Tersedia tampilan berdampingan/gabungan, filter hanya perubahan, nomor baris/halaman, dan akses PDF asli. Gambar, format, serta PDF scan tanpa teks tidak dibandingkan. Detail: [Perbandingan proposal](docs/PERBANDINGAN-PROPOSAL.md).

### Forum bersama dan FAQ

Forum dapat dibaca seluruh kampus dan Admin **setelah masuk**, termasuk pertanyaan kampus lain. Dataset forum sama untuk kedua role; bukan percakapan privat. Kampus membuat pertanyaan dan toggle like. Admin memberikan satu jawaban resmi yang dapat diperbarui, lalu bisa menjadikannya FAQ.

Pertanyaan mendukung beberapa kategori topik: Indikator & baseline, Proposal, Social Mapping, Theory of Change (ToC), IKM, Energi, Ekonomi, Sosial, dan Umum. Filter kategori dapat digabungkan dengan kata kunci, status jawaban, dan urutan popularitas. Pencarian mencakup judul, isi pertanyaan, dan isi jawaban Admin. Kategori berasal dari topik brief dan roadmap, terpisah dari kelompok kampus serta level DEB. Detail: [Kategori forum](docs/KATEGORI-FORUM.md).

FAQ menyimpan salinan pertanyaan/jawaban. Mengubah jawaban di forum tidak otomatis mengubah FAQ. FAQ dapat diedit, diurutkan saat filter pencarian kosong, dan dihapus tanpa menghapus pertanyaan sumber.

### Notifikasi

Buka menu **Notifikasi** atau ikon lonceng pada header. Kampus menerima pemberitahuan feedback, penyelesaian feedback, dan jawaban atas pertanyaannya. Admin menerima pembaruan indikator, upload proposal, dan pertanyaan baru. Tersedia filter belum dibaca, tandai dibaca, tandai semua dibaca, serta tautan detail.

Halaman juga memuat contoh berlabel **Simulasi**, dengan campuran status dibaca dan belum dibaca. Sepuluh contoh tambahan, lima per peran, ditambahkan satu kali ke database browser lama tanpa reset. Notifikasi yang sudah ada dan status bacanya tetap dipertahankan. Detail: [Notifikasi](docs/NOTIFIKASI.md).

Notifikasi memakai IndexedDB lokal seperti fitur lainnya. Belum ada email, push notification, atau sinkronisasi lintas perangkat. Gunakan tombol Muat ulang atau buka ulang halaman setelah perubahan dari tab lain.

## Progres dan status

- Capaian indikator = `min(current / target × 100, 100)`.
- Progres kampus = rata-rata seluruh 30 capaian indikator; rata-rata keseluruhan = rata-rata progres 40 kampus.
- Indikator tercapai jika `current >= target`. Jumlah tercapai ditampilkan terpisah dari rata-rata progres.
- Baseline dan target merupakan referensi tetap. Nilai aktual harus hingga dan tidak negatif; boleh melebihi target.
- Status feedback terpisah dari progres numerik: `open` → `responded` → `closed`.
- KPI tindak lanjut kampus menghitung indikator unik dengan revisi aktif; KPI Admin menghitung kampus unik yang memiliki revisi aktif. Badge navigasi menghitung jumlah feedback revisi aktif.

Seed awal: 40 kampus, 1.200 nilai indikator, 35 kampus dengan proposal, dan 10 kampus dengan feedback revisi aktif. Universitas Contoh memiliki progres 76%, 12 indikator tercapai, dan tiga versi proposal. Nilai ini dihitung dari seed, bukan angka dashboard yang ditulis terpisah.

## Struktur dan stack

SvelteKit 2 / Svelte 5, TypeScript strict, Tailwind CSS 4, adapter Vercel, Dexie, dan font Plus Jakarta Sans lokal. Ilustrasi dan chart sederhana dibuat dengan SVG/CSS sehingga tidak membutuhkan layanan gambar atau chart eksternal.

```text
src/lib/
  types.ts                  entitas dan kontrak DataService
  domain.ts                 perhitungan progres dan format
  data/                     seed, fixture PDF, implementasi mock
  state.svelte.ts           sesi demo, loading, error, notifikasi UI
  components/               shell dan komponen UI bersama
src/routes/
  +page.svelte              pengalihan awal ke login/dashboard
  login/+page.svelte        pemilihan role
  (app)/
    +layout.svelte          shell aplikasi dan penjagaan role
    _components/            tampilan fitur bersama Kampus/Admin
    campus/
      dashboard/+page.svelte
      indicators/+page.svelte
      proposal/+page.svelte
      questions/+page.svelte
      questions/[id]/+page.svelte
      faq/+page.svelte
    admin/
      dashboard/+page.svelte
      campuses/+page.svelte
      campuses/[id]/+page.svelte
      indicators/+page.svelte
      proposal/+page.svelte
      questions/+page.svelte
      questions/[id]/+page.svelte
      faq/+page.svelte
tests/                      pengujian domain dan browser
docs/POCKETBASE.md          kontrak dan pemetaan backend tahap berikutnya
```

Setiap halaman memiliki folder route dan `+page.svelte` tersendiri. Kelompok `(app)` tidak muncul pada URL. Tampilan fitur yang digunakan beberapa halaman ditempatkan di `src/routes/(app)/_components`; komponen UI umum tetap di `src/lib/components`. Tidak ada lagi router `[role]/[section]` atau halaman di `src/lib/pages`.

`/` mengarah ke login atau dashboard. URL role lain diarahkan ke dashboard role aktif. ID detail yang tidak valid menampilkan keadaan tidak ditemukan; URL yang tidak terdaftar ditangani oleh halaman error 404 SvelteKit.

Setelah perubahan struktur folder route atau penghapusan matcher, mulai ulang `npm run dev` jika server yang sudah berjalan masih menampilkan `No matcher found for parameter 'role'`. Pesan itu berasal dari daftar route lama pada proses dev; tidak perlu mereset data demo atau IndexedDB.

## Penyimpanan dan batasan

Data serta Blob PDF disimpan di database IndexedDB **`deb-prototype-v1`**. Pilihan role disimpan pada key session storage **`deb-demo-session`**. Seed hanya dimuat saat database belum ada. Logout menghapus sesi demo, bukan data kerja.

**Reset data demo** membutuhkan konfirmasi dan hanya mengganti data database DEB serta menghapus sesi DEB. Tindakan tersebut menghapus perubahan dan unggahan lokal; gunakan hanya saat siap kembali ke seed. Data aplikasi lain tidak disentuh.

Data tidak dibagikan antarbrowser, perangkat, atau origin. Pergantian role pada browser yang sama mendemonstrasikan kolaborasi. Tidak ada realtime atau sinkronisasi background antartab. IndexedDB dapat hilang jika pengguna membersihkan penyimpanan browser; mode privat dan keterbatasan ruang penyimpanan bisa menyebabkan kegagalan. UI menampilkan error, mempertahankan input, dan tidak mengklaim keberhasilan sebelum penyimpanan selesai.

Pembatasan role dan kepemilikan pada prototype adalah simulasi UI/service, **bukan keamanan produksi**. Seluruh data lokal dapat diperiksa oleh pemilik browser. Autentikasi nyata, otorisasi backend, aturan koleksi, dan pengelolaan berkas produksi harus ditambahkan saat migrasi PocketBase. Tidak ada request ke PocketBase atau layanan produksi, tidak ada OAuth/email/password, dan tidak ada data asli yang disertakan.

## Pengujian

Pengujian otomatis mencakup konsistensi seed, agregasi progres, validasi angka, pembatasan data, siklus revisi, upload konkuren dan validasi PDF, like unik, FAQ, persistensi, dan reset terisolasi.

Playwright memeriksa UI lintas role, upload dua PDF lalu refresh/buka/unduh, penolakan PDF palsu, Q&A sampai FAQ, persistensi, reset, route guards, daftar halaman, pencarian kosong, detail tidak ditemukan, drawer mobile, serta kegagalan penyimpanan. Browser E2E menggunakan konteks baru berisi data dummy dan tidak mengubah data demo pada browser pengguna. Bukti/trace lokal disimpan di `test-results/` dan tidak disertakan dalam source control.
