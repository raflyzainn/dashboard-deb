# Revisi rekening UGM — QA lokal 19 Oktober 2026

## Penyebab dan perubahan

Pengiriman perbaikan sebelumnya mencoba membuat semua dokumen usang, termasuk yang tidak termasuk `revisionDocuments`. Server menolak dengan “Dokumen ini tidak termasuk perbaikan.” Pengiriman kini memakai aturan pemilihan dokumen yang sama dengan tombol pembuatan dokumen. Validasi server tetap berlaku.

Pengajuan lama (`datePolicy: legacy`) juga dapat memiliki surat usang akibat pengaturan PF berubah. Mesin pengajuan kini membuka revisi khusus dokumen untuk surat tersebut, sebagaimana kebutuhan pembaruan pengaturan PF pada alur baru. Ini tidak membuka isian kampus atau izin unggah kop di luar scope. Membaca ulang tidak menambah permintaan/revisi berulang untuk surat yang sudah dibuka. Pengajuan berbayar tetap terkunci.

## Data lokal UGM

Kampus `6wqqkvxonz5gclp` memakai pengajuan simulasi lokal. Referensi kop masih ada, tetapi objeknya hilang. Sumber QA `.qa/development-recheck-099e527/rab-real/04-reload-tetap-dua-item.png` cocok dengan nama dan dimensi pada referensi (1540 × 1640). Sumber tersebut disalin ke key lokal yang sudah direferensikan, tanpa mengubah metadata atau membuka scope surat. Hash salinan sama dengan sumber: `84cdbe83c68fbafbd52ff859d927b0c2ff735881afe956545422e5447d0eb8eb`. Tidak ada hash lama pada metadata untuk pembandingan tambahan. Berkas ini screenshot QA, bukan kop resmi UGM.

## QA browser yang dilakukan

Playwright pada frontend 5176 dan PocketBase lokal 8097:

- Sebelum perbaikan, respons terisolasi dengan PKS usang di luar scope membuat tombol kirim mencoba PKS dan menampilkan penolakan scope.
- Setelah perbaikan, kondisi terisolasi yang sama hanya membuat invois yang diizinkan. Request submit dicegat browser dan tidak diteruskan ke server.
- Mesin pengajuan asli dimuat melalui Vite dalam browser dengan state terisolasi tanpa database: perubahan pengaturan PF pada alur legacy membuka revisi dokumen, mempertahankan scope rekening, membatalkan penanda penerimaan terkait dan tidak menggandakan permintaan ketika dibaca ulang.
- Endpoint kop UGM kembali HTTP 200, image/png, 196.571 byte.
- Tombol Siapkan semua dokumen berhasil memperbarui surat usang UGM. API menunjukkan `stale: []`, `blockers: []`, `pendingRevisionScopes: []`, `revisionBlockers: []`.
- Jalur kirim pada data UGM diperiksa dengan intersepsi khusus request submit. Request akhir ditahan di browser; status tetap revisi dan riwayat pengajuan tetap 2. Intersepsi dilepas sesudah QA.

Tes regresi diperbarui pada `tests/journey-revision-submit.test.ts` dan `tests/p1-legal.test.ts`, tetapi tidak dieksekusi terminal. Tidak menjalankan test suite, check, lint atau build. Tidak commit, push, deploy, atau mengubah production. Pengiriman ulang tetap menjadi tindakan pengguna.

## Persiapan PR dan MR atas permintaan pengguna

Kode dipisahkan pada branch `fix/revisi-rekening-scope-20261019` dari GitLab production `9b2a705`. Hanya dua berkas kode, dua tes regresi dan laporan ini disertakan. Perubahan lokal lain serta objek/database QA tetap berada di checkout utama.

`npm run build` pada checkout pengiriman berhasil, exit 0, memakai adapter Cloudflare. Warning yang teramati: deprecated `punycode` dan `a11y_no_noninteractive_tabindex` pada linimasa `Layar.svelte:397` yang tidak diubah oleh perbaikan ini. `git diff --check` bersih. Test suite terminal, check dan lint tetap tidak dijalankan.

Target kedua review adalah production. Sesuai pilihan pengguna, PR GitHub juga membawa 33 commit pembaruan GitLab yang belum ada pada production GitHub; MR GitLab hanya berisi perbaikan sesi ini. QA lokal di atas tidak membuktikan seluruh pembaruan tersebut atau kondisi deployment production. Tidak ada merge, deployment atau migrasi production yang dijalankan.
