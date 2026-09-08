# Kontrak transisi ke PocketBase

Tahap saat ini sepenuhnya mock. Dokumen ini adalah rancangan transisi; tidak ada PocketBase SDK runtime, endpoint bisnis, autentikasi produksi, migrasi, atau koneksi database yang diaktifkan.

## Batas lapisan

```text
UI → state halaman → DataService → mock Dexie
                            ↘ adapter PocketBase / SvelteKit API (tahap berikutnya)
```

Kontrak asinkron berada di `src/lib/types.ts`. Operasi saat ini menerima `DemoSession` untuk mensimulasikan pemeriksaan role. Implementasi produksi harus menyelesaikan identitas dari sesi yang terverifikasi; jangan mempercayai role atau campusId yang dikirim klien.

`load()` menyediakan data dashboard dan fitur: daftar kampus/referensi penulis forum, definisi indikator, data kerja sesuai role, forum bersama, FAQ, dan aktivitas. Implementasi mock menyimpan satu snapshot terstruktur serta tabel Blob, menggunakan transaksi read-modify-write Dexie agar pembaruan tidak hilang dan nomor versi tetap unik. Ini bukan model tabel PocketBase yang harus disalin langsung. Backend produksi dapat menggunakan koleksi terpisah dan pagination di balik facade yang sama.

Operasi mutasi yang dipertahankan: `updateIndicator`, `addFeedback`, `closeFeedback`, `uploadProposal`, `ask`, `answer`, `toggleLike`, `promoteFaq`, `saveFaq`, `moveFaq`, dan `deleteFaq`. `proposalFile` mengembalikan Blob setelah memeriksa akses. `reset` adalah operasi khusus demo dan harus tidak tersedia pada adapter produksi.

## Pemetaan entitas

| Entitas | Koleksi yang disiapkan | Relasi dan batas akses produksi |
|---|---|---|
| Akun (pengganti DemoSession) | `users` auth | Role `campus`/`admin`; akun Campus terhubung ke satu kampus, satu akun per kampus |
| Campus | `campuses` | Identitas kampus; nama/penulis forum dapat dibaca pengguna terautentikasi |
| IndicatorDefinition | `indicator_definitions` | Definisi dan kategori bersama, read-only bagi Campus |
| CampusIndicator | `campus_indicators` | Relasi campus + definition unik; Campus hanya mengubah nilai aktual/catatan miliknya |
| Feedback | `indicator_feedback` | Relasi campus + indicator + penulis Admin; Campus membaca miliknya; Admin membuat/menutup |
| ProposalVersion | `proposal_versions` | Relasi campus, versi, catatan, file PDF; versi lama immutable; akses milik kampus atau Admin |
| Question | `questions` | Penulis campus; semua pengguna terautentikasi dapat membaca |
| Answer | `question_answers` | Relasi question unik; hanya Admin dapat menulis |
| QuestionLike | `question_likes` | Kombinasi question + campus unik; Campus hanya mengelola like miliknya |
| FaqEntry | `faq_entries` | Relasi question opsional dan unik bila terisi; salinan judul/jawaban serta urutan; ditulis Admin |
| Activity | `activities` | Relasi campus; dibaca kampus pemilik atau Admin; ditulis oleh workflow server |

ID pada kontrak adalah string opaque; UI tidak mem-parsing ID. ID seed seperti `campus-001` dan `question-1` bukan ID record PocketBase yang valid. Saat mengimpor demo ke PocketBase, buat ID PocketBase yang sah, simpan ID lama sebagai `legacyId` bila perlu, dan petakan ulang semua relasi. Jangan mengubah komponen untuk menyesuaikan format ID.

## Transaksi dan aturan bisnis

- Pembaruan indikator, perubahan feedback menjadi responded, dan aktivitas terkait adalah satu operasi bisnis.
- Upload versi baru harus menjamin file dan metadata tersimpan bersama, dengan batas unik `(campus, version)`. Jangan menghitung versi tertinggi di browser lalu membuat record melalui beberapa REST request independen.
- Toggle like membutuhkan keunikan `(question, campus)` dan penanganan konflik yang konsisten.
- Promosi FAQ memerlukan jawaban, mencegah duplikasi sumber, dan menyimpan salinan konten. Jawaban forum yang berubah tidak otomatis menimpa FAQ.
- Aturan list/view harus mempertahankan forum bersama tanpa membocorkan indikator atau proposal kampus lain. Jangan mengandalkan penyaringan di komponen.
- Pertahankan rumus capaian dan pisahkan status feedback dari progres angka. Batasi target ke angka positif pada sumber data.

## Urutan tahap berikutnya

1. Sediakan instance PocketBase khusus DEB dan lingkungan pengujian. Konfirmasi katalog indikator resmi dan kebutuhan akun sebelum memasukkan data nyata.
2. Tambahkan koleksi, indeks, aturan akses, dan pengujian dengan dua akun kampus terpisah serta Admin.
3. Implementasikan autentikasi server dan adapter yang memenuhi kontrak. Kredensial superuser harus server-only; jangan gunakan `VITE_*` untuk secret.
4. Migrasikan pembacaan, kemudian mutasi sederhana, lalu workflow yang membutuhkan transaksi. Pertahankan backend mock untuk demo terisolasi.
5. Jalankan regresi akses, konkurensi versi/like, forum lintas kampus, serta file terproteksi. Deploy frontend dan penerapan schema adalah langkah terpisah yang perlu diverifikasi masing-masing.

Tahap produksi tidak boleh mengaktifkan login pilih role, reset demo, atau seed contoh pada data nyata.

## Penambahan kontrak 8 September 2026

- `Question.categoryIds` menyimpan satu atau beberapa topik dari katalog `src/lib/forum.ts`. `ask` memvalidasi kategori. Backend harus menerapkan validasi yang setara; filter kategori dan pencarian teks jawaban tetap tersedia untuk audience forum bersama.
- `Notification` dipetakan ke koleksi `notifications` dengan penerima akun terverifikasi, relasi kampus, jenis peristiwa, target detail, waktu, dan status baca. `load` hanya mengembalikan notifikasi penerima aktif; `readNotifications` hanya mengubah miliknya. Role demo bukan identitas penerima yang cukup untuk produksi.
- Pembuatan notifikasi dan mutasi pemicunya perlu transaksi yang sama. Jika email/push ditambahkan, gunakan pencatatan event pengiriman dan retry yang terpisah dari status baca pengguna.
- `notificationSeedVersion` dan contoh Simulasi hanya milik mock; jangan migrasikan sebagai notifikasi nyata.
- Perbandingan proposal membaca Blob dari `proposalFile`. Backend wajib memeriksa akses setiap file sebelum mengirimnya. Pembandingan teks tetap dapat berjalan di browser setelah kedua file diperoleh.
- Rumus progres yang ada adalah rumus demo; penerapan produksi harus memakai aturan indikator yang disahkan program sebagaimana dicatat dalam audit.
