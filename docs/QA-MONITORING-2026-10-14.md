# Profil & Monitoring Program - implementasi lokal

Branch: `feat/monitoring-update-kampus`, basis `gitlab/production` 980f79df7d1d26525d82387d861043df814ad352.
Worktree: `.worktrees/monitoring-update-kampus`. Frontend lokal: http://127.0.0.1:5178. PocketBase QA: 8097.

## Yang tersedia dalam kode
Kartu Beranda, menu akun, judul dan panduan memakai Profil & Monitoring Program. URL tetap `/campus/profile`. Profil, kesiapan, dan monitoring bulanan menggunakan tab terpisah; hanya satu panel terlihat. Header logo/nama kampus dan tab bergaris bawah mengikuti halaman detail kampus admin. Panel tetap terpasang agar draf tidak hilang saat berpindah tab. Local Hero tetap ada di Profil Program dan dapat ditambah melalui Monitoring Bulanan. Perubahan tersimpan disinkronkan; draf yang sedang diubah tidak ditimpa otomatis. Admin membuka Review Kampus > Monitoring bulanan (`/admin/verifikasi?tab=monitoring`).

Kampus menyimpan draf, lalu mengirim satu bulan. Kiriman pending terkunci; keputusan PF Sesuai atau Perlu revisi tersimpan bersama audit/notifikasi. Koreksi menghasilkan versi berikutnya dan mempertahankan snapshot sebelumnya. Periode arsip hanya baca. Tidak ada syarat pembayaran T1 untuk monitoring.

Pendapatan disimpan dalam sen, listrik EBT non-biogas dalam kWh, biogas dalam m3. Kapasitas PLTS kWp, EBT lain kW dan digester m3 terpisah. Per kapita memakai penerima manfaat unik per periode, bukan penjumlahan bulanan. Nol penerima atau belum ada bulan lengkap menghasilkan Belum dapat dihitung. Bulan kosong tidak dianggap nol.

Annualisasi = total pendapatan / bulan dilaporkan * 12. Per kapita = annualisasi / penerima manfaat. Energi biogas = m3 * faktor. Total energi setara = listrik non-biogas + energi biogas. Faktor awal 6 kWh/m3 adalah estimasi kandungan energi (GIZ), bukan keluaran listrik; admin dapat mengubah faktor dan sumber/alasan per periode. Snapshot menyimpan input, output dan versi rumus. Ringkasan energi yang disetujui menjumlahkan hasil tiap snapshot dengan faktor historis masing-masing.

Bukti energi JPG/PNG/WebP maksimal 2 MB; dokumen sosial PDF/DOCX maksimal 20 MB. Jenis diperiksa dari isi berkas. Foto panel diwajibkan bila kapasitas PLTS positif, foto reaktor bila kapasitas/produksi biogas positif. Bukti sosial boleh belum tersedia dengan alasan. IKM atau SROI cukup salah satu. Bukti dapat digunakan ulang; setiap Local Hero punya ID stabil, cerita dan foto. Profil lama tetap membaca string nama/WhatsApp yang diperbarui atomik. Editor kontak admin lama menolak perubahan identitas hero bermetadata; kampus memperbaruinya di editor monitoring agar bukti tidak hilang.

## Pemeriksaan yang benar-benar dilakukan
- Fetch GitLab production dan pembuatan branch/worktree terpisah berhasil. Root development dan perubahan pengguna dipertahankan.
- Migrasi additive lima collection berhasil pada QA lokal melalui `node scripts/pocketbase/monitoring-local.mjs`. Tidak mengubah schema/database production.
- Halaman putih 5178 diperbaiki dengan memindahkan worktree keluar dari `.local` yang ditolak Vite. Aturan fs.deny tetap dipertahankan. Login dan halaman profil berhasil dibuka di browser.
- Review kode terpisah menemukan risiko clone Svelte Proxy dan reset metadata hero melalui editor legacy; perbaikannya sudah ditulis. Pemeriksaan ownership, CAS dan snapshot dilakukan lewat baca kode.
- QA browser menggunakan Playwright melalui Node REPL dengan Chrome khusus: akun QA kampus belum dibayar dapat membuka profil dan monitoring. Desktop 1366 px dan mobile 390 px diperiksa; tab keyboard ArrowRight berpindah panel, hanya satu panel terlihat. Draf profil, kesiapan dan monitoring bertahan saat berpindah tab.
- Local Hero ditambahkan dan disimpan dari Profil Program, muncul di Monitoring Bulanan. Local Hero kedua ditambahkan dan disimpan dari Monitoring Bulanan, kedua nama muncul di Profil Program tanpa reload halaman. Kedua kontak QA sudah dihapus kembali melalui UI.
- Preview satu bulan: pendapatan Rp1.000.000 dan 10 penerima menghasilkan annualisasi Rp12.000.000 dan per kapita Rp1.200.000; listrik 100 kWh ditambah biogas 10 m3 dengan faktor 6 menghasilkan 160 kWh setara. Periode awal tanpa definisi dapat diisi.
- Percobaan unggah foto belum berhasil dikonfirmasi; penantian opsi berkas habis waktu. Alur unggah dan review menyeluruh belum dinyatakan lulus.
- Test suite, check, lint, build tidak dijalankan sesuai AGENTS.md. Regresi rumus, revisi stale, periode arsip, kepemilikan bukti dan preservasi hero sudah ditulis, belum dijalankan. Idempotensi submit/review masih perlu pengujian integrasi.
- Belum commit, push, PR/MR, merge, deploy atau migrasi production.

## Checklist Excel
Implementasi kode ditemukan untuk 1.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.9, 8.10, 8.11, 8.12, N1, N2, N4. Centang Pengerjaan hanya menyatakan implementasi lokal, bukan QA atau production. QA fitur berubah tetap kosong. 8.6/N1 memakai rumus sementara atas arahan pengguna; belum rumus resmi PF.

Workbook asli `Revisi_DEB_Ringkas_Audit_Kode.xlsx` di checkout utama sudah diperbarui setelah pengguna menutup Excel. Dua salinan baru yang tidak diperlukan sudah dihapus. Sebanyak 15 poin diperbarui, 13 centang Pengerjaan baru (total 69); QA untuk 15 poin ini tetap kosong karena pemeriksaan menyeluruh belum selesai. Total QA historis 19. Formula COUNTIF dan metadata checkbox asli dipertahankan.

## QA yang masih wajib
- Kampus sebelum pembayaran: simpan, reload, ganti bulan, konflik dua tab dan pindah halaman dengan draf.
- Kirim, pending lock, revisi, kirim ulang, persetujuan dan notifikasi. Snapshot lama tetap sama setelah faktor berubah.
- Annualisasi 6/12/18 bulan, nol, bulan kosong, pembagi nol, dan faktor berbeda antarbulan.
- Berkas valid/rusak/oversize, penggunaan ulang foto, beberapa Local Hero, dokumen belum tersedia.
- Penolakan akses lintas kampus/Legal, periode arsip, retry operasi, koreksi pasca-Sesuai.
- Desktop dan mobile 390 px: tampilan rumus, pesan kesalahan, bukti dan fokus keyboard.

## Migrasi lokal dan batas rilis
Skrip `scripts/pocketbase/monitoring-local.mjs` hanya menerima instance bertanda pada 127.0.0.1:8097 dan membuat backup schema sebelum penambahan. Lima collection baru menggunakan rules null, akses hanya lewat server berotorisasi. Production membutuhkan migrasi additive terpisah sebelum fitur dapat dipakai; belum diizinkan/dijalankan.

## Penyesuaian halaman admin sebelum melanjutkan QA
Pengguna meminta HOLD QA. QA dihentikan setelah percobaan unggah gambar kampus QA; berkas muncul pada halaman dan tidak ada pageerror, tetapi penantian locator label tidak berhasil sehingga alur kirim/review belum diselesaikan. Menu kini Monitoring Kampus, halaman awal langsung monitoring bulanan, indikator lama berada di Riwayat indikator. Ditambahkan ringkasan status versi dan tabel data bulanan tersimpan termasuk draf saat kampus dipilih. Perubahan admin ini baru diperiksa melalui pembacaan kode; belum QA browser, build, atau tes terminal. Tidak push/merge.

## QA browser terpisah dan pembaruan Excel
QA dilanjutkan atas instruksi pengguna dengan proses Chrome/Chromium tersendiri, port CDP 9231, profil sementara deb-monitoring-qa-9231; tidak memakai atau menutup QA lain. Akun kampus QA belum dibayar, laporan September 2026: simpan, kirim, pending terkunci, revisi dengan catatan, kirim ulang versi 2, Sesuai dan riwayat versi 1 tetap tampil. Versi Oktober milik QA lain tidak diubah setelah server menolak percobaan review stale.

Unggah PNG reaktor berhasil; foto palsu ditolak berdasarkan isi dan >2 MB ditolak. PDF QA berhasil diunggah dan iframe tampil; DOCX sosial berhasil diunggah dan teks ter-render. Penerima nol menampilkan belum dapat dihitung. API kampus lain ditolak 403. Admin melihat Monitoring Kampus sebagai halaman awal, Master Indikator hilang dari sidebar, mobile 390 px memiliki lebar dokumen 380 px tanpa overflow dan tidak ada pageerror tercatat.

Workbook asli Revisi_DEB_Ringkas_Audit_Kode.xlsx diperbarui langsung: 10 poin QA dicentang (8.7, 1.6, 8.1, 8.3, 8.4, 8.5, 8.9, 8.12, N1, N2). Lima poin tetap perlu QA/konfirmasi (8.2, 8.6, 8.10, 8.11, N4). Catatan granular tersimpan di G/I, formula COUNTIF dan metadata checkbox dipertahankan. Tidak membuat workbook baru.

Batas: belum skenario 6/12/18 bulan, video, seluruh bukti sosial/hero, notifikasi menyeluruh, periode arsip dan regresi backend lengkap. Belum menjalankan build/check/lint/test terminal atau push/merge. Hasil QA ini bukan persetujuan rilis production.

Tambahan bukti akhir: halaman Notifikasi kampus menampilkan Monitoring perlu revisi dan Monitoring bulanan sesuai untuk September, beserta catatan revisi. Browser QA 9231 ditutup setelah selesai; sesi QA lain tetap berjalan.

## Validasi sebelum PR/MR production
Atas permintaan pengguna, `npm run build` berhasil exit 0 dengan adapter Cloudflare pada 14 Oktober 2026. Warning teramati: Node punycode deprecation dan a11y_no_noninteractive_tabindex pada linimasa Layar.svelte. Test suite/check/lint terminal tidak dijalankan. Lima poin QA/konfirmasi yang belum lengkap tetap tercatat; build bukan bukti QA menyeluruh.

Target PR/MR adalah production, tanpa merge/deploy. Saat fetch, GitLab production sama dengan basis 980f79d; GitHub production tertinggal 17 commit dari basis tersebut sehingga PR GitHub juga menyertakan sinkronisasi perubahan production GitLab sebelumnya. Monitoring membutuhkan lima collection baru; migrasi production belum dijalankan. Jangan mengaktifkan fitur production sebelum schema siap.

## Pembaruan migrasi production
Instruksi pengguna berikutnya mengizinkan migrasi PocketBase production. Lima collection monitoring sudah dibuat dan diverifikasi; schema lama tetap identik, semua collection baru kosong. Lihat PRODUCTION-SCHEMA-MONITORING-2026-10-14.md. Build final setelah perapian whitespace berhasil exit 0; percobaan sandbox sebelumnya gagal spawn EPERM lalu berhasil dengan izin proses yang sesuai. Tidak ada merge/deploy.
