<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { app } from '$lib/state.svelte';
  import { average, campusStats, date, percent, progress } from '$lib/domain';
  import Stat from '$lib/components/ui/Stat.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import CampusTable from '$lib/components/admin/campuses/CampusTable.svelte';
  const isAdmin = $derived(app.session?.role === 'admin');
  const all = $derived(
    (app.data?.campuses || []).map((c) => ({ ...c, ...campusStats(app.data!, c.id) }))
  );
  const own = $derived(campusStats(app.data!, app.session?.campusId || ''));
  const ownCampus = $derived(app.data?.campuses.find((campus) => campus.id === app.session?.campusId));
  const overall = $derived(average(all.map((c) => c.progress)));
  const submitted = $derived(all.filter((c) => c.proposal).length);
  const needsAction = $derived(all.filter((c) => c.revisions).length);
  const prefix = $derived(`/${app.session?.role}`);
  const activity = $derived(
    [...(app.data?.activities || [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
  );
  const popular = $derived(
    [...(app.data?.questions || [])]
      .sort(
        (a, b) =>
          (app.data?.likes.filter((l) => l.questionId === b.id).length || 0) -
          (app.data?.likes.filter((l) => l.questionId === a.id).length || 0)
      )
      .slice(0, 3)
  );
</script>
<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >{isAdmin ? 'MONITORING KAMPUS MITRA' : 'RUANG KERJA KAMPUS'}</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      {isAdmin ? 'Setiap langkah, berarti.' : `Selamat datang, ${app.session?.name}.`}
    </h1>
    <p class="leading-[1.8] m-[0px]">
      {isAdmin
        ? 'Lihat perkembangan bersama dan temukan ruang untuk bertumbuh.'
        : 'Mari lanjutkan langkah untuk mewujudkan DEB Putih yang berdampak.'}
    </p>
  </div>
  <span
    class="flex items-center gap-y-[7px] gap-x-[7px] text-[10px] text-[#5174a0] [background-image:initial] [background-color:rgb(255,_255,_255)] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[12px] py-[9px] border-[1px] border-solid border-[color:rgb(207,_224,_243)] rounded-[7px] period"
    ><Icon name="clock" size={16} />Pembacaan lokal</span
  >
</div>
<section
  class="[background-image:linear-gradient(125deg,_rgb(12,_73,_197)_0%,_rgb(23,_105,_231)_52%,_rgb(21,_148,_234)_100%)] [background-color:initial] flex relative overflow-x-hidden overflow-y-hidden min-h-[234px] mb-[23px] [box-shadow:0_20px_45px_#0c54c226] rounded-[13px] min-[1500px]:min-h-[260px] max-[700.01px]:min-h-[238px] hero-banner"
>
  <div
    class="relative z-[2] w-[62%] px-[35px] py-[30px] [&_h2]:text-[#fff] [&_h2]:[white-space-collapse:preserve-breaks] [&_h2]:[text-wrap-mode:wrap] [&_h2]:text-[28px] [&_h2]:leading-[1.22] [&_h2]:tracking-[-0.8px] [&_h2]:font-[600] [&_p]:text-[#cde4ff] [&_p]:text-[12px] [&_p]:leading-[1.9] [&_p]:max-w-[380px] [&_p]:mt-[12px] [&_p]:mb-[18px] [&_p]:mx-[0px] [&_.button]:min-h-[35px] [&_.button]:text-[10px] [&_.button]:px-[13px] [&_.button]:py-[8px] min-[1500px]:px-[40px] min-[1500px]:py-[35px] min-[1500px]:[&_h2]:text-[34px] max-[1200.01px]:w-[65%] max-[1200.01px]:p-[26px] max-[1200.01px]:[&_p]:max-w-[320px] max-[900.01px]:w-[83%] max-[700.01px]:w-[90%] max-[700.01px]:p-[25px] max-[700.01px]:[&_h2]:text-[27px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_p]:max-w-[270px] hero-copy"
  >
    <span
      class="flex items-center gap-y-[7px] gap-x-[7px] text-[#cde4ff] text-[8px] tracking-[1.6px] font-[700] mb-[15px] [&>span]:w-[5px] [&>span]:h-[5px] [&>span]:[background-image:initial] [&>span]:[background-color:rgb(142,_215,_255)] [&>span]:rounded-[50%] hero-label"
      ><span></span>PROGRAM DEB PUTIH</span
    >
    <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
      {isAdmin ? 'Kolaborasi terhubung.\nDampak terukur.' : 'Perubahan dimulai\ndari langkah Anda.'}
    </h2>
    <p class="leading-[1.8] m-[0px]">
      {isAdmin
        ? `Satu pandangan untuk perjalanan ${app.data!.campuses.length} kampus. Pantau capaian dan perkembangan bersama.`
        : 'Tinjau capaian, dokumen, dan pembelajaran bersama kampus lain menggunakan data simulasi.'}
    </p>
    <a
      class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#0b4c9a] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(220,_236,_255)] text-[12px] font-[650] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(190,_220,_255)] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(205,_229,_255)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button mint"
      href={isAdmin ? '/admin/campuses' : '/campus/indicators'}
      >{isAdmin ? 'Jelajahi kampus mitra' : 'Lihat indikator'}<Icon name="arrow" size={17} /></a
    >
  </div>
  <div
    class="absolute right-[25px] top-[0] w-[350px] h-[100%] grid items-center [justify-items:center] min-[1500px]:right-[85px] max-[1200.01px]:right-[0] max-[1200.01px]:w-[300px] max-[900.01px]:right-[-70px] max-[900.01px]:opacity-[0.45] max-[700.01px]:right-[-135px] max-[700.01px]:opacity-[0.32] hero-visual"
    aria-hidden="true"
  >
    <div
      class="absolute w-[310px] h-[310px] border-[1px] border-solid border-[color:rgba(255,_255,_255,_0.14)] rounded-[50%] orbit one"
    ></div>
    <div
      class="absolute [&&]:w-[238px] [&&]:h-[238px] [&&]:[background-image:initial] [&&]:[background-color:rgba(255,_255,_255,_0.03)] border-[1px] border-solid border-[color:rgba(255,_255,_255,_0.14)] rounded-[50%] orbit two"
    ></div>
    <div
      class="absolute [&&]:w-[165px] [&&]:h-[165px] [&&]:[background-image:initial] [&&]:[background-color:rgba(255,_255,_255,_0.03)] border-[1px] border-solid border-[color:rgba(255,_255,_255,_0.14)] rounded-[50%] orbit three"
    ></div>
    <div
      class="w-[112px] h-[112px] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#1265d8] grid items-center [justify-items:center] [transform:rotate(-13deg)] [box-shadow:0_0_70px_#7fc8ff44] rounded-[50%] hero-seed"
    >
      <Icon name="leaf" size={70} />
    </div>
    <span
      class="absolute flex items-center gap-y-[8px] gap-x-[8px] [background-image:initial] [background-color:rgba(255,_255,_255,_0.93)] text-[#285786] text-[9px] [box-shadow:0_5px_20px_#0001] [&&]:top-[54px] [&&]:right-[5px] [&&]:[transform:rotate(5deg)] px-[12px] py-[10px] border-[1px] border-solid border-[color:rgb(207,_229,_255)] rounded-[7px] max-[700.01px]:hidden floating-card top"
      ><Icon name="campus" size={18} />{app.data!.campuses.length} kampus, satu visi</span
    ><span
      class="absolute flex items-center gap-y-[8px] gap-x-[8px] [background-image:initial] [background-color:rgba(255,_255,_255,_0.93)] text-[#285786] text-[9px] [box-shadow:0_5px_20px_#0001] [&&]:bottom-[47px] [&&]:left-[15px] [&&]:[transform:rotate(-5deg)] px-[12px] py-[10px] border-[1px] border-solid border-[color:rgb(207,_229,_255)] rounded-[7px] max-[700.01px]:hidden floating-card bottom"
      ><span
        class="[background-image:initial] [background-color:rgb(220,_238,_255)] flex text-[#176dcc] p-[3px] rounded-[50%] mini-check"
        ><Icon name="check" size={14} /></span
      >Tumbuh berkelanjutan</span
    >
  </div>
</section>
<div
  class="grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-y-[16px] gap-x-[16px] mb-[24px] max-[1200.01px]:gap-y-[12px] max-[1200.01px]:gap-x-[12px] max-[900.01px]:grid-cols-[repeat(2,_1fr)] max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:mb-[20px] stats-grid"
>
  {#if isAdmin}<Stat
      label="Kampus mitra"
      value={String(all.length)}
      note="Terhubung dalam program DEB"
      icon="campus"
    /><Stat
      label="Rata-rata progres"
      value={percent(overall)}
      note="Rata-rata capaian seluruh kampus"
      icon="target"
    /><Stat
      label="Proposal diajukan"
      value={`${submitted} / ${all.length}`}
      note="Kampus telah mengunggah proposal"
      icon="proposal"
    /><Stat
      label="Perlu tindak lanjut"
      value={String(needsAction)}
      note="Kampus dengan feedback revisi aktif"
      icon="alert"
      tone="amber"
    />{:else}<Stat
      label="Progres DEB Putih"
      value={percent(own.progress)}
      note="Rata-rata capaian {app.data!.definitions.length} indikator"
      icon="target"
    /><Stat
      label="Indikator tercapai"
      value={`${own.achieved} / ${own.total}`}
      note="Indikator sudah memenuhi target"
      icon="check"
    /><Stat
      label="Proposal terbaru"
      value={own.proposal ? `Versi ${own.proposal.version}` : 'Belum ada'}
      note={own.proposal
        ? 'Diajukan · ' + date(own.proposal.createdAt)
        : 'Unggah proposal pertama Anda'}
      icon="proposal"
    /><Stat
      label="Perlu tindak lanjut"
      value={String(own.revisions)}
      note="Indikator dengan feedback revisi aktif"
      icon="alert"
      tone="amber"
    />{/if}
</div>
{#if !isAdmin && ownCampus?.program}
  <section class="[background-color:white] min-w-[0] mb-[24px] p-[24px] border border-[#dce7f7] rounded-[11px] [box-shadow:0_10px_30px_#1a4d8f08]">
    <span class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px]">RENCANA AKSI DEB</span>
    <h2 class="font-[650] text-[18px] tracking-[-0.45px] text-[color:var(--navy)] m-[0px]">{ownCampus.name}</h2>
    <p class="text-[12px] text-[#617a9a] leading-[1.8] mt-[12px] m-[0px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] overflow-hidden">{ownCampus.program.description || 'Deskripsi program belum tersedia pada rencana aksi.'}</p>
  </section>
{/if}
<div
  class="grid grid-cols-[minmax(0,_2.6fr)_minmax(240px,_1fr)] gap-y-[22px] gap-x-[22px] mb-[24px] max-[1200.01px]:grid-cols-[1fr] max-[700.01px]:gap-y-[18px] max-[700.01px]:gap-x-[18px] max-[700.01px]:mb-[20px] dashboard-columns"
>
  <section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
  >
    <div
      class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
    >
      <div>
        <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
          {isAdmin ? 'Perjalanan kampus mitra' : 'Capaian per bidang'}
        </h2>
        <p class="leading-[1.8] m-[0px]">
          {isAdmin
            ? 'Perkembangan terbaru dari kampus yang terhubung.'
            : 'Setiap bidang berkontribusi pada progres bersama.'}
        </p>
      </div>
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] text-[12px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
        href={isAdmin ? '/admin/campuses' : '/campus/indicators'}
        >Lihat semua<Icon name="arrow" size={16} /></a
      >
    </div>
    {#if isAdmin}<CampusTable compact />{:else}<div
        class="pt-[6px] pb-[24px] px-[25px] category-progress"
      >
        {#each [...new Set(app.data!.definitions.map((d) => d.category))] as category, index}{@const definitions =
            app
              .data!.definitions.filter((d) => d.category === category)
              .map((d) => d.id)}{@const indicators = app.data!.indicators.filter((i) =>
            definitions.includes(i.definitionId)
          )}{@const p = average(indicators.map(progress))}
          <div
            class="flex items-center gap-y-[15px] gap-x-[15px] mt-[20px] mb-[26px] mx-[0px] [&>div]:grow [&>div]:shrink [&>div]:[flex-basis:0%] [&_.row-between]:text-[12px] [&_.row-between]:mb-[12px] [&_small]:text-[10px] [&_small]:block [&_small]:mt-[7px] category-row"
          >
            <span
              class={[
                `category-icon category-${index % 3}`,
                '[&.category-progress]:pt-[6px] [&.category-progress]:pb-[24px] [&.category-progress]:px-[25px] [&.category-row]:grid [&.category-row]:items-center [&.category-row]:gap-y-[15px] [&.category-row]:gap-x-[15px] [&.category-row]:mt-[20px] [&.category-row]:mb-[26px] [&.category-row]:mx-[0px] [&.category-row>div]:grow [&.category-row>div]:shrink [&.category-row>div]:[flex-basis:0%] [&.category-row_.row-between]:text-[12px] [&.category-row_.row-between]:mb-[12px] [&.category-row_small]:text-[10px] [&.category-row_small]:block [&.category-row_small]:mt-[7px] grid items-center [justify-items:center] w-[44px] h-[44px] [background-image:initial] [background-color:rgb(232,_243,_255)] text-[#1977cf] rounded-[10px] [&.category-1]:[background-image:initial] [&.category-1]:[background-color:rgb(228,_243,_255)] [&.category-1]:text-[#1378c7] [&.category-2]:[background-image:initial] [&.category-2]:[background-color:rgb(238,_240,_255)] [&.category-2]:text-[#4b62c4]'
              ]}><Icon name={['indicators', 'leaf', 'campus'][index % 3]} /></span
            >
            <div>
              <div class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between">
                <strong class="font-[650]">{category}</strong><strong class="font-[650]"
                  >{percent(p)}</strong
                >
              </div>
              <Progress value={p} label={category} /><small
                class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                >{indicators.filter((i) => i.target > 0 && i.current >= i.target).length} dari {indicators.length} indikator
                tercapai</small
              >
            </div>
          </div>{/each}
        <div
          class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
        >
          <Icon name="faq" size={17} /><span
            >Progres simulasi adalah rata-rata nilai aktual ÷ target, maksimal 100% untuk setiap
            indikator.</span
          >
        </div>
      </div>{/if}
  </section>
  <section
    class="[background-image:linear-gradient(145deg,_rgb(237,_246,_255),_rgb(248,_251,_255))] [background-color:initial] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] p-[26px] border-[1px] border-solid border-[color:rgb(211,_230,_251)] rounded-[11px] [&_h2]:[white-space-collapse:preserve-breaks] [&_h2]:[text-wrap-mode:wrap] [&_h2]:text-[22px] [&_h2]:leading-[1.4] [&_h2]:text-[#155fc1] [&_p]:text-[11px] [&_p]:text-[#6781a4] [&_p]:mt-[13px] [&_p]:mb-[21px] [&_p]:mx-[0px] [&_.button]:text-[10px] [&_.button]:min-h-[35px] [&_.button]:[background-image:initial] [&_.button]:[background-color:rgba(255,_255,_255,_0.596)] [&_.button]:border-[color:rgb(219,_228,_206)] max-[1200.01px]:hidden [&:hover]:border-[color:rgb(210,_226,_245)] panel next-step"
  >
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >LANGKAH BERIKUTNYA</span
    >
    <div class="text-[#155fc1] mt-[21px] mb-[14px] mx-[0px] next-icon">
      <Icon name="leaf" size={30} />
    </div>
    <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
      {isAdmin ? 'Arahan kecil,\nkemajuan berarti.' : 'Lengkapi cerita\nperkembangan Anda.'}
    </h2>
    <p class="leading-[1.8] m-[0px]">
      {isAdmin
        ? 'Tinjau indikator yang memerlukan perhatian dan bantu kampus mengambil langkah selanjutnya.'
        : 'Tanggapi masukan Admin dan pastikan capaian terbaru sudah tercatat.'}
    </p>
    <a
      class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#075fc7] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] text-[12px] font-[650] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
      href={isAdmin ? '/admin/verifikasi' : '/campus/indicators'}
      >{isAdmin ? 'Review pengajuan kampus' : 'Lihat feedback'}<Icon name="arrow" size={16} /></a
    >
  </section>
</div>
<div
  class="grid [&&]:grid-cols-[1fr_1fr] gap-y-[22px] gap-x-[22px] mb-[24px] max-[1200.01px]:[&&]:grid-cols-[1fr_1fr] max-[900.01px]:[&&]:grid-cols-[1fr] max-[700.01px]:gap-y-[18px] max-[700.01px]:gap-x-[18px] max-[700.01px]:mb-[20px] dashboard-columns equal"
>
  <section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
  >
    <div
      class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
    >
      <div>
        <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
          Aktivitas terbaru
        </h2>
        <p class="leading-[1.8] m-[0px]">Jejak langkah dalam ruang kerja.</p>
      </div>
      <Icon name="clock" size={19} />
    </div>
    <div class="pt-[0px] pb-[18px] px-[24px] max-[700.01px]:px-[18px] activity-list">
      {#each activity as a}<div
          class="relative flex gap-y-[16px] gap-x-[16px] px-[0px] py-[11px] [&:not(:last-child):before]:absolute [&:not(:last-child):before]:[content:''] [&:not(:last-child):before]:left-[5px] [&:not(:last-child):before]:top-[22px] [&:not(:last-child):before]:bottom-[-10px] [&:not(:last-child):before]:w-[1px] [&:not(:last-child):before]:[background-image:initial] [&:not(:last-child):before]:[background-color:rgb(220,_233,_248)] [&_p]:text-[12px] [&_p]:text-[#49688f] [&_small]:text-[10px] [&_small]:text-[#798b6b] max-[700.01px]:[&_p]:text-[11px] activity"
        >
          <span
            class="w-[11px] h-[11px] [background-image:initial] [background-color:rgb(37,_135,_218)] mt-[6px] shrink-0 relative border-[3px] border-solid border-[color:rgb(229,_242,_255)] rounded-[50%] activity-dot"
          ></span>
          <div>
            <p class="leading-[1.8] m-[0px]">{a.text}</p>
            <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
              >{isAdmin
                ? `${app.data!.campuses.find((c) => c.id === a.campusId)?.name} · `
                : ''}{date(a.createdAt)}</small
            >
          </div>
        </div>{:else}<Empty
          title="Belum ada aktivitas"
          description="Aktivitas kampus akan tampil setelah ada perubahan."
        />{/each}
    </div>
  </section>
  <section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
  >
    <div
      class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
    >
      <div>
        <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
          Belajar dari pertanyaan bersama
        </h2>
        <p class="leading-[1.8] m-[0px]">Percakapan yang membantu kampus bertumbuh.</p>
      </div>
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] text-[12px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
        href={`${prefix}/questions`}>Buka forum<Icon name="arrow" size={16} /></a
      >
    </div>
    <div
      class="pt-[0px] pb-[14px] px-[24px] [&>a]:flex [&>a]:gap-y-[13px] [&>a]:gap-x-[13px] [&>a]:items-center [&>a]:[border-top-width:1px] [&>a]:[border-top-style:solid] [&>a]:[border-top-color:rgb(240,_242,_236)] [&>a]:px-[0px] [&>a]:py-[14px] [&>a>span:nth-child(2)]:grow [&>a>span:nth-child(2)]:shrink [&>a>span:nth-child(2)]:[flex-basis:0%] [&_strong]:text-[12px] [&_strong]:leading-[1.6] [&_strong]:block [&_small]:block [&_small]:text-[10px] [&_small]:mt-[5px] [&_small]:text-[#798b6b] [&>a>svg]:text-[#9aab89] max-[700.01px]:px-[18px] max-[700.01px]:[&_strong]:text-[11px] popular-list"
    >
      {#each popular as q}<a
          class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          href={`${prefix}/questions/${q.id}`}
          ><span
            class="flex flex-col items-center gap-y-[4px] gap-x-[4px] text-[11px] text-[#4777ad] px-[9px] py-[7px] border-[1px] border-solid border-[color:rgb(220,_232,_246)] rounded-[7px] popular-like"
            ><Icon name="like" size={15} />{app.data!.likes.filter((l) => l.questionId === q.id)
              .length}</span
          ><span
            ><strong class="font-[650]">{q.title}</strong><small
              class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
              >{app.data!.campuses.find((c) => c.id === q.campusId)?.name}</small
            ></span
          ><Icon name="chevron" size={16} /></a
        >{:else}<Empty
          title="Belum ada pertanyaan"
          description="Pertanyaan bersama akan tampil di sini."
        />{/each}
    </div>
  </section>
</div>
