# Profil & Monitoring Program

Rencana yang disetujui 14 Oktober 2026, dengan arahan terakhir: gabungkan ke `/campus/profile` melalui kartu Profil Program. Branch `feat/monitoring-update-kampus` berasal dari `gitlab/production` 980f79d. Development kotor dipertahankan.

## Lingkup
- Profil existing tetap digunakan. Monitoring bulanan tersedia sejak login, tanpa prasyarat pembayaran.
- Pendapatan, listrik EBT non-biogas, volume biogas; kapasitas kWp/kW/m3 terpisah.
- Penerima manfaat unik per periode, bukti energi/sosial dan cerita/foto masing-masing Local Hero.
- Simpan eksplisit, konflik revisi mempertahankan input, kirim per bulan, pemeriksaan PF dan riwayat snapshot.
- Rumus terlihat beserta substitusi. Annualisasi total/bulan dilaporkan*12; per kapita dibagi penerima manfaat unik. Nol eksplisit, bulan kosong tidak dihitung.
- Faktor biogas awal 6 kWh/m3 adalah estimasi kandungan energi GIZ, dapat diubah admin per periode. Bukan pengukuran listrik. Snapshot menyimpan revisi rumus.
- Lima collection additive monitoring; API berotorisasi, penyimpanan/audit/notifikasi atomik, file privat, CAS, arsip baca saja.
- Bukti sosial boleh belum tersedia dengan alasan/pengingat. IKM atau SROI, bukan wajib keduanya.

## Keputusan pelaksanaan
- Pengujian terminal/build/check/lint serta commit/push/PR tidak dijalankan sesuai AGENTS.md. Tes regresi ditulis, QA melalui browser.
- Keputusan: URL tetap `/campus/profile`, sesuai arahan terakhir; tidak membuka modul indikator legacy. Semua label navigasi mengarah ke halaman gabungan.
- Belum ada sumber rumus resmi PF; rumus sementara diberi label estimasi, sumber faktor dicantumkan.

## Progres
- Branch dan worktree terpisah tersedia.
- Implementasi lokal ditulis dan direview. QA browser terblokir tool; tidak dinyatakan lulus. Rincian dalam QA-MONITORING-2026-10-14.md.
- Keputusan: perubahan nama/nomor Local Hero bermetadata melalui editor admin legacy ditolak; kampus memakai editor monitoring ber-ID agar cerita/foto tidak hilang. Biaya batasan ini: admin meminta kampus memperbarui identitas tersebut.
- Regresi telah ditulis tetapi tidak dijalankan sesuai larangan tes terminal. Tidak ada commit, sehingga ledger ini dipertahankan.
