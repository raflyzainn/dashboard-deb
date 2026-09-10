# Kategori dan pencarian Forum Q&A

> **Status aktif P4 lokal (10 September 2026):** master kampus/lokasi dan indikator bersama tersedia. Baseline/target sama untuk seluruh kampus; aktual/catatan tetap per kampus. P1 masih BELUM. Acuan aktif: [POCKETBASE-P4.md](POCKETBASE-P4.md). Uraian P0/P2/P3 atau prototype di bawah dipertahankan sebagai riwayat; pernyataan mock/Dexie/read-only lama bukan kondisi runtime sekarang.

> Update P3 (9 September 2026): seluruh workflow tulis sudah aktif pada frontend 5176 dan PocketBase 8096. P1 autentikasi production tetap ditunda. Bagian yang menyebut Dexie, mock, P2 read-only atau port fixture adalah catatan historis; kontrak aktif ada di [POCKETBASE-P3.md](POCKETBASE-P3.md). Perintah tes standar sekarang memakai instance 5176/8096 tanpa seed/reset.

Implementasi 8 September 2026. Pengguna meminta pencarian pertanyaan berdasarkan kategori yang terdapat dalam dokumen. Pengelompokan awal memakai topik pembahasan, bukan penilaian kampus.

## Dasar dari dokumen

`DEB_Transformation_Lab_2026_Meeting_Recap_and_Web_App_System_Brief.docx` bagian 1.2 dan 2.3 menyebut Social Mapping, Theory of Change, dan IKM. Bagian 6 menjelaskan indikator/baseline dan proposal sebagai modul inti. Gambar roadmap pada bagian 4 menyebut coaching energi, ekonomi, dan sosial. Brief tidak menetapkan katalog kategori forum secara formal; katalog berikut merupakan pilihan implementasi atas permintaan pengguna, berdasarkan topik tersebut.

| ID | Label |
|---|---|
| indikator | Indikator & baseline |
| proposal | Proposal |
| social-mapping | Social Mapping |
| toc | Theory of Change (ToC) |
| ikm | IKM |
| energi | Energi |
| ekonomi | Ekonomi |
| sosial | Sosial |
| umum | Umum |

Survive/Recoverable/Pivot adalah kelompok program kampus. Putih/Biru/Hijau/Siap Exit adalah level DEB. Keduanya tidak disamakan dengan topik pertanyaan dan belum menjadi filter forum ini. Tema ekonomi Wisata Energi/Pangan Berkelanjutan/Pesisir Modern juga belum menjadi subkategori tersendiri.

## Perilaku

- Bagian **Top Rated Questions** di atas daftar forum menampilkan hingga tiga pertanyaan dengan like terbanyak (minimal satu like). Jika jumlah like sama, pertanyaan terbaru didahulukan. Bagian ini mencakup seluruh forum, terpisah dari filter daftar, dan diperbarui ketika data like berubah. Kartu menampilkan jumlah like, kategori, kampus penanya, status jawaban, dan tautan detail sesuai peran aktif. Pada ponsel, kartu disusun satu kolom.
- Kampus memilih minimal satu kategori saat membuat pertanyaan; dapat memilih beberapa.
- Kategori tampil sebagai label berwarna pada daftar dan detail pertanyaan.
- Filter dapat memilih beberapa kategori. Pertanyaan lolos bila memiliki salah satu kategori terpilih (OR).
- Filter kategori digabungkan dengan kata kunci dan status jawaban (AND), kemudian diurutkan berdasarkan terbaru atau popularitas.
- Pencarian mencakup judul, isi pertanyaan, dan jawaban Admin; mengabaikan perbedaan huruf besar/kecil.
- Pertanyaan lama tanpa metadata kategori tetap terbaca. Enam judul seed dipetakan ke kategori yang sesuai; pertanyaan lama lain masuk Umum. Tidak ada reset database.
- FAQ mempertahankan perilakunya sendiri; kategori forum tidak otomatis menjadi kategori FAQ.

## Implementasi

`src/lib/forum.ts` menyimpan katalog, validasi, fallback pertanyaan lama, dan pencocokan pencarian. `Question.categoryIds` menyimpan ID kategori. `DataService.ask` menerima array kategori; pemanggil lama tanpa parameter tetap menggunakan Umum. `CategoryTags.svelte` dan `Forum.svelte` menampilkan kontrol dan label.

Validasi service menolak daftar kosong dan ID tidak dikenal serta menghapus duplikasi. Role pembuat pertanyaan tetap Kampus; Admin menjawab. Penyimpanan dan akses mengikuti prototype lokal, belum otorisasi server.

Tes: `tests/forum-notifications.test.ts` serta `tests/browser/forum-notifications.spec.ts`, termasuk pencarian kata yang hanya ada dalam jawaban, filter beberapa kategori, persistensi kategori, dan mobile.
