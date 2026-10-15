# Informasi program — 14 Oktober 2026

Sesuai permintaan pengguna, kolom Tim Pendamping (`pfTeam`) dihapus dari daftar field komponen `ProgramInfoSection.svelte`. Kolom tidak tampil pada tampilan baca maupun formulir Ubah. Nilai tersimpan tidak dihapus; penyimpanan bagian ini hanya mengirim field yang berubah. Komponen digunakan pada detail Kampus Mitra admin dan halaman profil kampus lama yang saat ini dibatasi aksesnya.

QA browser lokal PocketBase di `http://127.0.0.1:5176/admin/campuses/878e5swr345c1at`: Tim Pendamping tidak tampil pada mode baca dan edit; Subholding dan Estimasi RAB masih tampil; formulir memiliki delapan input; Batal kembali ke tampilan baca. Tidak menyimpan perubahan data saat QA.

Build wajib sebelum push berhasil (exit 0) pada worktree terisolasi dari production, memakai adapter Cloudflare. Warning: tsconfig turunan belum tersedia pada awal build, deprecation punycode, dan chunk frontend di atas 500 kB. Check dan test terminal tidak dijalankan ulang. Build dijalankan dengan Node 25.5.0; Node 22 belum diperiksa ulang. GitHub dan GitLab memiliki isi production identik dengan commit merge berbeda; riwayat keduanya disatukan tanpa force push. Deployment aktif belum diverifikasi. Dokumentasi Markdown lain yang belum selesai dibaca pada audit sebelumnya tetap belum dinyatakan selesai dibaca.
