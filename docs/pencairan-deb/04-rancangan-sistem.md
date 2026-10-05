# 04. Rancangan sistem

Dibangun mulai 19 September 2026 setelah aba aba pengguna (PocketBase kosong, R2 kosong, hosting Cloudflare Pages). Bagian bertanda **(usulan)** adalah pilihan teknis yang dipakai dalam implementasi.

## Gambaran besar

| Bagian | Peran |
| --- | --- |
| Browser | Aplikasi SvelteKit (Svelte 5 runes, TypeScript, Tailwind 4), paradigma PF Series. Menggambar pratinjau Word, Excel, PDF, dan gambar di dalam halaman. Unggahan langsung ke penyimpanan lewat alamat bertanda tangan yang berumur pendek |
| Server aplikasi | Di `deb.pertaminafoundation.org`. Sesi dalam cookie HttpOnly. Memeriksa sesi dan peran pada setiap permintaan. Menjalankan aturan: batas 70%, perubahan status, mail merge, gabung PDF. Menulis entri audit dalam langkah yang sama dengan perubahan |
| PocketBase | `PB_URL` (https, `deb-api.pertaminafoundation.org`). Semua rekaman dan login Entra. Semua koleksi tertutup kecuali untuk server aplikasi |
| Cloudflare R2 | Bucket `pf-monev-deb`. Satu objek per versi berkas, tidak pernah ditimpa atau dihapus. Privat |

**Browser tidak pernah berbicara langsung ke PocketBase.** Semua baca dan tulis lewat server aplikasi (model BFF). Aturan koleksi dikunci (hanya superuser), server memakai klien superuser, dan perubahan beserta entri auditnya ditulis dalam satu batch.

Kondisi repo saat ini: cabang `production` adalah demo statis (`adapter-static`, SSR mati, data di IndexedDB lewat `src/lib/data/demo/`). Kode BFF PocketBase lama ada tetapi mati (`src/lib/server/deb/**`, `scripts/pocketbase/**`, `db-schema/**`); backend sungguhan (42 rute API, `hooks.server.ts`, adapter cloudflare, cookie `deb_session`) hanya ada di `origin/main`, yang sudah menyimpang sejak d100ae2. Boleh dijadikan rujukan, jangan di merge.

Hosting: Cloudflare Pages dengan fungsi server (`adapter-cloudflare`, sudah diaktifkan di `svelte.config.js`; `wrangler.jsonc` memakai `nodejs_compat`). Variabel `.env` harus disalin ke pengaturan proyek Pages oleh pengguna sebelum deploy.

## Variabel lingkungan (nama saja, jangan pernah mencetak nilainya)

`PB_URL`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, `DEB_PUBLIC_URL` (`https://deb.pertaminafoundation.org`), `DEB_LOCAL_PREVIEW_ENABLED`, `DEB_INVITATION_KEY` (kosong), `R2_ENDPOINT`, `R2_BUCKET` (`pf-monev-deb`), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Usulan tambahan: `DEB_SUPERADMIN_EMAIL` dan rahasia penanda tangan cookie sesi.

## Masuk: Microsoft (P2 A) dan kata sandi (R3)

Halaman masuk punya dua jalur dengan mekanisme sesi yang sama (cookie `deb_session` berisi JWT bertanda tangan `DEB_INVITATION_KEY` yang membungkus token pengguna PocketBase, divalidasi `sessionClient` di `src/lib/server/deb/auth.ts`):

- **Masuk dengan Microsoft**: `GET /api/auth/oauth/microsoft/start` lalu `GET /api/auth/oauth/microsoft/callback` (`src/lib/server/deb/oauth.ts`). Akun baru dibuat dengan peran `baru`; email `DEB_SUPERADMIN_EMAIL` otomatis `super_admin`; akun nonaktif ditolak; kegagalan selalu ditampilkan di halaman masuk lewat `?error=`.
- **Email dan kata sandi**: `POST /api/auth/login` pada rute lama `api/auth/[operation]` (dengan pembatas laju). Akun kata sandi dibuat admin di halaman Pengguna (`/admin/users`, `POST /api/users`). Super admin awal dibuat skrip provisioning dengan `DEB_SUPERADMIN_PASSWORD`.

## Masuk dengan Microsoft (P2 A)

Alamat kembali yang sudah didaftarkan pengguna di Entra:

| Alamat | Dipakai untuk |
| --- | --- |
| `https://deb.pertaminafoundation.org/api/auth/oauth/microsoft/callback` | Masuk yang ditangani server aplikasi, produksi |
| `http://localhost/api/auth/oauth/microsoft/callback` | Sama, di mesin pengembang. Microsoft mengabaikan port untuk localhost |
| `https://deb-api.pertaminafoundation.org/api/oauth2-redirect` | Popup bawaan PocketBase (cara PF Series). Tetap terdaftar, tidak dipakai |

Alur **(rincian teknis usulan)**:

1. Tombol "Masuk dengan Microsoft" memanggil rute server. Server meminta metode auth ke PocketBase (`listAuthMethods`), mengambil penyedia `microsoft`, menyimpan `state` dan `codeVerifier` di cookie HttpOnly berumur pendek, lalu mengalihkan ke Microsoft dengan `prompt=select_account`.
2. Microsoft kembali ke `/api/auth/oauth/microsoft/callback`. Server memeriksa `state`, lalu menukar kode lewat `authWithOAuth2Code`. PocketBase membuat akun bila belum ada.
3. Server memasang cookie sesi (HttpOnly, Secure, SameSite Lax). Token tidak pernah dipegang JavaScript browser.
4. `hooks.server.ts` memvalidasi sesi, memuat peran dan status aktif, lalu menjaga rute.

Kelemahan PF Series yang tidak boleh ditiru: endpoint set cookie yang tidak memverifikasi token, galat SSO yang tidak pernah ditampilkan, dan aturan PocketBase yang memungkinkan pengguna menaikkan perannya sendiri. Di sini **peran hanya ditulis server**; akun tanpa peran tidak mendapat data apa pun walau memanggil alamat halaman secara langsung.

## Peran

| Peran | Siapa | Bisa apa | Kapan |
| --- | --- | --- | --- |
| Super admin | `sysadmin@pertaminafoundation.org` | Semua hak admin, plus memberi dan mencabut peran admin. Ditetapkan di pengaturan server, tidak bisa diubah dari aplikasi | Sekarang |
| Admin | Tim DEB, termasuk sisi keuangan | Semua kampus, semua tahap, peran pengguna di bawah admin | Sekarang |
| Baru | Siapa pun setelah masuk pertama kali | Hanya halaman menunggu peran | Sekarang |
| Kampus | Mentor dan koordinator satu kampus | Kampus sendiri: melihat Profil DEB, mengunggah, menjawab revisi, kelak mengisi LPJ. Layar sama dengan admin tanpa review, persetujuan, dan pembuatan dokumen | Setelah Termin 1 untuk 23 kampus, dimulai dari 17 kampus lainnya |
| Peran khusus | Misalnya Keuangan | Satu tugas sempit, misalnya hanya cek bank | Nanti |

Daftar izin dibuat sebagai data (peran ke kemampuan) agar peran baru cukup berupa pengaturan. Setiap kampus punya **mode pengisian**: `admin` (admin mengisi dan mengunggah atas nama kampus; 23 kampus didanai sekarang) atau `kampus` (akun kampus mengunggah dan menjawab revisi, admin tetap mereview, menyetujui, dan membuat dokumen; 17 kampus lainnya nanti). Layarnya sama (Q4). Catatan untuk nanti: pengguna kampus bukan anggota tenant Pertamina Foundation, jadi cara mereka masuk perlu diputuskan saat fase sisi kampus.

## Koleksi PocketBase (nama Inggris, sudah dibuat pada 19 September 2026)

Skema dibuat oleh `scripts/pocketbase/provision-deb.ts` (idempoten, hanya menambah): 22 koleksi aplikasi lama dari `db-schema/collections.json` ditambah koleksi pencairan di `scripts/pocketbase/deb-schema.ts`. Semua aturan koleksi pencairan null: hanya server aplikasi (superuser) yang membaca dan menulis.

| Koleksi | Isi | Catatan |
| --- | --- | --- |
| `users` | Akun (Entra atau kata sandi), `role` = `baru`, `campus`, `admin`, `super_admin`, `active`, `verified`, `sessionVersion`, `lastLoginAt` | Peran hanya ditulis server. Super admin ditentukan `DEB_SUPERADMIN_EMAIL`; di modul lama ia dipetakan sebagai admin bertanda, dan aturan koleksi lama yang menyebut `@request.auth.role = "admin"` diperluas oleh skrip provisioning agar `super_admin` lolos. Indeks unik satu akun kampus per kampus dihapus |
| `campuses` | 40 kampus: nama sesuai SK untuk 23 kampus didanai, `code`, `fundedWave`, `fillMode` (`admin` atau `campus`), `programYear`, `theme`, `program` (json Profil DEB), `programRevision`, `letterheadKey`, plus kolom lama (region, province, koordinat) | Profil DEB disimpan sebagai json `program` dan diubah lewat `PATCH /api/campuses/[id]/program`. Isinya dimuat dari lembar Rencana Aksi Naik Kelas oleh `scripts/pencairan/load-profil.ts` (dokumen 08); kunci `pfTeam` menyimpan tim pendamping |
| `sk_awards` | `campus`, `skNumber`, `skDate`, `wave`, `amountSen`, `programTitle`, `programYear`, `locked` | 23 baris dari `deb-matrix.json`. Uang dalam sen |
| `program_settings` | `programYear`, `pfSignatoryName`, `pfSignatoryTitle`, `agreementStart`, `agreementEnd`, `reportDeadline`, `pksTemplate` | Satu baris per tahun program, diisi admin |
| `disbursements` | `campus`, `term`, `stage` 1 sampai 7, `requestedSen`, `paidSen`, `properties` (nomor dan tanggal surat, satu satunya tempatnya), `clauseChecked`, `templateMode`, `rabVersion`, `revision` | Unik per kampus dan termin |
| `documents` | `disbursement`, `kind` (pks, rab, permohonan, invois, kuitansi, rekening, surat_kuasa), `status`, `currentVersion`, `signedReceived`, `originalReceived` | Slot dokumen; statusnya mengikuti versi yang berlaku |
| `document_versions` | `document`, `number`, `r2Key`, `originalName`, `size`, `mime`, `sha256`, `uploadedBy`, `origin` (upload, generated, initial_load), `fields` json beserta `fieldsBy`, `fieldsAt`, `fieldsCheckedBy`, `fieldsCheckedAt`, `fieldsSamePerson`, `generation` | Tidak pernah dihapus. Isian melekat pada versi |
| `reviews` | `version`, `decision`, `note`, `actor`, `actorName`, `imported` | Catatan lembar review dimuat dengan `imported = true` |
| `bank_checks` | `disbursement`, bank, cabang, `accountNumber`, `holderNames`, `attorneyNames`, `namesMatch`, `overrideReason`, `bankResult`, `bankNameSeen`, `evidenceKey`, `checkedBy` | Nomor rekening disamarkan di luar layar Rekening |
| `pks_templates` | `campus` (kosong berarti standar), `version`, `r2Key`, `differences`, `reason`, `active` | Perbedaan pasal dihitung saat diunggah |
| `rab_versions`, `rab_lines` | Versi RAB (`status` draf, menunggu, disetujui, `totalSen`, `term1Sen`, `term2Sen`, `source`) dan baris empat tingkat (`parent`, `level`, `code`, `volume`, `unitPriceSen`, `amountSen` = RAB 100%, `term1Sen` = RAB 70%, `term2Sen` = RAB 30%, sejak keputusan 42) | Versi disetujui dibekukan |
| `attachments` | `disbursement`, `number`, `r2Key`, `composition` | PDF gabungan per kampus |
| `audit` | `actor`, `actorName`, `actorEmail`, `action`, `context`, `collection`, `record`, `campus`, `before`, `after`, `note` | Hanya bisa ditambah. Ditampilkan di bawah tiap halaman lewat `RiwayatPerubahan.svelte` |
| `lpj_entries` | Satu entri per invois | Dibuat untuk nanti |
| `proposal_versions` (koleksi lama) | `campus`, `version`, `file` (PDF, paling besar 40 MB sejak 20 September 2026), `filename`, `size`, `changes`, `uploadedBy`, `legacyId`, catatan review | 66 versi dari arsip 2025-2026 dimuat oleh `scripts/proposals/load-proposals.ts` (dokumen 08) |
| `notes` | `document`, `campus`, `body` (paling panjang 4000 huruf), `internal`, `author`, `authorName`, `authorRole` (`admin`, `super_admin`, `campus`) | Percakapan per butir (keputusan 38). Catatan internal tidak pernah dikirim ke akun kampus |

Nilai status slot: `belum_ada`, `menunggu_review`, `perlu_konfirmasi`, `perlu_revisi`, `sesuai`.

## Berkas di R2

- Pola kunci **(usulan)**: `kampus/{KODE}/termin-1/{slot}/v{n}_{waktu}_{nama-berkas}`. Templat: `templat/pks/standar/v{n}.docx` dan `templat/pks/{KODE}/v{n}.docx`. Lampiran: `kampus/{KODE}/termin-1/lampiran/v{n}.pdf`.
- Tidak ada penimpaan dan tidak ada penghapusan. Versi baru berarti objek baru.
- Bucket privat. Unggah dan lihat lewat alamat bertanda tangan berumur pendek yang dibuat server setelah memeriksa peran.
- Usulan pustaka di runtime Workers: penanda tangan S3 yang ringan (misalnya `aws4fetch`), bukan SDK penuh.

## Jejak audit (di setiap halaman)

- Satu koleksi `audit`, hanya bisa ditambah. Kolom: waktu, aktor (id, nama, dan email saat itu), tindakan, koleksi dan id rekaman, kampus, **kunci konteks halaman**, nilai sebelum, nilai sesudah, catatan.
- Kunci konteks contoh: `kampus:PNK/profil`, `kampus:PNK/pencairan/t1`, `kampus:PNK/pencairan/t1/rekening`, `kampus:PNK/rab`, `pengguna`.
- **Tidak ada halaman audit khusus.** Setiap halaman diakhiri blok "Riwayat perubahan" (satu komponen bersama), terlipat secara bawaan, berisi siapa mengubah apa di halaman itu dengan nilai sebelum dan sesudah, terbaru di atas, dengan "Lihat semua".
- Di dalam panel dokumen tetap ada "Riwayat versi dan perubahan" khusus dokumen itu.

## Pratinjau berkas di dalam halaman

| Jenis | Cara **(usulan pustaka)** |
| --- | --- |
| PDF dan gambar | Langsung di browser |
| Word | Digambar di browser dari berkas asli (misalnya `docx-preview`) |
| Excel | Digambar di browser (misalnya SheetJS, periksa dulu apakah sudah ada di `package.json`) |

Berkas tidak pernah dikirim ke layanan penampil pihak ketiga, karena berisi data pribadi.

## Mail merge dan pratinjau langsung

- Templat Word resmi diubah menjadi templat gabungan: setiap bidang bersorotan kuning diganti penanda bidang; "Tahun Ketiga" menjadi bidang tahun program; penandatangan PF dan masa perjanjian diambil dari `pengaturan_program`; varian pasal Luaran dipilih menurut tahun program dan tema.
- **Satu fungsi gabungan yang sama** dipakai di browser (pratinjau langsung, digambar ulang saat properti berubah) dan di server (hasil akhir). Usulan pustaka: `docxtemplater` dengan `pizzip`, atau `docx-templates` bila perlu menyisipkan gambar kop.
- Saat disimpan, server membuat berkas akhir dari data yang sama, menyimpannya sebagai versi baru slot, dan menyimpan potret data serta versi templat yang dipakai. Unduhan adalah berkas yang sama dengan yang dipratinjau.
- Keluaran berupa Word siap cetak dan tanda tangan. Hanya halaman Termin 1.
- PKS khusus (P1 A): saat templat khusus diunggah, server membandingkan paragrafnya dengan templat standar (bidang disamarkan, angka dibuang, rasio kemiripan di bawah 0,97 dianggap berubah), mengelompokkan menurut 22 judul pasal, dan menyimpan daftar pasal yang berbeda. Metode ini sama dengan `D:\deb\Analisis\pks_study3.py`.

### Yang dibangun (19 September 2026)

- Templat gabungan: `static/templat/pks-standar.docx`, `permohonan.docx`, `invois.docx`, `kuitansi.docx`, dibuat oleh `scripts/templat/convert.py` (dapat diulang) dari templat resmi; sorotan kuning menjadi penanda, hanya halaman Termin 1, tanpa nama orang yang ditulis mati. `scripts/templat/check.mjs` membuka tiap templat dengan docxtemplater. 45 penanda didokumentasikan di kepala `convert.py` dan `src/lib/merge.ts` (SK, Profil DEB, properti dokumen, RAB, rekening, pengaturan program).
- `src/lib/merge.ts` (pembangun data dan `renderDocx`, mode pratinjau menandai nilai gabungan), `src/lib/pks-compare.ts` (perbandingan templat khusus terhadap standar, 23 judul pasal termasuk K3L), `src/lib/server/deb/generate.ts` (pengaturan program, kesiapan, pemuatan templat lewat `read()` dari `$app/server`, templat khusus dari R2, pratinjau dan simpan lewat `addVersion` asal `generated` dengan potret data; isian versi diwarisi dari properti sesuai Q1).
- Rute: `GET/PATCH /api/pengaturan-program`, `GET /api/pencairan/[campus]/buat`, `GET /api/pencairan/[campus]/buat/[kind]` (pratinjau docx; `?download=1` berkas akhir, ditolak selama ada isian kosong), `POST` (simpan versi), `GET/POST/PATCH /api/pencairan/[campus]/pks-templat`.
- Halaman `/admin/pencairan/[id]/buat` (`BuatDokumen.svelte`) dan `/admin/pencairan/pengaturan` (`PengaturanProgram.svelte`).
- Belum: varian pasal Luaran menurut tema, kop surat berupa gambar, unggah templat khusus belum diuji di browser (rute dan perbandingan diuji luring).

## Gabung PDF

Usulan pustaka: `pdf-lib`. Masukan hanya pindaian PDF dan gambar dari slot berstatus Sesuai, ditambah lembar ringkasan buatan sistem dan halaman RAB yang dicetak dari data terkelola. Karena dokumen akhir selalu berupa pindaian bertanda tangan, tidak diperlukan konversi Word ke PDF di server.

## Uang

Semua jumlah disimpan sebagai bilangan bulat sen. 70% dihitung sebagai `nilai_rupiah x 70` sen. Format tampilan id-ID dengan koma untuk sen bila ada. Fungsi terbilang mendukung sen.

## Keamanan dan privasi

- **Pembaruan langsung (keputusan 46):** browser admin membuka satu sambungan SSE ke PocketBase untuk koleksi `audit` dengan token impersonasi 2 jam yang dicetak server; hanya `audit` yang bisa dibaca dengan token itu, data tetap lewat server aplikasi.

Surat kuasa dan buku rekening adalah berkas terlindungi; tidak ada ekstraksi otomatis; nomor rekening disamarkan di luar layar Rekening; tidak ada data pribadi di log, audit ringkas, atau nama kunci objek.

## Tambahan versi 9 (19 September 2026)

- `documents.kind` bertambah `laporan` (Format laporan DEB Termin 1; dihapus dari daftar butir pada 20 September 2026, keputusan 39, nilai skema dan baris lama dibiarkan). `document_versions.signed` (pindaian bertanda tangan) dan `document_versions.scan` (hasil `docscan.ts`: `termin2Hits`, `highlight`, `words`, `scannedAt`; diisi saat unggah berkas Word dan oleh `scripts/pencairan/rescan.ts --apply` untuk berkas lama). `attachments.sha256`, `verification`, `pages`. `disbursements.paidAt`, `paidSen`, `paidRef`, `paidByName`, `paidNote`.
- Koleksi `verifications`: `code` (unik, pola `DEB-<KODE KAMPUS>-T<tahap>-<PKS|PMH|INV|KWT|RAB|LMP>-<4 huruf>`), `campus`, `term`, `kind`, `documentVersion` atau `attachment`, `sha256`, `amountSen`, `label`, `issuedBy`, `issuedByName`. Dibuat saat dokumen final disimpan (`saveGenerated`) dan saat lampiran disimpan.
- QR di setiap halaman: berkas Word lewat `withVerificationFooter` (`src/lib/merge.ts`, footer dengan gambar PNG dari `src/lib/qr.ts`), PDF lampiran lewat kotak per modul dengan pdf-lib. Pratinjau memakai `SAMPLE_CODE`; kode sungguhan hanya untuk berkas yang disimpan.
- Halaman publik `/verifikasi/[kode]` dan `GET /api/verifikasi/[kode]` tanpa sesi: hanya kampus, jenis dokumen, tahap, tanggal terbit, nominal, dan SHA-256. Tidak ada nama orang, tidak ada akses berkas.
- Bacaan kampus (`assess()` di `src/lib/pencairan.ts`) dipakai server dan browser: butir selesai bila Sesuai atau Tidak diperlukan; Lengkap bila semua selesai dan tidak ada cek otomatis merah; Siap dibayar bila Lengkap, empat asli diterima, dan lampiran tersimpan; Dibayar bila `paidAt` terisi.

## Token server (20 September 2026, mengikuti PF Series)

Server aplikasi memegang `PB_SUPER_TOKEN`, token superuser berumur panjang yang diterbitkan sekali oleh `scripts/pocketbase/super-token.ts` (masuk dengan kata sandi dari mesin pengembang, lalu impersonasi superuser selama 400 hari; token ditulis ke `.env`, tidak pernah dicetak). Saat melayani permintaan, server hanya memasang token itu, tanpa permintaan masuk ke PocketBase, seperti `createAdminPB()` dengan `PB_SUPER_TOKEN` di PF Series. Sebelumnya server masuk dengan email dan kata sandi pada setiap permintaan; itu penyimpangan dari paradigma PF Series, memakan batas laju autentikasi, dan gagal dari Cloudflare Pages. Masuk dengan kata sandi tinggal cadangan untuk pengembangan bila token tidak diisi. `/api/health` melaporkan `auth` (token atau password) dan tanggal kedaluwarsa token.

## Email dari PocketBase (20 September 2026)

`scripts/pocketbase/mail-templates.ts --apply` menulis identitas pengirim (nama aplikasi dan nama pengirim "Desa Energi Berdikari · Pertamina Foundation", alamat pengirim tetap) dan lima templat email koleksi `users` dalam bahasa Indonesia dengan logo berwarna di atas putih: verifikasi email, atur ulang kata sandi, konfirmasi email baru, kode sekali pakai, dan peringatan masuk dari perangkat baru. Tautan konfirmasi membuka halaman konfirmasi bawaan PocketBase di host API karena situs belum punya halaman untuk langkah itu. Templat pada koleksi `email_challenges` dibuat aplikasi per undangan (badan email disimpan di rekaman) dan tidak diubah. SMTP tidak disentuh oleh skrip.
