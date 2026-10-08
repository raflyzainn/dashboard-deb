# Smoke build Cloudflare lokal - 8 Oktober 2026

Build akhir dengan adapter Cloudflare berhasil exit 0 setelah perbaikan lifecycle autosave formulir dan editor RAB. `node scripts/qa/cloudflare-smoke.mjs`, yang menjalankan `tests/cloudflare-smoke.mjs`, kemudian berhasil **exit 0** pada Wrangler lokal `http://127.0.0.1:4177`. Log akhir: `output/production-cloudflare-smoke-final.log`.

| Pemeriksaan | Hasil |
| --- | --- |
| `/login` SSR HTML dan cache no-store | 200 |
| `/api/auth/me` anonim | 200, session null |
| `/api/dev/accounts`, termasuk header preview | 404 |
| Logout origin asing | 403 |
| Logout same-origin anonim | 200, ok true, cookie sesi dihapus |
| Login JSON rusak, bounded body reader/Buffer | 401 |

## Isolasi runtime

Runner lokal `scripts/qa/cloudflare-smoke.mjs` membuat config sementara dan environment minimal. Binding aplikasi hanya `PB_URL=http://127.0.0.1:1`, `DEB_LOCAL_PREVIEW_ENABLED=false`, serta URL publik lokal 4177. Tidak ada kredensial PocketBase, R2, atau kunci undangan pada bindings run yang diterima. Backend loopback sengaja tidak tersedia. Helper hanya menghentikan process tree Wrangler yang dibuatnya; port 4177 dilepas setelah selesai.

`--env-file` sendiri ternyata tidak cukup: run awal Wrangler Pages masih memuat dotenv root secara otomatis. Run itu tidak dipakai sebagai bukti isolasi. Semua request awal anonim atau JSON rusak dan berhenti sebelum mengakses backend, dan nilai rahasia tidak dicetak. Run ulang memakai `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false`, `CLOUDFLARE_INCLUDE_PROCESS_ENV=false`, serta binding eksplisit. Log run ulang tidak memuat `Using secrets`, `PB_SUPER*`, `R2_*`, atau kunci undangan. Runner kini menolak menjalankan smoke bila bindings kredensial tak terduga muncul.

Bukti lokal: `.local/cloudflare-smoke/runtime.log`. Ulangi dari root dengan `node scripts/qa/cloudflare-smoke.mjs` setelah build akhir, ketika port 4177 bebas. Tidak mengubah ekspektasi smoke test.

## Batas

Ini smoke runtime hasil build akhir, bukan login akun nyata, pengiriman email, transaksi pembayaran, atau deployment Cloudflare. QA pengajuan dan pembayaran menggunakan frontend lokal 5176 dengan PocketBase 8097, dilaporkan terpisah. Tidak ada publikasi atau perubahan layanan production.
