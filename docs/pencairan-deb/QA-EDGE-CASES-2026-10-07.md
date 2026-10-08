# Audit edge case pencairan kampus dan admin — 7 Oktober 2026

> Laporan audit awal sebelum perbaikan. Implementasi dan pengujian browser lanjutan tercatat di [laporan perbaikan dan 14 revisi](QA-EDGE-CASES-DAN-14-REVISI-2026-10-07.md). Nomor baris di bawah merujuk kode sebelum perbaikan. Koreksi F05: helper notifikasi lama sudah menangkap error; risiko utama ialah pembayaran tersimpan sebelum audit. Pembayaran, audit, dan notifikasi kini dimasukkan ke batch transaksi yang sama pada layanan pembayaran.

Lingkup: SK → Data Program → RAB → Administrasi/PKS → pengajuan → pemeriksaan/revisi → tanda tangan/asli → lampiran → pembayaran Tahap 1. Audit kode checkout saat ini dan pemeriksaan terbatas browser lokal; bukan bukti kesiapan deployment production. Tidak mengubah data pengajuan, menjalankan tes terminal, build, commit, atau push untuk audit ini.

## Bukti dan batas pemeriksaan

- Playwright pada `http://127.0.0.1:5176`, PocketBase lokal 8097, konteks browser terpisah dari sesi pengguna.
- Tanpa login, GET workspace pencairan mengembalikan **401**.
- Akun QA kampus 2 mengakses workspace dan RAB kampus 1: keduanya **403**. Pengajuan kampus sendiri: **200**.
- Halaman Pencairan Dana kampus sendiri terbuka dengan judul yang benar tanpa tampilan `Internal Error`. Ini smoke check, bukan pemeriksaan seluruh interaksi halaman.
- GET workspace/RAB akun QA kampus 1 menunjukkan status selesai, revision 116 dan pembayaran terisi. Tidak mencoba mengubah transaksi tersebut.
- Laporan QA 6 Oktober menjadi konteks historis; hasilnya tidak dihitung sebagai pengujian ulang hari ini.
- Skenario gangguan, konkurensi, unggahan berbahaya, dan perubahan pembayaran belum direproduksi. Seluruh matriks di bawah adalah backlog QA, kecuali bukti browser di atas.

## Temuan yang perlu ditangani lebih dahulu

P1 = berpotensi mengganggu keamanan/integritas transaksi; P2 = berpotensi menghasilkan data/hasil tidak benar atau menghambat pengguna. Prioritas belum berarti dampak sudah direproduksi.

| ID | Prioritas | Bukti kode dan risiko | Pemeriksaan lanjutan / hasil yang diharapkan |
|---|---|---|---|
| F01 | P1 | `src/lib/server/deb/pencairan.ts:309–329` memeriksa ekstensi tetapi menyimpan MIME kiriman; `:543–547` menyajikannya inline pada origin aplikasi. `engine.ts:321` juga mempertahankan tipe kiriman. | Berkas HTML bernama PDF harus ditolak atau disajikan aman; tipe isi harus diverifikasi. Potensi konten aktif dari unggahan, belum dibuktikan dengan eksekusi browser. |
| F02 | P1 | `pencairan.ts:325–342` memilih nomor versi, menulis objek, lalu membuat record. `r2.ts:69–72` memakai timestamp detik. | Dua unggahan bernama sama pada detik sama tidak boleh menggunakan key objek yang sama/menimpa versi pemenang, termasuk ketika unique index kemudian menolak salah satu record. Race belum direproduksi. |
| F03 | P1 | Guard readiness pembayaran di `src/routes/api/pencairan/[campus]/pembayaran/+server.ts:10–15` hanya aktif pada mode `pocketbase-local` untuk record tertentu. `recordPayment():371–377` tidak memeriksa semua tanda tangan/asli/lampiran. | Semua prasyarat pembayaran harus ditolak server pada mode target rilis juga. Guard antarmuka saja tidak cukup. Bukan klaim terhadap kode yang sedang terdeploy. |
| F04 | P1 | Guard unggahan setelah bayar pada `pencairan.ts:317` berada dalam `options.byCampus`; admin jalur lama tidak mendapat guard yang sama dengan engine (`engine.ts:123`). | Pastikan kebijakan penguncian setelah bayar konsisten untuk kampus, admin, URL langsung dan API. Bila koreksi admin diizinkan, harus eksplisit, terbatas, dan teraudit. |
| F05 | P1 | `pencairan.ts:381–383` menyimpan pembayaran sebelum audit/notifikasi; retry identik berhenti pada `:380`. | Kegagalan setelah pembayaran tersimpan tidak boleh menghasilkan status menyesatkan atau kehilangan audit/notifikasi permanen. Simulasikan gagal per langkah; belum direproduksi. |
| F06 | P1 | `lampiran.ts:449–466` mengambil snapshot, merakit PDF, menulis objek, record, verifikasi, audit, lalu stage secara berurutan tanpa transaksi keseluruhan. Key juga presisi detik. | Dua admin menyimpan bersamaan atau sumber berubah saat perakitan: arsip harus unik, konsisten dengan versi sumber dan jumlah; kegagalan sebagian harus dapat dipulihkan. Belum direproduksi. |
| F07 | P2 | `recordPayment():378–381` tanpa expectedRevision/CAS; pembayaran yang sudah ada dapat diperbarui. | Dua admin mengubah referensi bersamaan: tab usang harus mendapat konflik, bukan diam-diam menimpa. Pastikan kebijakan koreksi pembayaran. |
| F08 | P2 | `pencairan.ts:374` hanya memvalidasi pola tanggal. | Tanggal tidak nyata seperti 2026-02-31 harus ditolak aplikasi. Penerimaan final oleh PocketBase belum diuji. |
| F09 | P2 | `src/lib/rab-grid.ts:60–63` menghentikan parser jika label diawali `total`; label `Jumlah ...` dapat dianggap subtotal. | Item sah seperti **Total station** tidak boleh menghilangkan item itu dan seluruh baris berikutnya tanpa peringatan. Khusus impor grid lama, bukan template datar. |
| F10 | P2 | `mockups/app/RabItemsEditor.svelte:43` membuang section dari grid lama; pencocokan `rab-template.ts:14–25` memakai kategori/subkategori/nama. | Dua item Konsumsi pada subkegiatan berbeda harus tetap dapat dibedakan bila format grid lama didukung. Impor bertahap tidak boleh memperbarui item yang salah. |
| F11 | P2 | `src/lib/state.svelte.ts:78` mengabaikan respons logout gagal; endpoint auth menghapus cookie setelah revoke berhasil. | Backend gagal saat keluar: UI tidak boleh memberi kesan sesi sudah berakhir sementara reload memulihkan login. Belum direproduksi. |
| F12 | P2 | `browser-document-pdf.ts` memakai antrean global; pemuatan script/font/decode gambar tanpa timeout. `mockups/rab/model.ts` membatasi ukuran XLSX terkompresi sebelum parsing. | PDF macet tidak menahan semua preview selanjutnya; XLSX kecil tetapi hasil dekompresinya besar tidak membekukan layanan/browser. Risiko kapasitas, belum direproduksi. |

Catatan arsitektur: `src/hooks.server.ts:20–28` mengarahkan mesin pengajuan baru hanya pada mode lokal dan record dengan `submissionStatus`; endpoint penutup memakai layanan lama. QA dummy, QA PocketBase lokal, dan QA build target rilis harus dipisahkan.

## Matriks skenario QA

Semua baris berikut perlu diuji dengan akun/data uji. Kolom kanan adalah kriteria penerimaan, bukan klaim lulus.

### A. Akses, sesi, dan isolasi data

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| A01 | Belum login membuka URL/API pencairan | Login/401, tanpa data sensitif. |
| A02 | Kampus A mengganti ID URL ke kampus B, termasuk versi berkas/lampiran | 403/404, tidak bocor nama, rekening, catatan atau isi berkas. |
| A03 | Kampus memanggil aksi admin: approve, asli diterima, lampiran, pembayaran | Ditolak server meski request valid. |
| A04 | Akun dinonaktifkan/role diubah saat tab terbuka | Request berikutnya kehilangan izin; draft tidak hilang tanpa penjelasan. |
| A05 | Sesi habis saat autosave/upload/submit | Pesan login ulang, tidak mengklaim tersimpan; pemulihan aman. |
| A06 | Logout gagal, back browser, tab lain masih terbuka | Status sesi benar dan data akun sebelumnya tidak tertukar. |
| A07 | Catatan internal admin, audit, download lama setelah logout | Tidak terbuka lewat API/cache antarmuka tanpa izin. |
| A08 | Request mutasi lintas origin | Ditolak; request sah dari origin aplikasi tetap bekerja. |

### B. Awal pengajuan dan Data Program

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| B01 | Kampus baru belum punya SK/nilai bantuan/pengajuan | Empty state jelas, tidak membuat nominal atau status palsu. |
| B02 | SK dicabut/diganti/nilai berubah saat kampus mengisi | Versi usang terdeteksi; RAB dan nominal harus dievaluasi ulang. |
| B03 | Field kosong, spasi saja, Unicode, teks sangat panjang | Draft boleh belum lengkap; submit menolak kekurangan dengan lokasi jelas. |
| B04 | Email, telepon, rekening, kode pos diawali nol | Tidak berubah menjadi angka atau kehilangan nol. |
| B05 | Tanggal mulai setelah selesai, tahun kabisat, pergantian WIB | Validasi kalender/rentang benar; status tidak bergeser karena zona waktu. |
| B06 | Surat kuasa wajib ↔ tidak wajib, penandatangan/rekening berubah | Kewajiban dokumen berubah konsisten; dokumen lama ditandai usang bila perlu. |

### C. Autosave, navigasi dan konflik

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| C01 | Terus mengetik ketika simpan lambat | Input tidak terkunci; respons lama tidak menimpa ketikan baru. |
| C02 | Edit lalu langsung pindah butir, breadcrumb, refresh, logout | Flush/pengaman dirty bekerja, termasuk sebelum debounce 800 ms. |
| C03 | Offline/500 saat simpan lalu retry | Input tetap ada; indikator gagal dan retry jelas; reload membuktikan persistensi. |
| C04 | Respons hilang setelah server sebenarnya menyimpan | Retry tidak membuat versi/pengajuan ganda; status diselaraskan ulang. |
| C05 | Dua tab atau dua PIC kampus mengedit data sama | Konflik terlihat, tidak overwrite diam-diam. |
| C06 | Admin mengunci/approve ketika autosave kampus masih berjalan | Mutasi terlambat ditolak server; UI memperbarui status tanpa menghapus input diam-diam. |
| C07 | Berpindah cepat RAB 100%/Termin 1/Termin 2 saat alokasi dirty | Alokasi terbaru tersimpan atau ada pengaman sebelum kehilangan state. |

### D. Item dan impor RAB

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| D01 | 0, 1, 500, 501 item; baris kosong di tengah/akhir | Draft kosong boleh; finalisasi mengikuti batas dan tidak melewatkan baris invalid. |
| D02 | Desimal, negatif, nol, notasi ilmiah, NaN, angka sangat besar | Batas integer/angka aman diterapkan server; tidak dibulatkan diam-diam. |
| D03 | Harga × volume tidak sama dengan jumlah | Ditolak dengan item yang bermasalah. |
| D04 | Nama sama beda huruf/spasi/kategori/subkegiatan | Identitas konsisten; item berbeda tidak tergabung keliru. |
| D05 | Impor sama dua kali, lalu impor sebagian yang berubah | Tidak duplikat; item manual/alokasi yang masih cocok dipertahankan. |
| D06 | File rusak, kosong, terenkripsi, ekstensi palsu, sheet hilang | Pesan jelas dan RAB sebelumnya tetap utuh. |
| D07 | Formula tanpa cached value, merged cells, hidden rows, banyak sheet | Tidak diam-diam melewatkan item atau menganggap formula sebagai nilai sah. |
| D08 | Item Total station/Jumlah material pada grid lama | Tidak dianggap batas akhir/subtotal tanpa konteks. |
| D09 | XLSX kecil terkompresi tetapi rentang/shared strings sangat besar | Ada batas kapasitas dan pemulihan; browser/server tetap responsif. |
| D10 | Impor/edit/delete bersamaan dengan finalisasi/approval | Snapshot/versi diperiksa ulang; tidak ada item hilang atau total beda antarhalaman. |

### E. Alokasi dan nominal

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| E01 | Tahap 1 tepat 70%, satu unit di atas, nol | Sesuai aturan batas dan nominal positif, tanpa toleransi floating point keliru. |
| E02 | Alokasi pecahan, negatif, lebih dari volume | Ditolak, tidak dipaksa rounding. |
| E03 | Total dua tahap tidak sama dengan 100% | Finalisasi ditolak dengan selisih jelas. |
| E04 | Item/harga berubah setelah alokasi | Alokasi invalid ditandai; angka surat/ringkasan/RAB konsisten. |
| E05 | Nilai SK berbeda dari total RAB; sen vs rupiah | Satu acuan nominal jelas, tanpa salah faktor 100. |
| E06 | Termin 2 melalui URL/API meski menu disembunyikan | Kebijakan penundaan berlaku pada server; tidak bisa mencatat pembayaran tak diizinkan. |

### F. Submit, pemeriksaan dan revisi

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| FQ01 | Submit dengan data/dokumen wajib belum lengkap atau stale | Ditolak dengan daftar blocker yang dapat dibuka. |
| FQ02 | Klik submit dua kali/retry setelah timeout | Satu transisi dan riwayat, bukan pengajuan ganda. |
| FQ03 | Admin approve dan minta revisi bersamaan | Salah satu konflik; status, riwayat, dan akses edit tetap konsisten. |
| FQ04 | Revisi tanpa alasan, ditolak, disetujui, lalu resubmit | Alasan wajib; hanya lingkup yang disetujui terbuka; terkunci lagi setelah kirim. |
| FQ05 | Submit revisi tanpa perubahan atau perubahan di luar lingkup | Ditolak server sesuai aturan. |
| FQ06 | Revisi program memengaruhi PKS/surat/RAB yang telah dibuat | Dokumen turunan yang terpengaruh dianggap usang dan tidak siap dibayar. |
| FQ07 | Banyak putaran revisi; tab lama masih menampilkan approve | Riwayat tidak hilang; aksi tab lama ditolak/reload. |
| FQ08 | Kampus mengedit via API ketika menunggu/selesai/sudah dibayar | Lock berlaku tanpa bergantung pada tombol disabled. |

### G. Dokumen, tanda tangan, dan lampiran

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| G01 | HTML bernama PDF, MIME palsu, file kosong/oversize/rusak | Ditolak atau disajikan aman; tidak menjalankan konten pada origin aplikasi. |
| G02 | Dua upload nama sama; upload selesai ketika status berubah | Versi/key unik; guard diperiksa pada saat commit. |
| G03 | Berkas bertanda tangan lama setelah data/dokumen diganti | Tidak otomatis memenuhi dokumen versi baru. |
| G04 | Tandai asli diterima lalu unggah versi baru | Flag penerimaan mengikuti versi yang benar. |
| G05 | DOCX tabel sangat panjang, banyak halaman/gambar, font gagal | Error/fallback unduh jelas; preview lain tetap berfungsi. |
| G06 | PDF encrypted, gambar EXIF rotation, scan besar, halaman kosong | Preview dan penggabungan benar atau ditolak tanpa arsip rusak. |
| G07 | Preview unduh/QR setelah revisi atau arsip baru | Hash/versi/sumber konsisten; QR tidak mengklaim valid untuk berkas lain. |
| G08 | Sumber berubah saat lampiran dirakit; dua admin simpan bersamaan | Arsip terikat snapshot yang valid, tidak overwrite atau memakai nomor ambigu. |
| G09 | Storage berhasil tetapi DB/verifikasi/audit gagal, atau sebaliknya | Retry aman; tidak ada arsip terlihat valid dengan sumber hilang. |
| G10 | Download versi lama/arsip setelah perubahan | Versi historis tetap identik dan akses tetap diperiksa. |

### H. Pembayaran, operasi dan antarmuka

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| H01 | Bayar sebelum approved/tanda tangan/asli/lampiran lengkap | Ditolak server pada mode rilis target. |
| H02 | Nominal beda, tanggal invalid/kosong, referensi kosong/panjang | Validasi jelas; tidak menyimpan sebagian field. |
| H03 | Double click, retry timeout, dua admin mencatat berbeda | Idempotensi dan konflik jelas; tidak mencatat/menimpa tanpa jejak. |
| H04 | Pembayaran tersimpan lalu audit/notifikasi gagal | Status bayar tetap jelas dan audit/notifikasi dapat dipulihkan. |
| H05 | Koreksi pembayaran setelah lunas | Kebijakan eksplisit, izin terbatas, nilai sebelumnya tetap teraudit. |
| H06 | Nomor PKS PF belum diisi | Putuskan apakah blocker pembayaran; jangan menebak aturan bisnis. |
| H07 | PocketBase/storage lambat/down; daftar banyak kampus/versi | Error bisa dipulihkan, tidak loading abadi atau mengambil seluruh data tanpa batas. |
| H08 | Mobile, zoom 200%, nama panjang, keyboard, modal/error | Tombol penting terlihat, fokus benar, feedback dapat dibaca. |
| H09 | Refresh/back/deep link di tiap status | Halaman dan breadcrumb benar, tidak salah kampus atau status usang. |
| H10 | Build target rilis berbeda dari dummy/lokal; schema tidak lengkap | Jalankan kontrak alur pada lingkungan staging yang menyerupai target, termasuk API, migrasi, storage dan sesi. |

## Urutan sebelum rilis

1. Selesaikan F01–F06 atau buktikan dengan guard/kontrak yang berlaku pada jalur target bahwa risiko sudah tertutup.
2. Putuskan aturan koreksi pembayaran, nomor PKS PF, validitas tanda tangan setelah revisi, dan dukungan format grid lama.
3. Jalankan alur kampus-admin lengkap menggunakan data uji pada staging yang setara target; sertakan konflik dua tab, retry, dan kegagalan setelah server menyimpan.
4. Catat tiap kasus sebagai lulus/gagal/belum diuji beserta bukti respons, hasil UI, dan persistensi setelah reload. Audit ini tidak menjamin bebas error production.
