# Migrasi schema monitoring production - 14 Oktober 2026

Dilakukan atas instruksi eksplisit pengguna pada https://deb-api.pertaminafoundation.org menggunakan konfigurasi production checkout utama. Kredensial tidak dicetak/disimpan dalam dokumen ini.

Lima collection dibuat: monitoring_programs, monitoring_months, monitoring_versions, monitoring_files, monitoring_settings. Field, tipe, opsi relasi/ukuran, indeks unik dan seluruh rules null diverifikasi lewat pembacaan ulang. REST batch serta campuses.program/programRevision sudah tersedia; tidak perlu mengubah konfigurasi atau schema lama.

Seluruh schema collection yang sudah ada identik sebelum/sesudah. Kelima collection baru memiliki 0 record. Tidak melakukan seed atau mengubah record bisnis production. Snapshot schema sebelum/sesudah dan hasil tersedia di checkout utama `.local/production-schema/monitoring-2026-10-14T14-54-41.418Z/`. Ini backup schema, bukan backup penuh database/storage.

Build final berhasil exit 0 dengan adapter Cloudflare. Migrasi tidak melakukan merge atau deploy; kesiapan schema tidak menjamin seluruh perilaku aplikasi bebas error. Batas QA tetap mengikuti QA-MONITORING-2026-10-14.md.
