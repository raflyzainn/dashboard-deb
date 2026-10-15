<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  const features = [
    {
      icon: 'dashboard',
      title: 'Beranda',
      description: 'Lihat langkah berikutnya untuk kampus Anda. Jika ada dokumen yang perlu dilengkapi atau direvisi, buka langsung dari kartu utama.',
      href: 'dashboard',
      action: 'Buka Beranda'
    },
    {
      icon: 'campus',
      title: 'Profil & Monitoring Program',
      description: 'Lengkapi kontak, lokasi, informasi program, dan indikator kesiapan rencana aksi. Isi langsung pada bagian yang diperlukan, lalu pilih Simpan perubahan. Admin PF melihat data yang sama.',
      href: 'profile',
      action: 'Buka Profil & Monitoring'
    },
    {
      icon: 'payments',
      title: 'Pencairan Dana',
      description:
        'Ikuti langkah pengajuan, pantau status, dan baca catatan pemeriksa. Data, dokumen, serta riwayat kampus tersedia di satu halaman.',
      href: 'pencairan',
      action: 'Lihat pencairan'
    },
  ];
  const submissionSteps = [
  {
    "title": "Periksa SK dan Data Program",
    "actor": "Kampus",
    "summary": "Periksa SK dan lengkapi data program. Tunggu hingga draf tersimpan.",
    "detail": "Lengkapi isian bertanda *. Data Program disimpan otomatis setelah berhenti mengetik; tunggu pemberitahuan tersimpan."
  },
  {
    "title": "Unggah satu RAB 100%",
    "actor": "Kampus",
    "summary": "Samakan RAB dengan nilai SK, lalu bagi Tahap 1 maksimal 70% dan sisanya untuk Tahap 2.",
    "detail": "Gunakan Excel contoh dan samakan total dengan nilai SK. Klik Lanjut untuk memeriksa RAB penuh, mengatur jumlah Termin 1 (maksimal 70% nilai SK), lalu memeriksa sisa Termin 2. Ketiga RAB dapat diunduh."
  },
  {
    "title": "Lengkapi administrasi dan nomor PKS kampus",
    "actor": "Kampus \u2192 PF",
    "summary": "Isi rekening, penandatangan, surat, kop dan nomor PKS kampus. Permintaan nomor PF dibuat otomatis.",
    "detail": "Buka menu Administrasi untuk mengisi Rekening Penerima, Penandatangan Kampus, Identitas Surat dan Kop, lalu PKS. Unggah Foto Buku Rekening serta kop. Rekening pihak yang diberi kuasa memerlukan surat kuasa bertanda tangan. Nomor PKS kampus diisi kampus; nomor PKS PF diisi Admin PF. Saat nomor PKS kampus tersimpan dan nomor PF belum tersedia, permintaan kepada PF dibuat otomatis, tanpa tombol permintaan. Anda tetap dapat melengkapi draf sambil menunggu PF."
  },
  {
    "title": "Periksa tanggal dan PDF PKS dari PF",
    "actor": "Admin PF",
    "summary": "PF menetapkan tanggal dan masa perjanjian kampus, lalu menyiapkan PDF PKS.",
    "detail": "Untuk pengajuan baru dengan alur Legal, Admin PF menetapkan nomor/tanggal SK, tanggal PKS dan masa perjanjian per kampus, lalu menyiapkan PDF PKS. Urutan tanggal: SK ≤ PKS < permohonan ≤ invoice < kuitansi. Tanggal surat kuasa harus setelah PKS; awal masa perjanjian tidak boleh setelah akhirnya. Mengubah satu tanggal tidak otomatis mengubah tanggal lainnya. Contoh: SK 1 Juni 2026, PKS 14 Oktober 2026, permohonan dan invoice 15 Oktober 2026, kuitansi 16 Oktober 2026."
  },
  {
    "title": "Siapkan dokumen dan kirim pengajuan",
    "actor": "Kampus",
    "summary": "Lengkapi kedua nomor PKS dan dokumen terbaru, lalu tekan Ajukan untuk diperiksa.",
    "detail": "Buka Dokumen untuk menyiapkan permohonan, invoice dan kuitansi. PKS disiapkan oleh PF; kampus dapat membaca PDF-nya. Kedua nomor PKS harus lengkap dan PDF PKS harus sesuai data terbaru sebelum pengajuan dikirim. Jika sumber PKS berubah, tunggu PF menyiapkan ulang PDF, lalu pilih Perbarui status dokumen. Draf tersimpan belum berarti terkirim: tekan Ajukan untuk diperiksa setelah seluruh syarat lengkap."
  },
  {
    "title": "Tunggu pemeriksaan PF → Legal",
    "actor": "PF \u2192 Legal",
    "summary": "Tunggu pemeriksaan PF dan persetujuan PKS oleh Legal. Tindak lanjuti jika diminta revisi.",
    "detail": "PF memeriksa pengajuan dan mengirim PKS ke Legal. Legal menyetujui PKS atau mengembalikannya kepada PF dengan catatan. Jika diminta revisi, perbaiki bagian yang dibuka PF lalu kirim perbaikan; PDF PKS yang berubah harus disiapkan ulang oleh PF dan diperiksa kembali. Dokumen masih berupa draf sampai pemeriksaan PF dan persetujuan Legal selesai."
  },
  {
    "title": "Tandatangani dan unggah pindaian",
    "actor": "Kampus \u2192 PF",
    "summary": "Unduh dokumen final, tandatangani, lalu unggah pindaian untuk diperiksa PF.",
    "detail": "Setelah seluruh pemeriksaan selesai dan PKS disetujui Legal, unduh dokumen final. Ikuti checklist tanda tangan, meterai dan dua rangkap PKS. Pilih Unggah bertanda tangan pada kartu dokumen di Dokumen, lalu Kirim pindaian. Gunakan PDF, PNG, JPG atau WebP yang jelas dan lengkap agar dapat digabungkan menjadi lampiran; DOCX adalah dokumen sumber, bukan pindaian. PF membandingkan pindaian dengan dokumen final sebelum menerimanya."
  },
  {
    "title": "Pantau lampiran dan pembayaran",
    "actor": "Admin PF",
    "summary": "PF menyimpan lampiran dan mencatat pembayaran. Kampus memantau hasilnya.",
    "detail": "PF menyusun dan menyimpan lampiran gabungan dari berkas yang sudah diperiksa, lalu mencatat pembayaran. Kampus tidak perlu menyusun atau mengunggah paket lampiran gabungan sendiri; saat ini tombol membuka paket tersebut belum tersedia di tampilan kampus. Setelah Dana dibayar, lihat tanggal, nominal, referensi dan bukti transfer jika PF melampirkannya. Pencatatan pembayaran di aplikasi tidak melakukan transfer bank."
  }
];
</script>

<svelte:head><title>Panduan Aplikasi · Desa Energi Berdikari</title></svelte:head>
<div
  class="[&&]:max-w-[1120px] [&&]:grid [&&]:gap-y-[30px] [&&]:gap-x-[30px] [&&]:mx-[auto] [&&]:my-[0px] max-[600.01px]:[&&]:gap-y-[24px] max-[600.01px]:[&&]:gap-x-[24px] app-guide"
>
  <section
    class="[&&]:relative [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[background-image:linear-gradient(120deg,_rgb(8,_120,_216),_rgb(32,_64,_181))] [&&]:[background-color:initial] [&&]:text-[white] [&&]:p-[36px] [&&]:rounded-[18px] [&::after]:absolute [&::after]:[content:''] [&::after]:w-[340px] [&::after]:h-[340px] [&::after]:right-[-135px] [&::after]:top-[-90px] [&::after]:[pointer-events:none] [&::after]:border-[65px] [&::after]:border-solid [&::after]:border-[color:rgba(255,_255,_255,_0.03)] [&::after]:rounded-[50%] max-[600.01px]:[&&]:p-[25px] guide-hero"
    aria-labelledby="guide-title"
  >
    <img
      class="[&&]:block [&&]:w-[180px] [&&]:h-[auto] [&&]:mb-[28px] max-[600.01px]:[&&]:w-[155px]"
      src="/logo-pf-white.png"
      alt="Pertamina Foundation"
      width="205"
      height="55"
    />
    <span
      class="[&&]:block [&&]:text-[12px] [&&]:font-[600] [&&]:tracking-[0.06em] [&&]:text-[#d2e9ff] guide-eyebrow"
      >PANDUAN AKUN KAMPUS</span
    >
    <h1
      class="[&&]:mt-[13px] [&&]:mb-[16px] font-[600] [&&]:text-[white] [&&]:text-[34px] [&&]:tracking-[-0.01em] [&&]:leading-[1.3] [&&]:mx-[0px] max-[600.01px]:[&&]:text-[27px]"
      id="guide-title"
    >
      Mulai dari sini.
    </h1>
    <p
      class="[&&]:mt-[0px] [&&]:mb-[24px] [&&]:leading-[1.6] [&&]:max-w-[620px] [&&]:text-[15px] [&&]:text-[#e0eeff] [&&]:mx-[0px] max-[600.01px]:[&&]:text-[14px]"
    >
      Gunakan Beranda untuk melihat langkah berikutnya, Profil & Monitoring Program untuk melengkapi data kampus, dan Pencairan Dana untuk memantau serta melengkapi dokumen.
    </p>
    <a
      class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#1256b6] [&&]:[text-decoration-line:none] [&&]:[text-decoration-thickness:initial] [&&]:[text-decoration-style:initial] [&&]:[text-decoration-color:initial] [&&]:inline-flex [&&]:items-center [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:text-[14px] [&&]:font-[700] [&&]:px-[18px] [&&]:py-[13px] [&&]:rounded-[9px] [&:focus-visible]:[outline-color:rgb(244,_190,_64)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[5px] guide-start"
      href="/campus/dashboard">Mulai dari Beranda <Icon name="arrow" size={18} /></a
    >
  </section>

  <section aria-labelledby="features-title">
    <div class="guide-heading">
      <h2
        class="[&&]:mt-[0px] [&&]:mb-[9px] font-[600] [&&]:text-[#173963] [&&]:text-[21px] tracking-[-0.01em] [&&]:mx-[0px] max-[600.01px]:[&&]:text-[19px]"
        id="features-title"
      >
        Halaman utama
      </h2>
      <p
        class="[&&]:mt-[0px] [&&]:mb-[20px] [&&]:leading-[1.6] [&&]:text-[14px] [&&]:text-[#475569] [&&]:mx-[0px]"
      >
        Panduan ini bisa dibuka kembali melalui menu akun di kanan atas.
      </p>
    </div>
    <div
      class="[&&]:grid [&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] [&&]:gap-y-[18px] [&&]:gap-x-[18px] max-[600.01px]:[&&]:grid-cols-[1fr] max-[600.01px]:[&&]:gap-y-[14px] max-[600.01px]:[&&]:gap-x-[14px] feature-grid"
    >
      {#each features as feature}
        <article
          class="[&&]:flex [&&]:flex-col [&&]:items-start [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:p-[24px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_231,_245)] [&&]:rounded-[13px] max-[600.01px]:[&&]:p-[22px] feature-card"
        >
          <span
            class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[46px] [&&]:h-[46px] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:text-[#176bd0] [&&]:mb-[18px] [&&]:rounded-[12px] feature-symbol"
            ><Icon name={feature.icon} size={24} /></span
          >
          <h3
            class="[&&]:mt-[0px] [&&]:mb-[10px] font-[600] [&&]:text-[#173963] [&&]:text-[17px] leading-[1.5] [&&]:mx-[0px]"
          >
            {feature.title}
          </h3>
          <p
            class="[&&]:mt-[0px] [&&]:mb-[22px] [&&]:leading-[1.6] [&&]:text-[14px] [&&]:text-[#475569] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:mx-[0px]"
          >
            {feature.description}
          </p>
          <a
            class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#1265c8] [&&]:[text-decoration-line:none] [&&]:[text-decoration-thickness:initial] [&&]:[text-decoration-style:initial] [&&]:[text-decoration-color:initial] [&&]:inline-flex [&&]:items-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:text-[14px] [&&]:font-[700] [&:focus-visible]:[outline-color:rgb(244,_190,_64)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[5px] [&:hover]:[text-decoration-line:underline] [&:hover]:[text-decoration-thickness:initial] [&:hover]:[text-decoration-style:initial] [&:hover]:[text-decoration-color:initial]"
            href={`/campus/${feature.href}`}>{feature.action}<Icon name="arrow" size={16} /></a
          >
        </article>
      {/each}
    </div>
  </section>

  <section class="rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="journey-guide-title">
    <h2 id="journey-guide-title" class="text-xl font-bold text-slate-900">Urutan pengajuan baru</h2>
    <p class="mt-2 text-sm leading-6 text-slate-600">Ikuti delapan tahap berikut. Buka rincian pada tahap yang sedang Anda kerjakan.</p>
    <ol class="mt-5 grid gap-3 sm:grid-cols-2">
      {#each submissionSteps as step, i}
        <li class="min-w-0 rounded-xl border border-slate-200 p-4 sm:p-5">
          <div class="flex items-start gap-3">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-[#0066B2]">{i + 1}</span>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-[#0066B2]">{step.actor}</p>
              <h3 class="mt-1 text-sm font-bold leading-6 text-slate-900">{step.title}</h3>
            </div>
          </div>
          <p class="mt-3 text-sm leading-6 text-slate-600">{step.summary}</p>
          <details class="mt-3 border-t border-slate-100 pt-3">
            <summary class="cursor-pointer text-sm font-semibold text-[#0066B2]">Rincian tahap {i + 1}</summary>
            <p class="mt-3 text-sm leading-6 text-slate-600">{step.detail}</p>
          </details>
        </li>
      {/each}
    </ol>
  </section>

  <aside
    class="[&&]:flex [&&]:items-start [&&]:gap-y-[17px] [&&]:gap-x-[17px] [&&]:[background-image:initial] [&&]:[background-color:rgb(234,_243,_255)] [&&]:p-[24px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(215,_230,_250)] [&&]:rounded-[13px] max-[600.01px]:[&&]:p-[20px] guide-tip"
  >
    <span class="[&&]:shrink-0 [&&]:text-[#176bd0] [&&]:mt-[2px] tip-icon"
      ><Icon name="leaf" size={25} /></span
    >
    <div>
      <h2
        class="[&&]:mt-[0px] [&&]:mb-[8px] font-[600] [&&]:text-[#173963] [&&]:text-[16px] tracking-[-0.01em] [&&]:mx-[0px]"
      >
        Kapan perlu mengirim dokumen?
      </h2>
      <p class="[&&]:leading-[1.6] [&&]:text-[14px] [&&]:text-[#587395] [&&]:m-[0px]">
        Ikuti bagian "Tahap saat ini" dan "Langkah selanjutnya" di Pencairan Dana. Pengajuan lama yang masih berjalan manual mengikuti petunjuk unggah pada tiap dokumen. Jika tombol belum aktif, lengkapi isian sesuai petunjuk di halaman. Jika proses gagal, baca snackbar, perbaiki isian atau koneksi, lalu coba kembali. Isian draf yang belum tersimpan jangan ditinggalkan.
      </p>
    </div>
  </aside>
  <section class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="report-guide-title">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-[#0066B2]">Setelah dana Tahap 1 diterima</p>
        <h2 id="report-guide-title" class="mt-2 text-xl font-bold text-slate-900">Siapkan laporan kampus</h2>
        <p class="mt-2 text-sm leading-6 text-slate-600">Lengkapi bukti penggunaan dana dan empat keluaran program.</p>
      </div>
      <a class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0066B2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#005493] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0066B2]" href="/campus/pelaporan">Buka Pelaporan <Icon name="arrow" size={16} /></a>
    </div>
    <div class="mt-5 rounded-xl bg-slate-50 p-4">
      <h3 class="text-sm font-bold text-slate-900">LPJ penggunaan dana</h3>
      <p class="mt-1 text-sm leading-6 text-slate-600">Catat satu bukti untuk setiap invois atau pindaian.</p>
    </div>
    <h3 class="mt-5 text-sm font-bold text-slate-900">Empat keluaran program</h3>
    <ul class="mt-3 grid gap-3 sm:grid-cols-2">
      {#each [
        ['Laporan pelaksanaan', 'Laporan kegiatan program'],
        ['Infografis', 'Berkas PDF'],
        ['Video profil', 'MP4 · maksimal 2 menit'],
        ['Artikel', 'Teks web, Word atau PDF']
      ] as [title, description], i}
        <li class="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#0066B2]">{i + 1}</span>
          <div><p class="text-sm font-semibold text-slate-900">{title}</p><p class="mt-1 text-sm text-slate-600">{description}</p></div>
        </li>
      {/each}
    </ul>
    <details class="mt-5 border-t border-slate-200 pt-4">
      <summary class="cursor-pointer text-sm font-semibold text-[#0066B2]">Cara mengirim dan kapan laporan selesai</summary>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
        <li>Simpan draf, lalu kirim setiap keluaran untuk diperiksa admin.</li>
        <li>Jika diminta revisi, perbaiki dan kirim versi baru. Riwayat tetap tersedia.</li>
        <li>LPJ selesai setelah semua bukti Sesuai dan admin memilih Selesaikan LPJ.</li>
        <li>Pelaporan tahunan lengkap setelah keempat keluaran berstatus Sesuai.</li>
      </ul>
    </details>
  </section>
</div>
