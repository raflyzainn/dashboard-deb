# Migrasi schema pelaporan production — 14 Oktober 2026

Diterapkan atas instruksi eksplisit pengguna pada PocketBase `https://deb-api.pertaminafoundation.org`, menggunakan konfigurasi `.env` checkout utama. Kredensial tidak dicetak atau disalin ke dokumentasi.

Hasil:

- Collection `report_versions` dibuat dengan field/relasi dari schema branch pelaporan; akses langsung list/view/create/update/delete tetap null.
- Indeks unik `idx_report_version` (award/kind/version) dan `idx_report_operation` (operationId) tersedia.
- `lpj_entries` ditambah `note`, `revision`, `history`, `operationId`, `inputHash` serta indeks unik parsial `idx_lpj_operation` untuk operationId tidak kosong.
- REST batch sudah aktif sebelum migrasi; pengaturan layanan tidak diubah.
- Pembacaan ulang schema memastikan seluruh field, tipe, indeks dan aturan akses collection laporan sesuai.
- Jumlah record LPJ sebelum/sesudah: 0/0. Tidak ada seed, unggahan QA atau perubahan record bisnis production.

Snapshot schema sebelum/sesudah, record LPJ sebelum perubahan dan hasil migrasi disimpan lokal pada direktori ignored `.local/production-schema/pelaporan-2026-10-14T09-19-44.239Z/`. Ini snapshot schema, bukan klaim backup seluruh database dan storage.

Migrasi tidak melakukan merge PR/MR atau deploy aplikasi. Kode fitur tetap mengikuti GitHub PR #48 dan GitLab MR !32; keberhasilan schema tidak berarti fitur sudah aktif di website production.
