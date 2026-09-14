# QA migrasi REST tanpa hook — 14 September 2026

Implementasi akhir memakai SvelteKit untuk aturan bisnis dan **SMTP bawaan PocketBase** untuk email. Folder `db-schema/pb_hooks` telah dihapus; setup lokal dan provisioning tidak memuat hook atau menjalankan migrasi native lama.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run check` | Lulus, 0 error / 0 warning |
| `npm run build` | Lulus, adapter Vercel |
| `npm test` | 23 tes lulus |
| Workflow dan master pada database baru | 12 tes lulus: scope/role, concurrent writes, idempotency, rollback, indikator/review, PDF, forum dan notifikasi |
| Aktivasi/PIC dan lifecycle email native | 7 tes lulus |
| Bukti email native dan provisioning production pada sandbox | 2 tes lulus |
| Playwright aktivasi/login/ganti password | 4 tes lulus pada frontend sandbox 5177 |
| Playwright diskusi dengan akun QA lokal | Lulus: kampus/admin, polling, draf, quote, pagination, retry, mobile |
| API lokal utama setelah restart | Akun kampus, dashboard, forum: HTTP 200; total kampus tetap 40 |
| Dependensi endpoint hook di `src`/`scripts` | Tidak ditemukan |
| `git diff --check` | Lulus |

Pengujian email memakai **PocketBase → SMTP Mailpit**, bukan SMTP langsung dari SvelteKit. Token palsu ditolak. Membuka email tidak mengaktifkan akun. Token bukti tidak dapat membaca data kampus, pertanyaan, user, atau proposal. Dua konfirmasi bersamaan menghasilkan satu sukses dan satu penolakan; pembukaan ulang tautan sebelum konfirmasi tetap berjalan.

Provisioning production diuji terhadap **database QA terisolasi**: data kampus dan field tambahan tetap ada, SMTP tidak berubah, rate limit aktif, serta login/token lama akun QA ditolak. Tidak ada perubahan ke server PocketBase production.

Database utama lokal dibackup sebelum cutover pada `.local/pocketbase/maintenance/2026-09-14T08-25-01.153Z-62e60210`. Konfigurasi SMTP lokal yang sudah ada dipertahankan. Pemeriksaan API utama hanya membaca data; tidak mengirim email eksternal atau menambah kampus QA.

Tes layout login disesuaikan dengan tampilan yang ada: desktop tanpa overflow, mobile boleh scroll vertikal karena panel tersusun ke bawah. Tidak ada perubahan CSS untuk memaksa halaman mobile menjadi satu layar; tombol masuk tetap terlihat dan tidak ada overflow horizontal.

Belum diverifikasi pada deployment production: jaringan SMTP Postmark, penerimaan email eksternal/bounce, domain HTTPS sebenarnya, batas request hosting, dan beban data production. Status “Menunggu aktivasi” adalah penerimaan permintaan kirim oleh PocketBase, bukan bukti delivery. Ikuti [panduan deployment](DEPLOY-SVELTEKIT-REST.md).
