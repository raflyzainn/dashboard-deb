# Template, tabel item, dan pembagian termin RAB

Revisi lokal pada branch `feat/rab-template-termin`, dari development `9c3345c`, diselaraskan ke `23dfd94` sebelum pengiriman. Worktree `.worktrees/rab-template-termin` terpisah dari pekerjaan lain. Pratinjau dummy: http://127.0.0.1:5297.

## Perilaku

- Unduhan memakai `static/templat/Template_RAB_DEB.xlsx`, salinan desain `output/Template_RAB_DEB.xlsx`. Petunjuk menjadi lembar pembuka; RAB 100%, Contoh Pengisian (8 item ilustrasi), dan Ringkasan tetap tersedia. Rumus dan grafik sumber dipertahankan. Format angka diubah menjadi tanpa desimal dan validasi sel angka menjadi bilangan bulat positif. Lembar contoh tidak diimpor.
- Kolom tabel kampus sama dengan Excel: Kategori, Sub Kategori, Nama, Qty, Satuan, Volume, Satuan Volume, Harga Satuan, Total Harga. Kampus dapat menambah, mengedit, dan menghapus item; perubahan disimpan otomatis setelah jeda mengetik 800 ms.
- Total Harga dihitung ulang dari input, tanpa mengandalkan cache rumus Excel. Qty × Volume menjadi jumlah yang dibagi di aplikasi; 25 orang × 2 hari menjadi 50 orang-hari. Kedua faktor aslinya tetap disimpan untuk pengeditan.
- Upload mencocokkan Kategori + Sub Kategori + Nama, tanpa membedakan huruf besar/kecil atau spasi berlebih. Item yang cocok diperbarui (Qty, satuan, Volume, harga), item baru ditambahkan. ID baris lama dipertahankan. Upload ulang tidak menambah duplikat. Item dengan nama sama di kategori berbeda tetap terpisah. Jika identitas berulang di Excel atau memiliki beberapa kandidat di tabel, upload ditolak tanpa mengubah tabel. Hasil langsung disimpan sebagai draf dan dapat diedit kembali tanpa tombol simpan manual. Format Excel lama tetap diterima.
- Maksimal 2 MB per file dan 500 item gabungan. Draf boleh belum lengkap, termasuk nol baris setelah semua item dihapus. Sebelum **Periksa RAB 100%**, baris harus lengkap, angka positif; Qty, Volume, Harga Satuan, serta pembagian termin wajib bilangan bulat. Pecahan ditandai dan ditolak saat pemeriksaan/impor, tanpa pembulatan otomatis. Total yang belum sesuai SK boleh disimpan sebagai draf, tetapi tidak boleh dilanjutkan ke pembagian/pengajuan.
- Autosave menyimpan tabel kerja pada data pengajuan, termasuk isian yang belum lengkap. **Periksa RAB 100%** memvalidasi tabel lalu membuat versi baru jika ada perubahan, mempertahankan versi sebelumnya. Autosave tidak membuat versi baru pada setiap ketikan. Pembagian item lama dipertahankan berdasarkan identitas baris saat jumlah, satuan, harga, dan nama tidak berubah. Item baru atau berubah perlu dibagi kembali. Penguncian pengajuan dan lingkup revisi tetap berlaku.
- Pembagian termin memakai tabel ringkas dengan Item, Total RAB, Termin 1, dan Termin 2 otomatis. Input jumlah serta pintasan Semua T1/T2 tersedia. Pagination tetap lima item; total dan validasi mencakup semua halaman. Tabel dapat digeser horizontal pada layar sempit tanpa memperlebar halaman.
- Pindah halaman menunggu autosave perubahan terakhir. Jika gagal, input tetap tersedia dengan snackbar kesalahan dan tombol Coba simpan lagi; dialog buang perubahan dan peringatan reload tetap melindungi data yang belum tersimpan. Penyimpanan berhasil memakai snackbar Draf RAB tersimpan di tengah bawah seperti Data Program. Kolom tetap aktif selama autosave; snapshot yang sedang disimpan tidak menimpa ketikan berikutnya. Navigasi menunggu seluruh perubahan terbaru tersimpan.

- Unduhan template dan hasil RAB memiliki snackbar saat file siap, serta snackbar kesalahan bila gagal. Pemeriksaan/lanjut memberi petunjuk tahap berikutnya. Total yang tidak sama dengan SK menjelaskan alasan tombol Lanjut terkunci.

## Implementasi

- `RabItemsEditor.svelte`: input, tambah/hapus, upload ke tabel, debounce autosave, penyimpanan sebelum navigasi, dan retry saat gagal.
- `rab-template.ts` dan `mockups/rab/model.ts`: pembaca format baru dengan fallback format lama, validasi yang sama di browser dan engine.
- `POST /api/pencairan/:campus/rab/items` pada engine bersama: validasi bentuk draf, kontrol status/versi sumber dan nomor revisi tabel, serta validasi lengkap saat membuat versi RAB. Tabel kerja tersimpan pada applicationData yang sudah ada; perubahan yang belum diperiksa menghalangi pembagian/pengajuan sampai Periksa RAB 100% dijalankan. Handler PocketBase lokal mengizinkan rute ini pada instance lokal yang telah dibatasi sebelumnya.
- `scripts/templat/prepare-rab-template.py <path-sumber.xlsx>` menyalin workbook dan memperbarui lembar pembuka/petunjuk. File asli di output tidak diubah.

## QA tambahan: perbaikan poin 6

Playwright Chrome terlihat pada 5176/PocketBase lokal 8097, menggunakan Kampus QA Lokal 1:

- [x] Item lama diperbarui dan item baru ditambahkan; upload file sama kembali tetap dua item. Qty/harga baru tersimpan setelah reload.
- [x] Excel berisi identitas berulang ditolak tanpa mengubah jumlah/item tabel; data lama tidak dihapus.
- [x] Upload ulang item yang tidak berubah mempertahankan jumlah alokasi Termin 1 (3 dan 1 unit) setelah membuat versi baru.
- [x] Update pada tabel 500 item diterima; penambahan menjadi 501 ditolak.
- [x] Satuan yang hanya angka ditolak saat pemeriksaan/impor; satuan seperti m2 diterima. Draf yang belum valid tetap dapat autosave.
- [x] Label RAB memakai Termin 1/Termin 2, dan jumlah/satuan dipisahkan pada tabel pembagian.

Bukti lokal: `.qa/development-14points/fix-findings/`, `allocation-merge/`, dan `final-findings/`. Pageerror kosong pada ketiga pemeriksaan. Test suite/check/build tidak dijalankan. Checkpoint `rab-template-editor.playwright.js` disesuaikan dengan perilaku merge; checkpoint lama di bawah adalah hasil historis sebelum perbaikan ini.

## QA historis sebelum perbaikan poin 6

Tool Playwright pada dummy worktree 5297, akun Universitas Hasanuddin, menggunakan data QA browser terisolasi:

- [x] Workbook memiliki empat lembar, Petunjuk aktif, contoh berisi delapan item senilai Rp12.585.000, dan template kosong tidak mengimpor contoh.
- [x] Excel lama diterima; Qty negatif ditolak.
- [x] Item manual Rp7.415.000 tersimpan meskipun belum sesuai SK, lalu tetap ada setelah reload.
- [x] Upload delapan item menambah menjadi sembilan item, total Rp20.000.000. Qty 25 dan Volume 2 tetap terpisah setelah penyimpanan.
- [x] Upload ulang menambah menjadi 17 item; data lama dan alokasi sebelumnya tidak tertimpa.
- [x] Jumlah termin negatif, melebihi jumlah awal, dan pecahan pada jumlah bulat diblokir. Pembagian tersimpan setelah berpindah/reload.
- [x] Pindah halaman langsung setelah mengetik menunggu autosave dan mempertahankan input tanpa dialog simpan manual.
- [x] Baris belum lengkap bertahan setelah reload, tetapi tidak dapat diteruskan ke pemeriksaan. Hapus semua baris tetap tersimpan setelah reload.
- [x] Snackbar berhasil terlihat. Simulasi penyimpanan gagal memunculkan snackbar kesalahan dan tombol coba lagi; input tetap ada dan retry bertahan setelah reload.
- [x] Penyimpanan diperlambat 1,8 detik: kolom tetap bisa diketik dan ketikan terbaru bertahan setelah reload/pindah halaman.
- [x] Snackbar berada di tengah area halaman pada viewport 1366 dan 390 px; unduhan template/hasil dan simulasi unduhan gagal memberi notifikasi.
- [x] Pecahan Qty, Volume, dan Harga Satuan ditolak parser; input menandai pecahan. Template memakai validasi whole dan format tanpa desimal.
- [x] Draf dengan revisi kedaluwarsa ditolak; autosave tidak menambah versi RAB per ketikan. Tidak ada error JavaScript pada QA akhir.
- [x] Tabel input dan termin tidak membuat halaman melebar pada viewport 390 × 844; screenshot desktop/mobile diperiksa.
- [x] Engine diuji melalui browser pada salinan memori: alokasi tetap mengikuti identitas saat kategori mengubah urutan baris; versi kedaluwarsa, 501 item, angka negatif, status menunggu, sudah dibayar, dan akses admin ke endpoint kampus ditolak.

Checkpoint yang dapat diulang melalui tool Playwright: `scripts/qa/rab-template-editor.playwright.js`. Screenshot lokal di `.qa/` tidak perlu dipublikasikan.

Batas pemeriksaan: runtime PocketBase lokal belum diuji untuk endpoint item baru; QA di atas menggunakan engine bersama dalam mode dummy. Workbook belum dibuka ulang secara visual di Excel desktop; perubahan pada file mencakup lembar aktif/petunjuk, format angka, dan validasi bilangan bulat, tanpa menulis ulang rumus. Test suite, check, dan lint terminal tidak dijalankan. Build final `npm run build` berhasil (exit 0) setelah sinkronisasi development; adapter-static menulis build/. Warning: beberapa chunk melebihi 500 kB. Log lokal: `.qa/build-rab-final.log`. QA Playwright diulang setelah sinkronisasi dan berhasil tanpa error JavaScript. Pengiriman branch dan PR ke development diminta pengguna; tidak melakukan merge atau deploy.
