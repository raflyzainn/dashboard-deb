# Kampus Mitra: progres dokumen pencairan

Arahan terbaru pengguna 13 Oktober: tampilkan posisi pencairan kampus berdasarkan dokumen yang sudah disimpan pada pengajuan. Progres pada daftar, tabel ringkas Beranda, dan Ringkasan kampus kini memakai data pencairan Tahap 1. Proposal dan profil tetap memakai sumber existing. Tidak mengubah Peta Persebaran.

## Pemetaan sumber

- `campuses.id` → `sk_awards.campus` (wave 1) → `disbursements.campus` (term 1) → `documents.disbursement` → `document_versions.id = documents.currentVersion`.
- Berkas tersimpan: jumlah slot selain SK dengan versi aktif yang benar-benar terbaca. Versi lama tidak dihitung ulang. Tiga pemeriksaan RAB tidak dianggap tiga unggahan jika hanya satu berkas RAB disimpan.
- Butir selesai: helper `assess` existing, status Sesuai atau Tidak diperlukan. Unggahan yang sedang diperiksa atau perlu revisi tidak dihitung selesai. Ini kelengkapan pemeriksaan, bukan persentase dana ditransfer.
- Pengajuan baru memakai `submissionStatus`, `applicationData.fields.jenisRekening`, versi RAB terbaru, `document_versions.generation.journeyRevision`, revisi dokumen, `signedReceived`, serta `paidAt`. RAB draf belum sesuai dan surat kuasa rekening kampus tidak diperlukan, mengikuti kartu pengajuan existing.
- Tahap memakai helper bersama `payoutTimeline`, diekstrak dari linimasa Pencairan: Isi pengajuan, Siapkan dokumen, Kirim pengajuan, Pemeriksaan PF, Tanda tangan, Pembayaran, Dana dibayar. Pengajuan lama tetap mengikuti tahap tersimpan dan aturan pemeriksaannya. Pembayaran hanya ditampilkan selesai jika `paidAt` terisi.
- Assessment lama tetap membaca pemeriksaan dokumen, bank, RAB, dan lampiran existing. Data baru memakai aturan assessment mesin pengajuan yang sama dengan kartu Pencairan.
- DTO `campusPayouts` hanya memuat tahap, jumlah berkas, serta assessment; tidak mengirim nomor rekening, kunci storage, isi versi, atau identitas pengunggah. Pembacaan server dilakukan setelah autentikasi dan role admin. Tidak ada perubahan collection/field/schema, seed, atau mutasi bisnis.

## Bukti browser pengembang

Branch `feat/rafly999-9-pencairan-progress`, basis development `5c16f6684f71191582d2f89844f0847ed601bae7`. Tool Playwright pada worktree port 5186, PocketBase QA lokal 8097. Dependency existing digunakan melalui junction; konfigurasi QA privat tidak masuk paket.

| Kampus | Tahap | Berkas aktif | Butir selesai |
| --- | --- | --- | --- |
| Universitas Gadjah Mada | Pemeriksaan PF | 5 | 1/10 |
| Universitas Pertamina | Dana dibayar | 6 | 10/10 |
| Politeknik Negeri Kupang | Periksa berkas | 5 | 2/10 |
| Universitas Pattimura | Isi pengajuan | 0 | 1/10 |

Keempat sampel dicocokkan dengan GET kartu Pencairan: tahap, seluruh status butir, hitungan selesai, dan berkas aktif sama. Pattimura memiliki satu butir Tidak diperlukan (surat kuasa); tidak mengaku sudah mengunggah berkas.

Checkpoint `scripts/qa/kampus-pencairan-progress.playwright.js` dijalankan melalui tool browser: pencarian, detail, tautan proses pencairan, filter revisi, pagination, hasil kosong, mobile 390 px, anonim 401, kampus 403, dan ringkasan tanpa field privat berhasil; pageerror kosong. Desktop 1440 px tanpa overflow halaman. Tabel lebar memiliki area gulir sendiri.

Tambahan lewat browser: 10 kondisi helper linimasa (termasuk dokumen kedaluwarsa, revisi, tanda tangan dan pembayaran), simulasi GET 503/retry, serta tabel ringkas Beranda berhasil. Awal checkpoint terganggu reload HMR saat berkas berubah; run ulang setelah stabil berhasil. Tidak mengirim pengajuan, unggah, keputusan, atau pembayaran baru. Login/navigasi dapat mencatat metadata lokal.

## Checklist dan batas

- [x] Daftar/detail memakai progres pencairan, bukan capaian indikator.
- [x] Unggahan, pemeriksaan, revisi, tanda tangan dan dana dibayar dibedakan.
- [x] Sumber field existing; tanpa schema baru atau production.
- [x] Empat sampel nyata lokal cocok dengan kartu Pencairan.
- [x] Pencarian, revisi, pagination, kosong, retry, dan akses melalui browser.
- [ ] QA independen pada paket dengan hash manifest yang sama.
- [ ] Build sebelum publikasi setelah QA independen lulus.

Tes unit linimasa ditambahkan, tetapi test suite/check/lint/build terminal belum dijalankan sesuai AGENTS.md. QA tidak membuktikan data production terkini atau kelayakan dokumen. Belum mengulang mutasi upload/review atau seluruh 40 kampus. Data simulasi historis lokal tetap ada. Direktori membaca koleksi agregat existing; uji beban tidak dilakukan. Belum commit/push/PR/MR/deploy.

QA berikutnya: terapkan seluruh berkas paket pada worktree baru dari basis di atas, cocokkan SHA-256 `QA-VERSION.json`, gunakan instance PocketBase lokal bertanda sesuai README, jalankan server development, login admin lokal, lalu jalankan checkpoint melalui tool browser. Jangan menyertakan env, kredensial, AGENTS runtime, atau database dalam publikasi.
