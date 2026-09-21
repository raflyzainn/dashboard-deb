# Proposal: versi, PDF, dan tanggapan admin

Kartu Proposal terbaru dan timeline Riwayat versi dipertahankan. Satu kotak pratinjau kecil berada di antaranya; dropdown atau tombol Pilih versi pada timeline mengganti PDF pada kotak yang sama. Versi terbaru dipilih otomatis; URL `?version=<id>` membuka versi yang dituju notifikasi. Hanya satu PDF dimuat pada satu waktu. Pratinjau berukuran 300px di desktop dan 260px di mobile, dengan unduh dan coba lagi saat pembacaan gagal. Tanggapan admin berada di bawah PDF. Perbandingan teks PDF sudah dihapus.

Admin dapat menyimpan atau memperbarui satu tanggapan per versi. Kampus pemilik dapat membacanya, tetapi tidak dapat menulis tanggapan admin. Mengunggah versi baru tidak menimpa file maupun tanggapan versi lama. Ini adalah catatan admin, bukan keputusan persetujuan proposal.

## Schema

Tidak ada collection baru. Tambahan field opsional pada `proposal_versions`:

| Field | Tipe | Fungsi |
| --- | --- | --- |
| `reviewNote` | text, maksimum 5000 | Tanggapan admin terbaru untuk versi ini. |
| `reviewedBy` | relation ke users, maksimum 1 | Identitas admin, ditentukan server. |
| `reviewedAt` | date | Waktu penyimpanan, ditentukan server. |
| `reviewRevision` | integer nonnegatif | Pemeriksaan konflik edit; record lama dimulai dari 0. |

Definisi ada di `db-schema/collections.json` dan diterapkan oleh provisioning schema yang sudah tersedia. Untuk deployment, terapkan schema sebelum aplikasi baru mengikuti [panduan deployment](DEPLOY-SVELTEKIT-REST.md). Pembaruan lokal hanya menambahkan field tersebut pada collection yang ada; tidak menghapus record, file, atau mengubah aturan akses. Lingkungan production tidak diubah dalam pekerjaan ini.

Endpoint `POST /api/proposals/:id/review` menggunakan sesi admin, validasi body, idempotency key, dan transaksi yang sudah ada. Revisi usang ditolak dengan 409. Notifikasi kampus dan aktivitas menggunakan collection yang sudah ada. File PDF tetap diambil melalui endpoint berotorisasi milik aplikasi; URL file PocketBase tidak dipublikasikan.

## Verifikasi

- `npm test`: validasi role admin, batas teks, isolasi versi, idempotensi, dan konflik edit.
- `npx playwright test --config playwright.p1.config.ts proposals.spec.ts`: PDF langsung tampil, satu viewer, pilihan versi, tanggapan tersimpan setelah reload, penolakan akses kampus lain, retry PDF, unduh, dan layout mobile.
- Mutasi browser hanya dijalankan pada PocketBase QA disposable port 8097.
