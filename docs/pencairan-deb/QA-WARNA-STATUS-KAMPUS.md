# Warna status pemeriksaan kampus

Perubahan tampilan pada `Layar.svelte`, disetujui pengguna pada 19 September 2026:

- Perlu revisi: kotak oranye.
- Sesuai: kotak hijau.
- Menunggu pemeriksaan atau perlu konfirmasi: kotak biru.
- Belum ada atau tidak diperlukan: kotak abu-abu.

Label status tetap tertulis. Catatan pemeriksa dan tindak lanjut berada di dalam kotak dengan garis kiri tebal. Hak akses, keputusan, serta alur unggah tidak diubah.

QA browser lokal: status RAB Perlu revisi pada Universitas Sebelas Maret dan Sesuai pada IPB tampil dengan warna yang diharapkan. Setelah menarik GitLab production hingga `4c296c3`, tampilan Perlu revisi diperiksa kembali. Tidak ada mutasi data production. Tes terminal, check, dan build tidak dijalankan sesuai aturan proyek.
