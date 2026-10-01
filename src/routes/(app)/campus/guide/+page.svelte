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
      icon: 'payments',
      title: 'Pencairan Dana',
      description:
        'Pantau status tiap dokumen, baca catatan pemeriksa, dan lihat berkas yang pernah dikirim. Unggah hanya jika dokumen belum ada atau perlu revisi.',
      href: 'pencairan',
      action: 'Lihat pencairan'
    },
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
      Gunakan Beranda untuk melihat langkah berikutnya, lalu buka Pencairan Dana untuk memantau dan melengkapi dokumen kampus Anda.
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
        Dua halaman utama
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
        Di Pencairan Dana, pilih dokumen yang belum ada atau perlu revisi. Baca catatan pemeriksa, pilih berkas, lalu kirim. Setelah itu, tunggu pemeriksaan PF; dokumen yang sedang diperiksa atau sudah sesuai tidak perlu dikirim ulang. SK dan RAB hanya dapat dilihat oleh kampus.
      </p>
    </div>
  </aside>
</div>
