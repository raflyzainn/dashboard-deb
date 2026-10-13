# QA Peta Persebaran dengan progres pencairan

13 Oktober 2026, aplikasi lokal 5176 dan PocketBase lokal 8097. Basis development `f60c235`. Pengguna meminta angka peta mengikuti data dokumen pada Kampus Mitra, QA dengan Playwright Google Chrome dalam jendela terlihat, lalu push ke development GitHub dan GitLab setelah hasil sesuai.

## Perubahan

Sebelumnya peta mengambil campusMetrics indikator sehingga Universitas Pertamina tampil 0%, padahal Kampus Mitra menunjukkan 10/10 butir selesai atau 100%. Endpoint view map kini menyertakan DTO campusPayouts melalui directory existing, sesudah autentikasi/izin admin. Tidak menambahkan pembacaan nomor rekening atau isi file ke ringkasan.

Pin, legenda, filter kategori, rata-rata dan ringkasan wilayah memakai assessment.done / assessment.total x 100, sama dengan Kampus Mitra. Kampus tanpa penetapan atau total nol bernilai 0, tanpa fallback indikator. Detail pin menampilkan tahap, jumlah berkas tersimpan dan butir selesai. Label menjelaskan progres pencairan Tahap 1 dan perbedaan berkas tersimpan dengan pemeriksaan selesai. Tidak mengubah aturan pengajuan, keputusan, pembayaran, koordinat atau schema.

Persentase bukan ukuran jumlah berkas yang diunggah, bukan bukti submit, dan bukan persentase uang dibayar. Status tahap dan jumlah berkas tersedia pada detail pin. Pengelompokan wilayah/provinsi tetap mengikuti metadata existing; QA ini tidak memperbaiki perbedaan lokasi kampus dan lokasi program pada metadata lama.

## QA browser aktual

Playwright dijalankan melalui tool JavaScript dengan Google Chrome 155.0.8059.40 pada profil QA terpisah, jendela terlihat. Tidak menjalankan test runner dari terminal. Browser dibiarkan terbuka di peta 5176 untuk pengguna.

| Pemeriksaan | Hasil |
| --- | --- |
| Jumlah pin, termasuk sesudah reload | 40 dari 40 |
| Cocok dengan Kampus Mitra | Seluruh 40 nilai progres sesuai DTO daftar |
| Universitas Pertamina | 100%, Dana dibayar, 6 berkas, 10/10 butir selesai |
| UGM / Kupang / Pattimura | 10% / 20% / 10%, sesuai sumber pemeriksaan |
| Rata-rata semua kampus | 40% |
| Jawa / Sumatra / Kalimantan | 34,7% / 42% / 50% |
| Bali & Nusa Tenggara / Papua / Maluku / Sulawesi | 20% / 56,7% / 55% / 35% |
| Filter Jawa | 15 pin, rata-rata 34,7%, ringkasan wilayah mengikuti filter |
| Filter progres minimal 70% | 13 pin; rata-rata 82,3% |
| Kasus batas lewat browser, snapshot salinan | Pemeriksaan 3/10 mengalahkan indikator 99%; tanpa payout dan total nol menghasilkan 0 |
| Desktop 1366x900 dan mobile 390x844 | Tanpa overflow horizontal, detail pin mobile terbaca |
| Error JavaScript halaman | Tidak ada pageerror pada rangkaian QA Chrome |

Screenshot lokal: output/map-payout-chrome-desktop-2026-10-13.png dan output/map-payout-chrome-mobile-2026-10-13.png. Screenshot diperiksa visual. Sebelumnya QA Edge membuktikan mismatch dan perbaikan seluruh 40 nilai; Google Chrome digunakan untuk rangkaian akhir sesuai arahan pengguna.

Tes regresi map.test.ts diperbarui untuk sumber pencairan, agregasi wilayah, kampus tanpa penetapan dan total nol. Suite terminal/check/lint tidak dijalankan sesuai AGENTS.md. Build wajib dijalankan pada paket perubahan yang dikirim sebelum push; hasil dicatat setelah selesai. QA lokal awal berjalan bersama sebelas perubahan lokal existing yang tidak akan disertakan dalam publikasi. Database lokal, manifest koordinat, screenshot, env dan kredensial tidak termasuk commit.

## Build sebelum push

`npm run build` berhasil dengan exit 0 pada worktree terisolasi berbasis f60c235 dengan hanya enam berkas perubahan ini. Output memakai adapter Cloudflare. Warning: tsconfig generated belum ada pada awal worktree baru (proses build tetap selesai), deprecation punycode, dan beberapa chunk client lebih dari 500 kB. Build bukan bukti typecheck, test suite atau production sudah lulus.

Snapshot GitHub development f60c235 dan GitLab development a541ce0 memiliki tree identik tetapi riwayat merge berbeda. Commit pengiriman mempertahankan kedua riwayat agar kedua remote dapat diperbarui tanpa force-push. Tidak melakukan merge/push/deploy production.
