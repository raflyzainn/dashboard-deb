# QA Rekening Bersama dan unduh surat kuasa — 19 Oktober 2026

## Perubahan

- Urutan sidebar dan tombol langkah: PKS → Rekening Penerima → Dokumen.
- Surat kuasa tetap di dalam Rekening Penerima untuk pilihan Rekening Bersama, terpisah dari unggah foto buku rekening.
- Pesan kelengkapan kuasa diarahkan ke Rekening Penerima.
- Penolakan unduh menyebut isian dan tab yang harus diperbaiki, termasuk nama program, rekening, pemberi/penerima kuasa, penandatangan, tanggal dan kop.
- Tidak mengubah ketentuan validasi atau data production. Perbaikan slot dokumen hilang tetap di PR #56/MR !40, tidak disertakan di branch ini.

## Bukti QA

QA browser dengan akun kampus sementara pada PocketBase lokal 8097. Di checkout utama (5176): nama program kosong ditolak dengan pesan tepat; pengisian nama program dan unggah kop berhasil; DOCX terunduh tanpa kegagalan; unggah kuasa mendapat HTTP 200 dan bertahan setelah reload; tombol Lanjut/Kembali sesuai; tampilan 390px tanpa overflow; memilih rekening kampus menyembunyikan formulir kuasa.

Di worktree branch rilis (5177): PKS lanjut ke Rekening Penerima; template berhasil diunduh dengan data lengkap; unggahan kuasa terlihat; mengosongkan nama program lalu mengunduh menampilkan pesan yang menyebut Data Program. Tidak mengirim pengajuan. Akun, kampus, dokumen, audit, notifikasi, dan objek berkas QA dihapus setelah selesai. Data kampus asli tidak diubah.

## Build

`npm run build` pada worktree branch rilis berhasil, exit 0, adapter Cloudflare. Warning: tsconfig hasil generate belum ada saat awal worktree baru, deprecation punycode, a11y tabindex pada linimasa Layar.svelte yang sudah ada, dan chunk klien >500 kB. `git diff --check` bersih.

## Batas pemeriksaan

Tidak menjalankan test suite/check/lint terminal. Belum menguji seluruh kombinasi revisi, isi visual DOCX, atau deployment production. PR/MR ini belum berarti telah terdeploy.

## Pemeriksaan reviewer

1. Pastikan Rekening Penerima ada setelah PKS dan sebelum Dokumen.
2. Pilih Rekening Bersama: formulir kuasa dan unggahan terpisah dari buku rekening.
3. Kosongkan nama program: pesan unduh menunjuk Nama kegiatan / program di Data Program.
4. Lengkapi data dan kop: template dapat diunduh tanpa wajib mengunggah surat kuasa terlebih dahulu.
