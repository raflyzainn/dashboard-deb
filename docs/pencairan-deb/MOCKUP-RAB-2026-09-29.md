# Mockup aplikasi dan pembagian RAB — 29 September 2026

Status: branch pengujian `feat/rab-dummy-all-campuses`; acuan GitLab `production` b5d9037. Dikirim ke GitHub dan GitLab atas permintaan pengguna; bukan deployment produksi.

## Menjalankan dan masuk

Jalankan `npm run dev` atau `npm run dev:rab-mockup`, lalu buka http://127.0.0.1:5182/login.
Pilih **Masuk sebagai akun lokal**. Tersedia 2 admin dan 80 akun kampus untuk 40 kampus. Berpindah akun melalui Keluar, lalu masuk lagi. Kontrol mengambang DATA DUMMY dihapus.

## UI dan data

Memakai route, layout, dan komponen SvelteKit aplikasi asli. Adapter `mockups/app` melengkapi layanan demo yang sudah ada untuk pencairan, pengguna, audit, dan pengaturan. Data disimpan di IndexedDB `deb-full-app-dummy-v1`, terpisah per kampus. Nama/logo kampus berasal dari roster aplikasi; transaksi, akun, dan dokumen adalah simulasi.

Mode Vite `mockup` mengganti layanan data dan realtime. Hooks menolak API backend sebelum membuat klien PocketBase; SK dan Excel contoh tersedia sebagai file statis. Tidak memakai koneksi PocketBase. Branch ini menggunakan adapter-static. Build tidak menyertakan layanan backend; seluruh data simulasi dikelola di browser.

## Alur RAB terbaru

1. Kampus mengunduh Excel `.xlsx` contoh, mengisi RAB 100%, lalu mengunggahnya pada butir RAB 100%.
2. Seluruh rincian terbaca dan tampil. Alokasi unggahan baru kosong, belum otomatis dibagi berdasarkan persentase.
3. Kampus memilih jumlah tiap item untuk tahap 70%. Tombol 70% memindahkan seluruh jumlah ke tahap pertama; tombol 30% memindahkan seluruhnya ke tahap kedua. Input jumlah memungkinkan pembagian, misalnya 10 unit menjadi 7 dan 3 unit. Sisa jumlah otomatis masuk tahap kedua.
4. Nominal dihitung dari jumlah dikali harga satuan. Jumlah tidak boleh negatif atau melebihi volume sumber. Jika volume sumber bulat, alokasi wajib bulat. Pecahan maksimal empat desimal hanya untuk volume sumber yang memang pecahan. Total tahap pertama harus positif dan maksimal 70% nilai SK, mengikuti aturan aplikasi sekarang. Persentase bukan kewajiban pembagian setiap item.
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

## Vercel — perbaikan output build

Konfigurasi lama memakai adapter Cloudflare yang menghasilkan `.svelte-kit/cloudflare`, sedangkan Vercel mengharapkan `build`. Branch dummy sekarang memakai `@sveltejs/adapter-static` yang sudah terpasang, dengan output `build` dan fallback `index.html`, sesuai `vercel.json`.

- Repository: GitHub `raflyzainn/dashboard-deb`, branch `feat/rab-dummy-all-campuses`.
- Framework preset: Other; build command: `npm run build`; output directory: `build`.
- Build memakai mode `mockup`, termasuk pilihan akun lokal yang tetap tampil pada hasil deployment.
- Excel contoh berada di `static/contoh-rab.xlsx`; SK contoh di `static/sk-dummy.pdf`. Keduanya tidak bergantung pada middleware dev.
- Tidak membutuhkan environment variable PocketBase untuk simulasi ini. Data antarbrowser tidak tersinkron karena memakai IndexedDB lokal.
- Referensi: https://svelte.dev/docs/kit/single-page-apps dan https://svelte.dev/docs/kit/adapter-static.
- Build terminal tidak dijalankan sesuai instruksi repository. Keberhasilan build/deploy Vercel belum diverifikasi; perbaikan ini berdasarkan konfigurasi output adapter dan error yang dilaporkan pengguna.

## Penanda pilihan alokasi

Tombol 70% atau 30% terpilih menggunakan latar biru, tanda centang, dan `aria-pressed`. Label di bawahnya membedakan Belum dipilih, Semua ke tahap 70%, Semua ke tahap 30%, Dibagi ke dua tahap, dan Jumlah tidak valid. Status mengikuti jumlah item saat ini, termasuk perubahan input manual. QA browser pada campus-004: memilih 70%, berpindah ke 30%, lalu membagi 2 paket menjadi 1+1 menghasilkan tampilan dan status aksesibilitas yang sesuai. Tidak menyimpan perubahan data QA; enam kampus kosong tetap disisakan.

## Validasi jumlah bulat

Volume sumber bulat (misalnya 2 paket) hanya menerima alokasi bulat (0, 1, 2). Input menggunakan step 1 dan penanda tidak valid; validasi yang sama digunakan saat simpan, pengajuan, dan persetujuan. Data pecahan lama tidak dibulatkan diam-diam, tetapi harus diperbaiki kampus. QA browser perubahan ini belum selesai: tool melaporkan dialog pemilih file masih terbuka. Tes terminal tidak dijalankan.


## Pembaruan UI/UX lokal ? 30 September 2026

Bagian ini menjadi acuan perilaku terbaru untuk label dan alur RAB di atas. Belum dipublikasikan.

- Label alokasi sekarang **Tahap 1 (maksimal 70%)** dan **Tahap 2 (sisa)**. Tombol **Semua ke Tahap 1/2** mengalokasikan seluruh jumlah; input tetap memungkinkan pembagian 10 unit menjadi 7+3.
- Kartu item menggantikan tabel input lebar. Ringkasan nominal langsung mengikuti input; pesan kesalahan muncul dekat jumlah. Review kampus/admin menampilkan sumber dan kedua tahap bersama, termasuk alokasi nol.
- Simpan draf boleh dilakukan saat pembagian belum lengkap. Simpan & periksa hanya aktif setelah lengkap dan valid. Konfirmasi/pengajuan dilakukan setelah pemeriksaan kedua tahap.
- Perubahan belum disimpan dilindungi dialog saat berpindah, reload, dan keluar akun. Ganti file dapat dibatalkan; file baru memulai alokasi kosong.
- Draf perbaikan memiliki status dan progres sendiri. Versi yang sebelumnya disetujui tetap ditandai terpisah. Admin baru dapat memutuskan setelah pengajuan; permintaan revisi membuka kembali ketiga RAB.
- Linimasa panjang dan rincian sumber dapat dibuka saat diperlukan. Petunjuk mengikuti langkah/status aktual.
- Campus-026 telah dipakai untuk QA ini; daftar kampus kosong sebelumnya merupakan keadaan historis. Lihat [laporan QA ulang](QA-UX-RAB-2026-09-30.md) untuk hasil dan keadaan browser saat penyerahan.


## Riwayat draf dan popup perubahan belum disimpan

Pada akun kampus, buka Pencairan Dana > RAB 100% > **Riwayat versi RAB**. Pilihan menampilkan nomor versi, nama file, status, waktu penyimpanan, dan penanda terbaru. Versi yang dipilih tetap terbuka setelah reload.

Versi lama dapat dilihat beserta rincian dan pembagian tersimpannya. Untuk melanjutkan, pilih **Gunakan versi ini sebagai draf terbaru**. Aplikasi membuat salinan dengan pembagian yang sama; seluruh versi sebelumnya tetap tersimpan. Selama versi terbaru menunggu PF, pembuatan draf salinan dinonaktifkan. Gunakan **Kembali ke versi terbaru** untuk kembali mengisi.

Pindah versi, pindah halaman, ganti file, dan keluar akun ketika input belum disimpan memakai popup aplikasi: **Tetap di sini** atau **Buang perubahan**. Tombol tutup dan Escape membatalkan tindakan. Reload/menutup tab tetap memakai dialog bawaan browser karena tampilannya dikendalikan browser.


## Rincian sumber RAB 100% pada admin

Perbandingan RAB dan pembagian tetap memakai kartu sebelumnya. Hanya bagian **Lihat rincian RAB 100% dari Excel** pada admin yang memakai tabel ringkas: kode/item, jumlah, harga satuan, dan total sumber. Rincian dibuka sesuai kebutuhan; pencarian nama/kode dan checkbox kelompok kegiatan tersedia di dalamnya. Header dan total tetap terlihat saat area rincian digulir. Filter tidak mengubah total seluruh RAB 100%.


## Fokus pemeriksaan tiap butir admin

Pilihan RAB 100%, 70%, dan 30% memiliki judul Sedang memeriksa serta petunjuk berbeda. RAB 100% memeriksa seluruh sumber sesuai SK; RAB 70% memeriksa alokasi Tahap 1 yang maksimal 70% SK; RAB 30% memeriksa sisa Tahap 2. Bagian terkait pada setiap kartu diberi label Sedang diperiksa dan latar biru. Bagian lainnya tetap tersedia sebagai pembanding. Sisa Tahap 2 tidak wajib tepat 30% jika Tahap 1 di bawah batas.


## Perbandingan admin terbaru sesuai permintaan lanjutan

Setelah pengguna meminta tabel perbandingan ketiga RAB, area perbandingan admin sekarang memakai satu tabel empat kolom: kode/item/harga satuan, RAB 100%, RAB 70%, dan RAB 30%. Setiap kolom RAB memuat nominal dan jumlah item. Klik butir mengubah judul, petunjuk, serta label Sedang diperiksa pada kolom terkait; dua kolom lain tetap menjadi pembanding. Pencarian hanya memfilter item, tidak mengubah total. Header dan total melekat saat tabel digulir. Rincian sumber RAB 100% tetap pada bagian tersendiri; kartu pengisian/review kampus tidak diubah.

Panel penjelasan Sedang memeriksa di atas ringkasan dihapus atas permintaan pengguna. Fokus pemeriksaan ditunjukkan oleh label pada header tabel.


## Jumlah pada data contoh

Enam item bawaan RAB_CONTOH.xlsx sekarang memiliki alokasi jumlah bulat, dengan Tahap 1 Rp14 juta dan Tahap 2 Rp6 juta. Versi contoh lama tanpa quantityAllocation dilengkapi saat layanan mockup dibuka. Perubahan hanya berlaku untuk struktur enam item contoh bawaan, bukan unggahan pengguna. Versi baru dari unggahan tetap dimulai dengan alokasi kosong agar kampus memilih pembagiannya.


## Ringkasan nominal dan catatan keputusan

Dekat tombol keputusan admin tersedia nilai SK, total RAB 100%, Termin 1 (RAB 70%) beserta batasnya, dan Termin 2 (RAB 30%) dari versi yang sedang diajukan. Nilai terkait butir dipilih diberi penanda. Kotak catatan keputusan dan percakapan memiliki lebar/tinggi awal yang sama; tombol berada pada baris tersendiri dan rata kanan.


## Koreksi RAB oleh admin langsung di tabel

Tombol Edit RAB di atas tabel mengaktifkan input jumlah awal, harga satuan dalam rupiah, dan jumlah Tahap 1 pada semua baris. Jumlah dan nominal Tahap 2 otomatis mengikuti sisa. Total tabel berubah saat mengetik, termasuk baris yang disembunyikan pencarian. Batal membuang perubahan yang belum disimpan; Simpan perubahan mencatat koreksi admin secara otomatis.

Penyimpanan membuat satu versi baru untuk seluruh perubahan, mempertahankan arsip sebelumnya dan alasan/nama admin. Pengajuan yang sedang diperiksa atau sebelumnya disetujui kembali menunggu pemeriksaan ketiga RAB; draf tetap draf. Nominal pencairan berubah setelah persetujuan selesai. Total yang belum sesuai SK dapat disimpan untuk dikoreksi berikutnya, tetapi tidak dapat disetujui. Selama mode edit, tombol keputusan terkunci. RAB yang telah dibayar dan versi arsip tidak dapat diedit. Fitur berlaku pada layanan mockup browser lokal.


## Ringkasan perhatian per kampus

Panel Mode edit RAB dan input alasan perubahan dihapus atas arahan pengguna. Tombol Simpan perubahan dan Batal tetap tersedia saat edit. Ringkasan Yang perlu diperhatikan menampilkan nama kampus dan kondisi RAB yang sebenarnya: belum diunggah, item/pembagian belum lengkap, selisih total dengan SK, Tahap 1 melebihi batas, status draf, atau data lengkap yang siap diperiksa. Ringkasan berubah mengikuti input saat edit; tidak membuat kekurangan fiktif hanya agar tiap kampus berbeda. Catatan koreksi/nama admin tetap disimpan otomatis dalam versi baru.
