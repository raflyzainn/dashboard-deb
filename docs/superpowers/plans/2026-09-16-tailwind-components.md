# Migrasi styling komponen ke Tailwind

Tujuan: hapus seluruh blok style di route/komponen Svelte dan pindahkan styling UI dari app.css ke utility class Tailwind pada markup, dengan nilai dan breakpoint setara, tanpa perubahan perilaku atau desain.

- [x] Simpan screenshot dan computed styles halaman admin/kampus sebelum perubahan.
- [x] Konversi styling lokal dan global; pertahankan nama class yang dipakai selector state dan pengujian.
- [x] Periksa cascade global, state interaktif, animasi dan layout responsif.
- [x] Bandingkan tampilan sebelum/sesudah; jalankan Svelte check, build dan Playwright.

app.css tersisa import Tailwind, token tema, dan keyframes spin (15 baris); tidak ada blok style di komponen. Nilai yang dihitung saat runtime (posisi peta/progres) tetap menggunakan custom property yang dibaca utility Tailwind.

Validasi: check 0 error/warning, build Cloudflare berhasil, format:check dan git diff --check bersih, 41 tes unit lulus. Tujuh tes Playwright indikator/password/payload lulus; tes periode lulus pada run terpisah setelah akun fixture disposable dipulihkan (tes password mengubah akun tersebut). Assertion lebar sidebar diperbarui dari <224 menjadi 224px sesuai desain sebelum migrasi. Pemeriksaan tambahan memverifikasi margin kartu, tombol pengajuan compact, dan label QA pada desktop/mobile. Screenshot dan computed styles lokal disimpan di .qa/tailwind; data async akun/proposal tidak selalu identik antar capture. Preview utama 5176 diverifikasi melalui Chrome setelah restart Vite untuk menghilangkan transform stylesheet yang tertinggal selama peralihan CSS.
