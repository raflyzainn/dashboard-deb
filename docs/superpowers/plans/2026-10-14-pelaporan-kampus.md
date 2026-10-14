# Pelaporan Kampus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Membuka pelaporan setelah pembayaran T1, menyediakan empat keluaran berversi, dan menjadikan penyelesaian LPJ oleh admin sebagai prasyarat T2.

**Architecture:** Gunakan layanan PocketBase, storage, komponen LPJ, audit, notifikasi dan transaksi `atomic` existing. Tambahkan collection keluaran terpisah dari dokumen pencairan, dengan halaman bersama untuk kampus/admin dan endpoint yang memeriksa kepemilikan serta transisi status di server.

**Tech Stack:** Svelte 5, SvelteKit, TypeScript, Tailwind, PocketBase, storage lokal/R2 existing, tool Playwright untuk QA.

**Spec:** `docs/superpowers/specs/2026-10-14-pelaporan-kampus-design.md` — disetujui pengguna 14 Oktober 2026.

## Global Constraints

- Branch `feat/pelaporan-kampus-20261014`, basis GitLab production `fa84daee78dbb0317a33b10e30820ed236663261`; perubahan lain tidak ikut dipindahkan.
- Akses tulis hanya setelah `paidAt` terisi dan `paidSen > 0`, termasuk record pencairan lama.
- Artikel: teks web, DOCX atau PDF. Laporan: DOCX/PDF; infografis: PDF. Berkas ini maksimal 20 MB.
- Video MP4 maksimal 40 MB dan 120 detik; durasi diperiksa dari isi berkas di server.
- Judul artikel maksimal 200 karakter, isi maksimal 50.000 karakter; tampilkan sebagai teks biasa.
- LPJ selesai hanya oleh admin, setelah sedikitnya satu bukti dan semua bukti Sesuai. Buka kembali wajib alasan.
- Riwayat tetap tersedia, periode berdasarkan SK pencairan, bukan tahun komputer. Tidak ada konversi data massal.
- Tidak membangun generator infografis, form narasi tanpa template resmi, paket pencairan T2 penuh, atau penguncian akun tahunan.
- QA localhost:5177/PocketBase:8097 dengan data bertanda QA. Tidak menyentuh data/layanan production.
- Boleh menulis tes, tetapi tidak menjalankan tes/check/lint/build terminal; tidak commit/push/PR tanpa permintaan berikutnya.

## Review Focus

1. Kampus memiliki beberapa SK: jangan diam-diam memakai SK pertama; pakai referensi SK pengajuan yang tersimpan, atau satu SK yang tidak ambigu, selain itu tampilkan konflik.
2. Kiriman ganda/retry setelah koneksi putus: tidak menghasilkan dua versi dan tidak menimpa konten yang sudah dikirim.
3. Penyelesaian LPJ bersamaan dengan penambahan/review bukti: hanya satu perubahan konsisten yang diterima; tidak boleh selesai dengan bukti belum Sesuai.
4. Berkas lolos ekstensi tetapi isi rusak, MP4 metadata tidak valid, atau storage gagal: tolak dengan pesan jelas dan pertahankan versi lama.
5. Beralih akun atau kampus sambil memuat berkas: endpoint tetap membatasi kepemilikan, UI membuang hasil permintaan halaman sebelumnya.

---

## Task 1: Kontrak data, validasi berkas dan periode

**Files:**
- Create: `src/lib/pelaporan.ts`, `src/lib/server/deb/report-file.ts`, `tests/report-file.test.ts`.
- Modify: `scripts/pocketbase/deb-schema.ts`.
- Create: `docs/pencairan-deb/RUNBOOK-PELAPORAN-LOKAL.md`.

**Interfaces:**
- `ReportKind = 'laporan' | 'infografis' | 'video' | 'artikel'`.
- `ReportStatus = 'draf' | 'menunggu_review' | 'perlu_revisi' | 'sesuai'`.
- `ReportVersion`: id, kind, version, format (`text`/`file`), title, body, originalName, mime, size, hash, durationSeconds, status, created, authorName, reviewedAt, reviewerName, note. Jangan kirim storage key ke UI.
- `ReportWorkspace`: campusId, campusName, awardId, paid, latest (per jenis), history, annualComplete.
- `checkedReportFile(kind: ReportKind, name: string, bytes: ArrayBuffer): { mime: string; durationSeconds?: number }`.

- [x] Tulis tes validasi: PDF/DOCX asli diterima sesuai jenis; infografis DOCX, berkas kosong, tipe palsu, ukuran melebihi batas ditolak; video 120 detik diterima dan 120,01 ditolak.
- [x] Implementasikan validasi dengan `checkedFileMime` existing untuk dokumen. MP4 membaca ukuran box dengan batas buffer, mendukung ukuran 64-bit yang aman, memerlukan ftyp/moov serta track video dan metadata waktu valid; tolak durasi nol/tidak hingga serta metadata ambigu. Jangan memperluas jenis upload pencairan umum.
- [x] Tambahkan `report_versions`: relasi campus/award/disbursement; jenis, versi, format, isi, metadata, status, penulis/reviewer/catatan/waktu, operationId. Indeks unik `(award, kind, version)` dan operationId; seluruh aturan akses langsung null. Tambahkan batas panjang/ukuran di schema.
- [x] Dokumentasikan migrasi lokal aditif mengikuti launcher/penanda existing, snapshot sebelum perubahan dan cara mempertahankan record lama. Jangan menjalankan migrasi production.
- [x] Catat tes terminal belum dijalankan; validasi nyata melalui unggah browser pada Task 4.

## Task 2: Layanan keluaran, versi dan review

**Files:**
- Create: `src/lib/server/deb/pelaporan.ts`, `tests/pelaporan.test.ts`.
- Create: `src/routes/api/pencairan/[campus]/pelaporan/+server.ts`.
- Create: `src/routes/api/pencairan/[campus]/pelaporan/[version]/+server.ts`.
- Modify: `src/hooks.server.ts`, `src/lib/server/deb/access.ts`.

**Interfaces:**
- `reportWorkspace(pb: PocketBase, campusId: string): Promise<ReportWorkspace>`.
- `saveReport(pb, store, actor, campusId, input, file?)`: input berisi kind, format, title, body, operationId dan expectedVersion; menghasilkan ReportVersion baru berstatus draf.
- `changeReport(pb, actor, campusId, versionId, action: 'submit' | 'sesuai' | 'perlu_revisi', note?: string)`.
- `reportFile(pb, store, campusId, versionId): Promise<Response>`.
- GET collection mengembalikan workspace; POST multipart menyimpan draf. PATCH versi menerima action submit/review. GET versi mengirim berkas melalui akses privat.

- [x] Tulis tes: sebelum bayar ditolak, kampus lain ditolak, ambiguous SK ditolak, versi lama tetap terbaca, stale expectedVersion ditolak, operationId identik tidak menggandakan, konten menunggu review tidak terganti.
- [x] Tentukan SK di server dari snapshot SK pengajuan tersimpan; fallback hanya jika satu SK relevan. Jangan memakai `campusWithAward` yang mengambil SK pertama untuk menetapkan periode laporan.
- [x] Implementasikan pembacaan tanpa membuat pencairan baru. Empat status Sesuai pada versi terkini berarti annualComplete; versi draf baru membatalkannya.
- [x] Simpan file dengan key acak server sebelum metadata; gunakan hash untuk retry dan `atomic` untuk versi, audit, notifikasi. Transaksi memeriksa ulang pembayaran, periode, versi terkini, operationId dan status. Kegagalan metadata tidak menghapus versi lama; jangan taruh operasi storage di callback transaksi yang dapat diulang.
- [x] Sambungkan endpoint melalui `secured`, pembatasan kampus sendiri, batas multipart/JSON existing. Bebaskan hanya LPJ/pelaporan dari dispatch pengajuan dan lock dokumen setelah bayar; pertahankan lock finansial lainnya.
- [x] Kirim notifikasi existing saat submit dan revisi, satu kali per transisi; jangan mengirim email/WhatsApp.

## Task 3: LPJ setelah pembayaran dan penyelesaian admin

**Files:**
- Modify: `src/lib/server/deb/lpj.ts`, `src/lib/components/admin/pencairan/Lpj.svelte`.
- Modify: `src/routes/api/pencairan/[campus]/lpj/+server.ts`, `src/routes/api/pencairan/[campus]/lpj/[entry]/+server.ts`.
- Modify: `scripts/pocketbase/deb-schema.ts` untuk metadata revisi bukti bila field existing belum mencukupi.
- Create: `tests/lpj-completion.test.ts`.

**Interfaces:**
- Perluas hasil `lpjSummary` dengan acceptedSen, completion (`null` atau completedAt/completedBy), canComplete dan t2Ready.
- `finishLpj(pb, actor, campusId, reopen: boolean, reason: string)`; hanya endpoint admin.
- Revisi bukti mempertahankan berkas/metadata sebelumnya dan mengganti versi aktif menjadi menunggu_review; hanya bukti perlu_revisi pada LPJ terbuka yang dapat diperbaiki kampus.

- [x] Tulis tes: kosong/pending/perlu_revisi tidak bisa selesai, seluruh bukti Sesuai masih perlu aksi admin, setelah selesai tambah/revisi/review ditolak, reopen tanpa alasan ditolak dan reopen sah membatalkan t2Ready.
- [x] Terapkan paidAt + paidSen pada semua jalur LPJ, termasuk legacy. Hapus syarat fillMode untuk kampus pemilik setelah pembayaran. Gunakan tanggal kalender valid, MIME isi, jumlah sen integer aman, dan RAB disetujui milik kampus/periode relevan.
- [x] Pindahkan tambah/revisi/review/complete/reopen ke transaksi `atomic` dengan lingkup disbursements dan lpj_entries yang sama. Pertahankan properties lainnya, audit dan versi bukti. Tambahkan tes konkurensi penambahan/review vs completion.
- [x] Pisahkan total dilaporkan dari total disetujui; jangan menamai bukti menunggu sebagai sudah diterima. Jangan mewajibkan total sama dengan pembayaran.
- [x] Sambungkan form revisi, catatan reviewer, riwayat bukti, tombol Selesaikan LPJ dan Buka kembali; status dan kesiapan T2 berasal dari server.

## Task 4: Halaman kampus/admin, navigasi dan QA

**Files:**
- Create: `src/lib/components/shared/pelaporan/Pelaporan.svelte`, `src/lib/components/shared/pelaporan/ReportCard.svelte`.
- Create: `src/routes/(app)/campus/pelaporan/+page.svelte`, `src/routes/(app)/admin/pencairan/[id]/pelaporan/+page.svelte`.
- Modify: `src/routes/(app)/campus/lpj/+page.svelte`, `src/routes/(app)/campus/dashboard/+page.svelte`, `src/routes/(app)/campus/guide/+page.svelte`.
- Modify: `src/lib/components/layout/Shell.svelte`, `src/lib/components/admin/pencairan/Tahap2Kartu.svelte`, `src/lib/campus-access.ts`, `src/lib/server/deb/page-reads.ts` dan kontrak navigasi yang dipakai caller.
- Modify: `tests/campus-access.test.ts`, `README.md`, `docs/PANDUAN-CODEX.md`.
- Create: `docs/QA-PELAPORAN-KAMPUS-2026-10-14.md`.

**Interfaces:**
- `Pelaporan`: props campusId dan mode (`campus`/`admin`); mengambil endpoint workspace serta memuat komponen LPJ existing.
- `ReportCard`: props jenis, latest, history, mode dan onChanged untuk refresh server; tidak menyimpan sumber kebenaran status sendiri.
- Navigasi menambahkan canReport berdasarkan pembayaran T1; sebelum bayar halaman langsung menampilkan alasan terkunci.

- [x] Tulis perubahan tes allowlist agar pelaporan dan redirect LPJ tersedia, sedangkan modul kampus lain tetap tertutup.
- [x] Buat empat kartu ringkas dengan pengisian langsung, Simpan draf/Kirim, review admin, catatan dan riwayat. Artikel memilih teks/Word/PDF; kiriman terkunci ketika menunggu pemeriksaan. Tampilkan teks artikel tanpa HTML.
- [x] Tampilkan error dan draf pengguna saat simpan gagal; cegah stale response antar-kampus dan double click. Gunakan label form, pesan batas, indikator proses dan komponen feedback existing.
- [x] Hubungkan Beranda/menu/Panduan, redirect LPJ lama ke bagian LPJ, dan tautan admin. Hapus pembatasan LPJ berdasarkan nama mode lokal. Kartu T2 menampilkan prasyarat selesai tanpa tombol pengajuan T2 yang belum tersedia.
- [x] Siapkan schema dan fixture lokal bertanda QA sebelum/sesudah pembayaran; pakai akun QA sendiri, bukan mengubah pembayaran kampus pengguna. Jalankan server worktree pada 5177 dengan PB lokal 8097 dan pastikan sumber yang dilayani memang branch ini.
- [x] QA tool Playwright: sebelum/sesudah bayar, akun lain, keempat keluaran dan tiga format artikel, validasi berkas/video, simpan/kirim/revisi/riwayat, reload, LPJ complete/reopen, annualComplete dan tampilan 390 px. Periksa permintaan API yang melewati tombol UI melalui konteks browser terautentikasi.
- [x] QA konkurensi dan gagal simpan lewat fixture/kondisi terkontrol lokal; jangan mengaku diperiksa bila tidak dapat dipicu. Simpan screenshot hasil utama, catat hasil nyata dan batasnya.
- [x] Review seluruh diff dengan satu reviewer independen setelah implementasi, perbaiki temuan, ulang hanya QA yang terkait. Tidak commit otomatis.
- [x] Perbarui panduan dan pemetaan Excel: tandai tersedia, terbatas atau menunggu template sesuai bukti. Laporkan terpisah QA browser, pemeriksaan kode dan tes terminal yang belum dijalankan.

## Pemeriksaan rencana

Pemetaan spec: penyimpanan/validasi pada Task 1–2, periode/keamanan/riwayat pada Task 2, LPJ dan gate T2 pada Task 3, empat keluaran/navigasi/review/QA pada Task 4. Lima risiko Review Focus memiliki kasus di Task 1–4. Tidak menambah paket T2 atau generator yang ditunda dalam rancangan.

Rekomendasi pelaksanaan: native, dikerjakan oleh agen utama dalam sesi ini, lalu satu review akhir independen. Keempat tugas berbagi aturan transaksi dan periode; pelaksanaan berurutan mengurangi risiko ketidakcocokan antarmodul.
