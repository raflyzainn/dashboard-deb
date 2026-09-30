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


Jumlah awal pada editor admin mengikuti jenis volume sebelum koreksi: item dengan volume bulat hanya menerima bilangan bulat positif, termasuk validasi layanan mockup. Input memakai step 1. Item sumber yang memang memiliki volume pecahan tetap mendukung maksimal empat desimal.


Editor admin sekarang mengikuti butir terpilih: RAB 100% membuka jumlah awal/harga satuan; RAB 70% membuka jumlah Tahap 1; RAB 30% membuka jumlah Tahap 2. Kolom lain terkunci dan nilai tahap pasangannya mengikuti sisa. Layanan koreksi juga menolak perubahan pada kolom yang terkunci. Tombol Sesuai dan shortcut Enter terkunci jika total tidak sesuai SK, Tahap 1 melampaui batas/tidak positif, atau total kedua tahap tidak sesuai. Peringatan merah muncul dekat ringkasan keputusan; Perlu revisi tetap tersedia.


Saat mode edit, Reset ke awal memulihkan seluruh input ke versi tersimpan yang sedang dibuka, tanpa menyimpan atau membuat versi baru. Mode edit tetap terbuka. Tombol ini tidak mengembalikan koreksi yang sudah tersimpan ke unggahan Excel pertama.

## Alur pengajuan kampus dan mail merge (30 September 2026)

Perubahan ini masih lokal dan memakai penyimpanan dummy browser. Alur kampus: SK → Data Program → Pengajuan RAB → Administrasi → PKS → Ringkasan. Pengguna dapat menyimpan draf dan melanjutkan bagian terakhir. Pengajuan dikirim satu kali dari ringkasan setelah data dan dokumen siap.

- RAB memiliki empat langkah: unggah Excel, periksa tabel RAB 100%, tentukan jumlah Termin 1 maksimal 70% nilai SK, lalu periksa Termin 2 dari sisa jumlah. Riwayat file/versi tetap tersedia. Volume sumber bulat tetap dibagi dengan bilangan bulat.
- Administrasi menampung rekening, bukti rekening, kop surat PNG/JPG, penandatangan, serta nomor/tanggal surat. Rekening pihak yang diberi kuasa mewajibkan identitas pemberi/penerima dan unggahan surat kuasa. Berkas administrasi dibatasi 2 MB.
- PKS memakai data program, administrasi, dan pembagian RAB. Tombol Siapkan semua dokumen membuat PKS, permohonan, invois, dan kuitansi dari template DOCX yang sudah ada. Pratinjau dan unduhan memuat data pengajuan; persentase mengikuti nominal aktual, termasuk pembagian di bawah 70%. Tahun contoh mengikuti SK dummy 2026.
- Perubahan sumber menandai dokumen perlu dibuat ulang. Riwayat versi dan snapshot pengajuan dipertahankan. Saat menunggu PF, isian terkunci. Revisi admin membuka kembali bagian terkait; koreksi RAB admin juga mengharuskan dokumen diperbarui dan paket diajukan ulang.
- Setelah semua butir sesuai, kampus mengunduh dokumen final simulasi tanpa penanda DRAF, lalu mengunggah hasil tanda tangan. Berkas bertanda tangan yang diterima tidak dapat diganti lewat formulir kampus.

Sesuai arahan terakhir pengguna, susunan header/progres dan gaya tombol lama dipertahankan. Nilai SK ditambahkan pada bagian progres kampus. Daftar langkah kampus memakai gaya butir lama; daftar butir admin dan tabel perbandingan RAB tetap. Panel besar tambahan Pengajuan kampus pada admin dihapus. Metadata dokumen pengajuan mengikuti data sumber kampus dan tidak diedit terpisah pada admin.

Backend produksi, pembayaran, dan integrasi surat resmi tidak diubah oleh alur mockup ini.

### Pelengkapan poin rapat 2–14 dan tabel kampus

Poin 1 tetap memakai urutan SK, Data Program, lalu RAB sesuai instruksi pengguna. Poin 15–16 belum dikerjakan. Implementasi berikut berlaku pada mockup lokal:

- Tiga unduhan Excel terpisah: RAB penuh, Termin 1, dan Termin 2. Jumlah dan nominal mengikuti alokasi tersimpan; unduhan pembagian terkunci saat input belum disimpan atau belum lengkap. Tombol unduh memakai teks Indonesia dan ikon unduh di sebelah kanan.
- Tanggal PKS untuk draf baru/revisi ditetapkan 17 Juni 2026. Tanggal permohonan, invoice, kuitansi, dan surat kuasa harus setelah tanggal tersebut. Paket historis yang sudah menunggu/disetujui tidak ditulis ulang diam-diam. Metadata tanggal SK contoh menjadi 1 Juni 2026.
- PKS menjelaskan pembagian field kampus, PF, otomatis, dan tetap. Nomor PKS PF diubah admin melalui bagian ringkas dalam panel PKS; identitas penandatangan PF memakai pengaturan program yang ada. Perubahan data PF menandai dokumen terkait perlu diperbarui. Kampus memakai satu perwakilan penandatangan.
- PKS, permohonan, invoice, dan kuitansi memakai data pengajuan yang sama serta kop kampus. Persentase PKS mengikuti pembagian aktual, termasuk 30%/70%. Rekening universitas menghilangkan kebutuhan dan penyebutan lampiran surat kuasa pada dokumen yang relevan.
- Rekening kuasa menyediakan template DOCX terisi untuk diunduh, ditandatangani, lalu diunggah. Template surat kuasa ini contoh simulasi, bukan template resmi PF yang telah disahkan. Perubahan identitas/rekening/tanggal terkait membuat unggahan kuasa lama perlu diperbarui.
- Panduan dan checklist tersimpan per dokumen mencakup dua rangkap PKS, meterai, tanda tangan, tanggal, dan lampiran. Checklist merupakan persiapan dokumen, bukan pengganti keputusan PF.
- Rincian Excel yang dapat dibuka/tutup memakai tabel kode, uraian, jumlah, satuan, harga satuan, dan total; tersedia pencarian serta pilihan kelompok kegiatan.
- Sesuai pembatalan revisi tabel oleh pengguna, pembagian dan perbandingan termin kampus kembali memakai kartu per item. Termin 1 dapat diubah pada kartu; Termin 2 dihitung dari sisa. Tabel perbandingan admin tetap tersedia. Rincian Excel yang dapat dibuka/tutup tetap berbentuk tabel.
- Langkah RAB di atas dapat diklik untuk kembali memeriksa tahap sebelumnya. Tombol bawah memakai Kembali dan Lanjut. Lanjut dari Termin 1 menyimpan pembagian sebelum membuka Termin 2; kembali ke unggah tanpa memilih file tidak menghapus draf. Perubahan belum tersimpan tetap meminta konfirmasi saat hendak dibuang.


### Pagination kartu RAB kampus

Pembagian Termin 1 dan perbandingan Termin 2 menampilkan lima item per halaman. Jika item lebih dari lima, navigasi ikon panah sebelumnya/berikutnya tersedia hanya di bawah daftar, dengan rentang item dan nomor halaman. Tombol memiliki label aksesibel dan tooltip. Pindah halaman mempertahankan input; autosave tetap mengikuti debounce perubahan. Total, status kelengkapan, dan validasi tetap menghitung seluruh item, termasuk halaman lain. Kembali ke tahap atau versi lain memulai daftar dari halaman pertama.


### Simpan draf otomatis

Pembagian Termin 1 disimpan otomatis 800 ms setelah perubahan terakhir. Tombol simpan di tengah navigasi dihapus; Kembali dan Lanjut tetap di sisi kiri/kanan. Snackbar Draf RAB tersimpan muncul selama tiga detik setelah penyimpanan berhasil, dapat ditutup, dan hilang saat pengguna mulai mengubah input lagi. Jumlah invalid tidak disimpan. Jika penyimpanan gagal, input dipertahankan dan tersedia Coba simpan lagi. Lanjut menyimpan perubahan yang masih tertunda sebelum berpindah; jika sudah tersimpan, tidak membuat pembaruan tambahan. Autosave tidak mengubah halaman pagination.


### Navigasi RAB dan pemeriksaan admin

- Empat langkah RAB kampus terbuka berurutan lewat Lanjut. Unggah membuka pemeriksaan RAB 100%; Lanjut membuka Termin 1, lalu pembagian valid dan Lanjut membuka Termin 2. Autosave tidak membuka langkah berikutnya.
- Langkah yang pernah dicapai tetap dapat dikunjungi kembali, termasuk setelah refresh. Progres tersimpan per versi; unggahan/draf baru dimulai dari pemeriksaan RAB 100%. Draf lama tanpa catatan progres juga mulai dari pemeriksaan RAB 100%, tanpa menghapus pembagiannya. Versi yang telah diajukan dapat ditinjau seluruhnya.
- URL yang mengarah ke langkah belum terbuka dikembalikan ke langkah terakhir. Validasi SK dan batas 70% tetap berlaku saat melanjutkan.
- Admin dapat memilih RAB melalui header, isi, atau total kolom. Seluruh kolom aktif/hover berwarna biru dan memakai kursor pointer. Input edit tetap berfungsi; konfirmasi perubahan belum tersimpan tetap berlaku.
- Panel hasil pemeriksaan menempatkan tombol di bawah teks pada layar kecil agar catatan tidak terjepit.
