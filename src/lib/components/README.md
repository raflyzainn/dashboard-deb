# Struktur komponen

| Folder | Isi |
| --- | --- |
| `ui/` | Elemen umum: Icon, Badge, Modal, Empty, Progress, Stat. |
| `layout/` | Shell aplikasi, sidebar, dan navigasi lintas role. |
| `auth/` | Login/aktivasi, panduan masuk, dan ganti password. |
| `admin/accounts/` | Pengelolaan akun kampus. |
| `admin/campuses/` | Direktori/detail kampus, tabel kampus, dan formulir master kampus. |
| `admin/indicators/` | Riwayat perubahan master indikator. |
| `campus/indicators/` | Pengisian indikator dan autosave kampus. |
| `shared/` | Halaman/domain yang dipakai lintas role: dashboard, faq, forum, indicators, notifications, proposals. |

Komponen khusus role ditempatkan di `admin/<halaman>/` atau `campus/<halaman>/`. Komponen halaman yang digunakan kedua role berada di `shared/<halaman>/`; jangan menggandakan implementasinya. Tabel kampus tetap di domain admin meskipun dipakai juga oleh cabang admin pada dashboard bersama.

File `+page.svelte` dan `+layout.svelte` tetap di `src/routes` sesuai URL. Isi halaman yang hanya ada pada satu route boleh tetap di route tersebut; ekstrak komponen saat membantu keterbacaan atau dipakai ulang.

Gunakan import relatif untuk komponen dalam folder yang sama, dan `$lib/components/...` untuk lintas folder. Nama folder membantu pencarian kode; otorisasi tetap ditegakkan oleh aplikasi/server.
