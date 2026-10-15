# SDD ledger — plan: docs/superpowers/plans/2026-10-14-pelaporan-kampus.md

- Basis: fa84daee78dbb0317a33b10e30820ed236663261, worktree pelaporan-kampus-20261014.
- Ruling: QA menggunakan port 5177 sesuai instruksi terbaru pengguna; 5176 tidak dihentikan atau diubah.
- Ruling: tes ditulis tetapi tidak dieksekusi terminal sesuai AGENTS.md; pembuktian runtime melalui tool browser. Tidak commit otomatis.
- Pre-flight Task 1→2→4: ReportKind/ReportVersion/ReportWorkspace satu kontrak shared; konsisten.
- Pre-flight Task 2→3: transaksi atomic memakai fence disbursements bersama; semua mutasi LPJ wajib masuk fence yang sama.
- Pre-flight Task 3→4: completion/t2Ready dari backend; tidak dihitung dari status lokal UI.
- Task 1: berjalan.

- Task 1: implementasi schema, validator, fixture video nyata dan tes tertulis selesai; QA unggah browser mencakup format asli/palsu, metadata durasi dan struktur rusak.
- Task 2: layanan berversi, akses, SK, audit/notifikasi selesai; QA simpan/kirim/review/revisi, concurrency, retry, storage gagal dan ownership dilakukan.
- Task 3: pembayaran, revisi, riwayat, completion/reopen dan deduplikasi LPJ selesai; QA retry, lock dan race complete/add dilakukan.
- Task 4: UI/menu/link admin/mobile dan panduan selesai; hasil rinci di docs/QA-PELAPORAN-KAMPUS-2026-10-14.md.
- Final review: reviewer independen review_pelaporan. Temuan penting unsaved submit, retry LPJ, validasi sample video dan cakupan tes telah ditangani. Uji browser terkait diulang; terminal suite tetap tidak dijalankan.
- Ruling: metadata/struktur MP4 diperiksa tanpa decoding frame; format fragment tanpa explicit trun data offset ditolak dengan pesan validasi. Dukungan layout langka memerlukan perluasan parser atau re-export MP4.
- Ruling: workspace/ledger dipertahankan karena pekerjaan belum di-commit sesuai instruksi pengguna; jangan menghapus catatan sebelum publikasi yang diminta.
- Tidak ada perubahan remote atau production. Server dev session 19699 pada port 5177.
