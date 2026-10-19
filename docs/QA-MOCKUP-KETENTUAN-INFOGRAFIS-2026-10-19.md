# Mockup ketentuan Infografis

Pada kartu Infografis di Pelaporan, ikon ? di samping judul membuka Modal existing. Konten diberi label Contoh ketentuan (dummy), belum aturan resmi PF. Contoh memuat identitas program, capaian, foto/sumber data, dan keterbacaan. Format PDF maksimal 20 MB tetap mengikuti aturan existing; tidak ada validasi atau penyimpanan baru. Konten dapat diganti langsung di ReportCard.svelte ketika ketentuan resmi tersedia.

QA browser lokal 5176 memakai respons pelaporan simulasi (paid:true, tanpa riwayat), tanpa mengubah database: ikon membuka dialog melalui klik dan Enter; Escape, X, dan Tutup menutup dialog; label dummy terlihat; dialog muat pada viewport 390px. Screenshot: .local/qa-infografis-modal-mobile.png.

QA buka/tutup diulang sebelum publikasi. Build `npm run build` pada branch `ui/infografis-help-20261019` berhasil (exit 0, Cloudflare). Warning: tsconfig generated belum ada saat awal worktree, punycode deprecated, a11y tabindex linimasa Layar.svelte yang sudah ada, dan chunk >500 kB. `git diff --check` bersih.

Tidak menjalankan test suite/check/lint atau menguji ulang unggahan. Publikasi memakai PR/MR baru khusus mockup ini, terpisah dari PR #57/MR !41; belum merge atau deploy.
