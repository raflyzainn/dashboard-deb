# Daftar 40 kampus untuk prototype

Daftar ini memakai 34 nama yang diberikan pengguna dan enam tambahan dari Appendix A dokumen `DEB_Transformation_Lab_2026_Meeting_Recap_and_Web_App_System_Brief.docx`, dengan persetujuan pengguna. Ini daftar untuk presentasi aplikasi, bukan klaim bahwa seluruh nama merupakan roster resmi program pada periode yang sama. Metadata kemitraan, pascabencana, dan afirmasi pada pesan sumber tidak dijadikan status operasional.

Enam tambahan dari dokumen:

| Nama | Nomor di Appendix A |
|---|---|
| Universitas Sultan Ageng Tirtayasa | 3 |
| Universitas Sebelas Maret | 9 |
| Politeknik Negeri Cilacap | 23 |
| Politeknik Negeri Kupang | 5 |
| Universitas Papua | 38 |
| Politeknik Kelautan dan Perikanan Sorong | 40 |

Jumlah berdasarkan pengelompokan wilayah: Jawa 15; Sumatra 10; Kalimantan & Sulawesi 7; Bali, Nusa Tenggara & Indonesia Timur 8.

Sumber data tunggal berada di `src/lib/data/campuses.ts`: nama, singkatan, wilayah, lokasi yang disampaikan pengguna, serta penanda sumber. Ejaan daftar pengguna dipertahankan, termasuk Universitas Pasir Pangaraian; dokumen Word menulis Universitas Pasir Pengaraian. Entri IPB memakai nama IPB University dari daftar pengguna. Tidak ada pengambilan logo maupun data pribadi dari tautan sumber.

Sesi kampus demo sekarang mewakili Universitas Indonesia (`campus-001`). ID seluruh kampus dipertahankan untuk menjaga hubungan dengan indikator, proposal, forum, notifikasi, dan riwayat review. Upgrade IndexedDB memperbarui metadata kampus serta nama pada notifikasi dan PDF simulasi tanpa mereset nilai, catatan, status dibaca, riwayat keputusan, atau PDF unggahan pengguna.

Nama institusi nyata digunakan untuk konteks presentasi. Seluruh angka capaian, kegiatan, pertanyaan awal, pengajuan awal, dan PDF contoh tetap data simulasi, bukan laporan dari institusi yang disebutkan.
