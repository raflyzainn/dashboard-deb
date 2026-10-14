# Arsitektur pengajuan PocketBase lokal

Baca [status migrasi](MIGRASI-POCKETBASE-LOKAL.md) terlebih dahulu. Dokumen ini menjelaskan kode saat ini, bukan rencana produksi.

## Alur data

UI yang sama -> `dataService` HTTP -> hook mode lokal -> `secured()` -> mesin pengajuan bersama -> `atomic()` -> collection PocketBase yang sudah ada. Browser tidak membawa kredensial superuser. Data dimiliki **kampus**, bukan akun; dua akun dengan relasi `users.campus` sama mendapat pengajuan yang sama.

`src/hooks.server.ts` memilih adapter baru hanya untuk `/api/pencairan/{id}` milik pengajuan bertanda `submissionStatus`. Pengajuan lain tetap memakai route backend lama. Mode `mockup` menggunakan IndexedDB melalui wrapper semula.

## Kode yang digunakan ulang

| Bagian | Implementasi |
| --- | --- |
| Alur dan validasi mockup | Dipindah ke `src/lib/pengajuan/engine.ts` dan `journey.ts`; `mockups/app/api.ts` hanya memasang adapter IndexedDB. Tidak ada salinan mesin kedua. |
| Form, RAB, tabel, pagination, autosave | `mockups/app/CampusJourney.svelte`, `RabUpload.svelte`, `DocumentGuide.svelte`, serta `Layar.svelte` yang sama. |
| Excel | Parser `readExcel`, `parseGridSheet`, `arrange`, pembangun `rab-excel`, dan aturan jumlah yang sudah ada. |
| Word | `merge.ts`, template dalam `static/templat`, dan `journey-documents.ts`; library DOCX/ZIP/XML yang sudah terpasang. |
| Autentikasi/otorisasi | `secured`, `recordId`, pemeriksaan role dan relasi kampus di server. |
| Transaksi | `RestStore` dan `atomic` dengan batch PocketBase serta pagar `app_revisions`; callback sekarang juga dapat async untuk berkas lokal. |
| File | `storage(settings)` yang sudah punya penyimpanan lokal. Tidak membuat layanan file baru. |
| Pengaturan PF | Halaman `/admin/pencairan/pengaturan` dan collection `program_settings` yang sudah ada. |
| Penerimaan asli/pindaian | `documentReceiptFlags` dipakai backend lama dan mesin bersama, agar timestamp/aktor konsisten. |

`journey-local.ts` menerjemahkan hasil mesin ke record relasional. Bentuk `fullDummy` yang masih terlihat di dalam adapter adalah kontrak mesin lama; **bukan** JSON database dummy yang disimpan di PocketBase.

## Skema: tanpa collection baru

Hanya empat field ditambahkan secara aditif melalui `scripts/pocketbase/journey-local.mjs --migrate`. Definisi diambil dari `scripts/pocketbase/deb-schema.ts`.

| Collection | Field baru | Isi |
| --- | --- | --- |
| disbursements | submissionStatus | draf / menunggu / revisi / selesai; kosong = alur lama |
| disbursements | applicationData | Isian program, administrasi, nomor PKS PF, referensi kop/kuasa/rekening, checklist, langkah terakhir, revisi data dokumen |
| rab_versions | campusStep | 0-3; progres per versi, tahap baru dibuka melalui Lanjut |
| rab_versions | revision | Revisi versi RAB |

Yang tetap memakai field/collection lama:

- `disbursements.revision`: nomor revisi seluruh pengajuan untuk konflik antar-akun.
- `rab_lines.flags.term1Volume/term2Volume`: jumlah alokasi; harga dan nominal tetap di field numerik yang ada, dalam sen.
- `document_versions`: unggahan sumber Excel, hasil generator, berkas rekening/kuasa, dan pindaian bertanda tangan.
- `document_versions.fields/generation`: isian dan sumber hasil dokumen, nomor revisi pengajuan, referensi versi RAB, data SK/PF; penanda final untuk berkas final.
- `reviews`, `notes`, `audit`: keputusan, percakapan, dan snapshot pengajuan. Riwayat pengajuan dibaca dari audit, tidak diduplikasi dalam applicationData.
- `bank_checks`: hasil pemeriksaan nama rekening oleh PF.

Field kop menunjuk objek lokal. Data biner tidak dimasukkan ke JSON formulir. Unggahan disimpan sebagai objek baru; versi lama tidak ditimpa.

## Endpoint dan hak akses

Semua endpoint di bawah diawali `/api/pencairan/{campusId}`. Server selalu memeriksa kampus aktor. Admin dapat memeriksa kampus lain; kampus tidak boleh melakukannya.

| Endpoint | Perilaku |
| --- | --- |
| GET `/`, `/pengajuan`, `/rab` | Kartu, pengajuan, dan versi RAB |
| PATCH `/pengajuan` | Simpan isian atau posisi navigasi |
| PATCH `/pengajuan/checklist` | Simpan checklist |
| PATCH `/pengajuan/pf` | Nomor PKS PF, khusus admin |
| POST `/pengajuan/upload` | Kop, rekening, atau kuasa |
| POST `/rab/import` | Baca satu Excel penuh; versi baru dan alokasi kosong |
| POST `/rab/versions` | Salin versi menjadi draf baru |
| PATCH `/rab/versions/{id}/allocation` | Jumlah termin per item |
| POST `/rab/versions/{id}/progress` | Buka tahap berikut setelah validasi |
| POST `/rab/versions/{id}/correction` | Koreksi admin menjadi versi baru; kolom terpilih saja |
| POST `/pengajuan/dokumen/{kind}` | Buat dokumen dari data yang sama |
| GET `/pengajuan/dokumen/{kind}` | Pratinjau/unduh; sesudah disetujui memakai berkas tersimpan |
| GET `/pengajuan/surat-kuasa` | Template kuasa terisi, khusus rekening kuasa |
| POST `/pengajuan/submit` | Validasi dan snapshot paket, lalu menunggu PF |
| POST `/documents/{kind}/review`, `/rab/keputusan` | Keputusan admin |
| POST `/documents/{kind}/catatan` | Catatan kampus atau admin; catatan internal hanya admin |
| POST `/buat/{kind}` | Simpan DOCX final dari dokumen yang telah disetujui |
| POST `/documents/{kind}/versions` | Unggah pindaian; kampus hanya setelah paket selesai |
| PATCH `/documents/{kind}` | Flag pindaian/asli oleh admin beserta waktu dan aktor |
| GET `/documents/{kind}/versions/{id}` | Berkas versi milik dokumen/kampus tersebut |

Route di luar daftar adapter ditolak. Pembayaran/LPJ bukan cakupan migrasi ini. Endpoint lama tetap tersedia untuk pengajuan lama.

## Konflik dan penyimpanan

Mutasi mengirim `expectedRevision`. Server membandingkan dengan `disbursements.revision` dalam snapshot transaksi. Revisi berbeda -> HTTP 409, tidak menimpa data. Form menyimpan isian lokal dan menawarkan muat ulang melalui konfirmasi. Navigasi `lastSection` tidak mengubah revisi isi dan tidak menghasilkan audit berulang.

Polling setiap 10 detik dan saat jendela kembali aktif memperbarui form yang bersih. Form kotor hanya menampilkan pemberitahuan; tidak diganti dari server. Respons GET lebih lama diabaikan. Autosave RAB tetap memakai debounce yang sudah ada.

`atomic()` menulis record dan pagar revisi dalam satu batch, maksimal 2.000 operasi. Penyimpanan objek berlangsung sebelum batch; batch yang gagal dapat meninggalkan objek tanpa referensi, tetapi tidak membuat versi separuh tersimpan. Pembersihan objek yatim belum ditambahkan karena lingkup lokal dan tidak boleh menghapus berkas yang masih dibutuhkan.

## Validasi dan dokumen

- Total RAB harus sama dengan SK; T1 positif dan maksimal 70% dari SK; T2 sisa. Persentase tidak diterapkan paksa per item.
- Item yang jumlah awalnya bulat harus dialokasikan dalam bilangan bulat. Koreksi awal item bulat juga tetap bulat.
- Draf boleh belum lengkap; Lanjut/pengajuan/persetujuan memblokir nilai yang tidak valid.
- Nominal dan identitas surat mengikuti satu formulir. PKS 17 Juni 2026; surat pencairan setelah tanggal itu; satu penandatangan kampus.
- Rekening kampus tidak memerlukan surat kuasa. Rekening kuasa memerlukan nama yang cocok, tanggal, template, dan unggahan tanda tangan. Perubahan data sumber membuat unggahan kuasa harus diperbarui.
- Perubahan data pengajuan/RAB membuat hasil dokumen kedaluwarsa. Perubahan pengaturan PF diperiksa melalui sumber settings pada hasil generator sebelum pengajuan/persetujuan.
- Dokumen final berasal dari blob hasil pemeriksaan; hanya label draf dihapus. Tidak melakukan mail merge ulang dengan data terbaru saat mengunduh final. Mengubah settings PF setelah persetujuan tidak mengubah isi unduhan yang telah disetujui.
- Membatalkan persetujuan mengembalikan status menunggu; unggah bertanda tangan kembali diblokir.

Template surat kuasa masih contoh simulasi yang sudah ada. Naskah final resmi perlu persetujuan PF sebelum penerapan produksi; jangan menyebut contoh itu template resmi baru.
