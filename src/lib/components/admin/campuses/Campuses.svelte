<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { app } from '$lib/state.svelte';
  import { campusStats, percent, date, feedbackLabel } from '$lib/domain';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Stat from '$lib/components/ui/Stat.svelte';
  import CampusTable from './CampusTable.svelte';
  import CampusMaster from './CampusMaster.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Indicators from '$lib/components/shared/indicators/Indicators.svelte';
  import Proposals from '$lib/components/shared/proposals/Proposals.svelte';
  let { id = '' }: { id?: string } = $props();
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  const tab = $derived(page.url.searchParams.get('tab') || 'Ringkasan');
  function selectTab(value: string) {
    const url = new URL(page.url);
    url.searchParams.set('tab', value);
    void goto(url.pathname + url.search);
  }
  const campus = $derived(app.data!.campuses.find((c) => c.id === id));
  const stats = $derived(campusStats(app.data!, id));
  const feedback = $derived(app.data!.feedback.filter((f) => f.campusId === id));
  const rupiah = (value: number | string | null | undefined) =>
    typeof value === 'number'
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
      : value || 'Belum tersedia';
</script>
{#if !id}<div
    class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >JEJARING KOLABORASI</span
      >
      <h1
        class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
      >
        Kampus mitra
      </h1>
      <p class="leading-[1.8] m-[0px]">
        {app.data!.campuses.length} kampus, beragam perjalanan, satu komitmen untuk dampak berkelanjutan.
      </p>
    </div>
    <Badge tone="green">{app.data!.campuses.length} kampus · Capaian simulasi</Badge>
  </div>
  <div class="flex justify-end mt-[0px] mb-[16px] mx-[0px] master-toolbar"><CampusMaster /></div>
  <section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
  >
    <CampusTable />
  </section>{:else}<a
    class="[-webkit-tap-highlight-color:transparent] text-[#2875bd]! [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-block text-[11px] mb-[22px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] back-link"
    href="/admin/campuses">← Kembali ke kampus mitra</a
  >{#if !campus}<section
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
    >
      <Empty
        title="Kampus tidak ditemukan"
        description="Periksa kembali alamat kampus yang Anda buka."
        icon="campus"
      />
    </section>{:else}<div
      class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
    >
      <div
        class="flex items-center gap-y-[20px] gap-x-[20px] max-[700.01px]:gap-y-[12px] max-[700.01px]:gap-x-[12px] max-[700.01px]:[&_h1]:text-[21px] campus-detail-title"
      >
        <span
          class={[
            'w-[64px] h-[64px] [background-image:initial] [background-color:rgb(233,_243,_255)] grid items-center [justify-items:center] text-[#176ac3] text-[20px] font-[700] border-[1px] border-solid border-[color:rgb(211,_230,_251)] rounded-[14px] max-[700.01px]:w-[50px] max-[700.01px]:h-[50px] max-[700.01px]:text-[15px] max-[700.01px]:shrink-0 large-avatar',
            campus.initials.length > 4 ? 'text-[13px]!' : undefined
          ]}>{campus.initials}</span
        >
        <div>
          <span
            class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
            >KAMPUS MITRA · {campus.region.toUpperCase()}</span
          >
          <h1
            class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
          >
            {campus.name}
          </h1>
          <p class="leading-[1.8] m-[0px]">Perkembangan dan dokumentasi program DEB Putih.</p>
        </div>
      </div>
      <Badge tone={stats.revisions ? 'amber' : 'green'}
        >{stats.revisions ? 'Perlu tindak lanjut' : 'Dalam pendampingan'}</Badge
      >
    </div>
    <div class="flex justify-end mt-[0px] mb-[16px] mx-[0px] master-toolbar">
      <CampusMaster {campus} />
    </div>
    <div
      class="flex gap-y-[30px] gap-x-[30px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--line)] overflow-x-auto mb-[24px] p-[0px] [&_button]:[background-image:none] [&_button]:[background-color:initial] [&_button]:[border-top-width:0px] [&_button]:[border-right-width:0px] [&_button]:[border-bottom-width:2px] [&_button]:[border-left-width:0px] [&_button]:[border-top-style:none] [&_button]:[border-right-style:none] [&_button]:[border-bottom-style:solid] [&_button]:[border-left-style:none] [&_button]:[border-top-color:currentcolor] [&_button]:[border-right-color:currentcolor] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-color:currentcolor] [&_button]:pt-[16px] [&_button]:pb-[13px] [&_button]:[white-space-collapse:collapse] [&_button]:[text-wrap-mode:nowrap] [&_button]:text-[11px] [&_button]:text-[#96a087] [&_button]:flex [&_button]:gap-y-[8px] [&_button]:gap-x-[8px] [&_button]:items-center [&_button]:px-[0px] [&_button.active]:text-[#075fc7] [&_button.active]:[border-bottom-color:#1681df] [&_button.active]:font-[700] max-[700.01px]:gap-y-[24px] max-[700.01px]:gap-x-[24px] max-[700.01px]:p-[0px] max-[700.01px]:[&_button]:text-[10px] tabs page-tabs"
    >
      {#each ['Ringkasan', 'Indikator', 'Proposal', 'Feedback'] as t}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          class:active={tab === t}
          onclick={() => selectTab(t)}
          >{t}{#if t === 'Feedback'}<span
              class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
              >{feedback.length}</span
            >{/if}</button
        >{/each}
    </div>
    {#if tab === 'Ringkasan'}<div
        class="grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-y-[16px] gap-x-[16px] mb-[24px] max-[1200.01px]:gap-y-[12px] max-[1200.01px]:gap-x-[12px] max-[900.01px]:grid-cols-[repeat(2,_1fr)] max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:mb-[20px] stats-grid"
      >
        <Stat
          label="Progres DEB"
          value={percent(stats.progress)}
          note="Rata-rata seluruh indikator"
          icon="target"
        /><Stat
          label="Indikator tercapai"
          value={`${stats.achieved} / ${stats.total}`}
          note="Sudah memenuhi target"
          icon="check"
        /><Stat
          label="Proposal"
          value={stats.proposal ? `Versi ${stats.proposal.version}` : 'Belum ada'}
          note={stats.proposal ? 'Diajukan' : 'Belum diunggah'}
          icon="proposal"
        /><Stat
          label="Perlu tindak lanjut"
          value={String(stats.revisions)}
          note="Indikator dengan revisi aktif"
          icon="alert"
          tone="amber"
        />
      </div>
      <section class="[background-image:initial] [background-color:white] min-w-[0] mb-[24px] p-[28px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] panel">
        <div class="flex items-start justify-between gap-[16px] mb-[18px] max-[700.01px]:flex-col">
          <div>
            <span class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] eyebrow">RENCANA AKSI DEB</span>
            <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">Program {campus.acronym || campus.name}</h2>
          </div>
          {#if campus.program?.currentClass}<Badge tone="blue">{campus.program.currentClass.split(' ')[0]}</Badge>{/if}
        </div>
        <p class="text-[12px] text-[#617a9a] leading-[1.8] whitespace-pre-line m-[0px]">{campus.program?.description || 'Deskripsi program belum tersedia pada rencana aksi.'}</p>
        <div class="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-[12px] mt-[20px] max-[900.01px]:grid-cols-[repeat(2,_1fr)] max-[700.01px]:grid-cols-[1fr]">
          <div class="p-[14px] [background-color:rgb(247,_251,_255)] border border-[#dce9f7] rounded-[9px]"><small class="block text-[10px] text-[#637796]">Pendapatan total</small><strong class="block text-[12px] text-[color:var(--navy)] mt-[5px]">{rupiah(campus.program?.income)}</strong></div>
          <div class="p-[14px] [background-color:rgb(247,_251,_255)] border border-[#dce9f7] rounded-[9px]"><small class="block text-[10px] text-[#637796]">Penerima manfaat</small><strong class="block text-[12px] text-[color:var(--navy)] mt-[5px]">{campus.program?.beneficiaries || 'Belum tersedia'}</strong></div>
          <div class="p-[14px] [background-color:rgb(247,_251,_255)] border border-[#dce9f7] rounded-[9px]"><small class="block text-[10px] text-[#637796]">Estimasi RAB</small><strong class="block text-[12px] text-[color:var(--navy)] mt-[5px]">{rupiah(campus.program?.budget)}</strong></div>
        </div>
        <section class="mt-[18px]" aria-label="Indikator kesiapan rencana aksi"><h3 class="text-[12px] font-[650] text-[color:var(--navy)] m-[0px] mb-[10px]">Indikator kesiapan rencana aksi</h3><div class="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[10px] max-[700.01px]:grid-cols-[1fr]">{#each [['EBT eksisting', campus.program?.existingEbt], ['Pemetaan sosial', campus.program?.socialMapping], ['Potensi konflik', campus.program?.conflict], ['IKM DEB SoBI', campus.program?.ikm], ['Kelembagaan', campus.program?.institution], ['Perizinan lahan', campus.program?.landPermit], ['Site survey', campus.program?.siteSurvey], ['Kebutuhan intervensi', campus.program?.intervention]] as [label, value]}<div class="p-[12px] [background-color:rgb(247,_251,_255)] border border-[#dce9f7] rounded-[8px]"><strong class="block text-[10px] text-[color:var(--navy)]">{label}</strong><p class="text-[11px] text-[#617a9a] leading-[1.7] whitespace-pre-line mt-[6px] mb-[0px]">{value || 'Belum diisi'}</p></div>{/each}</div></section>
      </section>
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] p-[28px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_p]:text-[12px] [&_p]:text-[#617a9a]! [&_p]:mt-[12px] [&_p]:mb-[24px] [&_p]:mx-[0px] [&:hover]:border-[color:rgb(210,_226,_245)] panel detail-overview"
      >
        <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
          Pendampingan yang terarah
        </h2>
        <p class="leading-[1.8] m-[0px]">
          Lihat capaian indikator, telusuri proposal, dan berikan feedback sesuai perkembangan
          kampus.
        </p>
        <div class="flex items-center gap-y-[10px] gap-x-[10px] flex-wrap button-row">
          <button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
            onclick={() => selectTab('Indikator')}
            >Tinjau indikator<Icon name="arrow" size={17} /></button
          ><button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
            onclick={() => selectTab('Proposal')}>Lihat proposal</button
          >
        </div>
      </section>{:else if tab === 'Indikator'}<Indicators
        campusId={id}
        embedded
      />{:else if tab === 'Proposal'}<Proposals campusId={id} embedded />{:else}<section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
      >
        <div
          class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
        >
          <div>
            <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
              Riwayat feedback kampus
            </h2>
            <p class="leading-[1.8] m-[0px]">
              Feedback selalu terhubung dengan indikator yang ditinjau.
            </p>
          </div>
        </div>
        {#if feedback.length}<div
            class="grid gap-y-[14px] gap-x-[14px] mt-[18px] pt-[0px] pb-[24px] px-[24px] feedback-list padded"
          >
            {#each feedback as f}{@const indicator = app.data!.indicators.find(
                (i) => i.id === f.indicatorId
              )}
              <article
                class="[background-image:initial] [background-color:rgb(247,_251,_255)] p-[16px] border-[1px] border-solid border-[color:rgb(220,_233,_247)] rounded-[9px] [&_.row-between>strong]:text-[12px] [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:mx-[0px] [&_p]:my-[12px] [&_small]:text-[10px] max-[700.01px]:[&_p]:text-[11px] feedback-card"
              >
                <div
                  class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between"
                >
                  <strong class="font-[650]"
                    >{app.data!.definitions.find((d) => d.id === indicator?.definitionId)
                      ?.name}</strong
                  ><Badge
                    tone={f.state === 'closed'
                      ? 'green'
                      : f.state === 'responded'
                        ? 'blue'
                        : 'amber'}>{f.requiresRevision ? feedbackLabel[f.state] : 'Catatan'}</Badge
                  >
                </div>
                <p class="leading-[1.8] m-[0px]">{f.text}</p>
                <div
                  class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between"
                >
                  <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                    >{date(f.createdAt)} · Admin PF</small
                  ><button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                    onclick={() => selectTab('Indikator')}
                    >Tinjau indikator<Icon name="arrow" size={15} /></button
                  >
                </div>
              </article>{/each}
          </div>{:else}<Empty
            title="Belum ada feedback"
            description="Buka tab Indikator untuk memberikan catatan kepada kampus."
            icon="questions"
          />{/if}
      </section>{/if}{/if}{/if}
