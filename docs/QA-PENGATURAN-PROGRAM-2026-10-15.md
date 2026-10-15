# Penyederhanaan Pengaturan Program — 15 Oktober 2026

Halaman Pengaturan Program hanya menampilkan dan mengedit penandatangan PF, jabatan, serta batas waktu laporan. Isian dan tampilan nilai awal masa perjanjian mulai/selesai dihapus; petunjuk mengarahkan admin ke Data PKS masing-masing kampus.

Nilai `agreementStart`/`agreementEnd` yang tersimpan, API, validasi backend, pengisian nilai awal pengajuan, dan generator dokumen tidak diubah. Form tetap mengirim hanya field terlihat yang berubah, sehingga penyimpanan pengaturan lain tidak mengosongkan periode lama. Masa perjanjian pada Data PKS tetap tersedia.

Pemeriksaan kode: daftar field digunakan bersama oleh tampilan baca, formulir, deteksi perubahan, dan payload PATCH. Backend hanya memperbarui key yang dikirim. Diff terbatas pada komponen PengaturanProgram dan catatan ini; perubahan lokal lain dipertahankan.

QA browser dicoba melalui tool Playwright, tetapi terhalang profil browser sedang dipakai (`Browser is already in use`). Tampilan, interaksi simpan, dan hasil dokumen belum diuji ulang. Tidak menjalankan test suite, check, lint, atau build terminal; tidak mengubah database, commit, push, atau deployment.

## Build sebelum push yang diminta pengguna

`npm run build` berhasil exit 0 memakai adapter Cloudflare pada 15 Oktober 2026. Percobaan sandbox awal terhalang `spawn EPERM`; build ulang dengan izin proses berhasil. Warning: deprecation `punycode`, chunk client melebihi 500 kB, dan `a11y_no_noninteractive_tabindex` pada linimasa `Layar.svelte`. Test suite, check, dan lint tetap tidak dijalankan. Publikasi ditujukan ke branch `feat/tematik-deb`; tidak mengubah branch production atau deployment.
