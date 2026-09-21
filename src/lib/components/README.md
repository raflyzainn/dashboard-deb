# Struktur komponen

| Folder | Isi |
| --- | --- |
| `ui/` | Elemen umum: Icon, Badge, Modal, Empty, Progress, Stat. |
| `layout/` | Shell aplikasi, sidebar, dan navigasi lintas role. |
| `auth/` | Login/aktivasi, panduan masuk, dan ganti password. |
| `admin/accounts/` | Pengelolaan akun kampus. |
| `admin/campuses/` | Direktori/detail kampus, tabel kampus, dan formulir master kampus. |
| `admin/indicators/` | Riwayat perubahan master indikator. |
| `campus/indicators/` | Indikator kampus: tampil baca dahulu, mode ubah, lalu simpan eksplisit. |
| `shared/` | Halaman/domain yang dipakai lintas role: dashboard, faq, forum, indicators, notifications, proposals. |

Komponen khusus role ditempatkan di `admin/<halaman>/` atau `campus/<halaman>/`. Komponen halaman yang digunakan kedua role berada di `shared/<halaman>/`; jangan menggandakan implementasinya. Tabel kampus tetap di domain admin meskipun dipakai juga oleh cabang admin pada dashboard bersama.

File `+page.svelte` dan `+layout.svelte` tetap di `src/routes` sesuai URL. Isi halaman yang hanya ada pada satu route boleh tetap di route tersebut; ekstrak komponen saat membantu keterbacaan atau dipakai ulang.

Gunakan import relatif untuk komponen dalam folder yang sama, dan `$lib/components/...` untuk lintas folder. Nama folder membantu pencarian kode; otorisasi tetap ditegakkan oleh aplikasi/server.

## Tipografi dan logo

Acuan keterbacaan mengikuti PF Series. Diterapkan 18 September 2026.

- Font: font sistem melalui `--font-sans` di `src/app.css` (Segoe UI di Windows, San Francisco di Apple, Roboto di Android). Tidak ada webfont yang dimuat.
- Ukuran akar 16px, sehingga `text-sm` = 14px dan `text-xs` = 12px. Teks tanpa kelas mewarisi 15px dari `<body>`.
- Skala ukuran: isi 14px, keterangan 13px, label dan kepala tabel 12px, lencana dan label kapital kecil 10 sampai 11px. Jangan memakai teks di bawah 10px.
- Tinggi baris paragraf 1.55 sampai 1.65. Ketebalan memakai 500, 600, 700.
- Jarak huruf: judul besar `-0.01em`, label kapital `0.06em`. Jangan merapatkan huruf lebih dari itu.
- Warna teks di latar terang: judul navy (`--navy`, `#17365f`), teks sekunder `--muted` (`#475569`), keterangan kecil `#64748b`. Kontras minimal 4.5:1.
- Logo Pertamina Foundation di atas latar berwarna memakai versi putih solid (`/logo-pf-white.png`). Logo berwarna penuh (`/logo-pf.png`) hanya untuk latar putih.
