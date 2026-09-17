<script lang="ts">
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date, number, progress } from '$lib/domain';
  import { verificationLabel } from '$lib/verification';
  import type { VerificationStatus } from '$lib/types';
  import Indicators from '$lib/components/shared/indicators/Indicators.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  let search = $state('');
  let status = $state<VerificationStatus>('pending');
  let selectedId = $state('');
  let note = $state('');
  let decision = $state<'approved' | 'revision' | null>(null);
  let openedLink = $state('');
  let decisionSubmissionId: string | undefined;
  const submissions = $derived(app.data!.submissions ?? []);
  const campus = (id: string) => app.data!.campuses.find((c) => c.id === id)!;
  const definition = (id: string) => app.data!.definitions.find((d) => d.id === id)!;
  const rows = $derived(
    submissions
      .filter(
        (s) =>
          s.status === status &&
          `${campus(s.campusId).name} ${campus(s.campusId).acronym ?? ''} ${campus(s.campusId).city ?? ''} ${campus(s.campusId).region}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
      .sort((a, b) =>
        status === 'pending'
          ? a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id)
          : (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? '')
      )
  );
  const selected = $derived(rows.find((s) => s.id === selectedId) ?? rows[0]);
  const activeSubmissionId = $derived(selected?.id);
  const gaps = $derived(
    selected?.indicators
      .filter((i) => i.target > 0 && i.current < i.target)
      .sort((a, b) => progress(a) - progress(b)) ?? []
  );
  const comments = $derived(
    selected ? app.data!.feedback.filter((f) => f.campusId === selected.campusId) : []
  );
  const unresolved = $derived(comments.filter((f) => f.requiresRevision && f.state !== 'closed'));
  const readiness = $derived(
    selected
      ? [
          ['EBT eksisting', campus(selected.campusId).program?.existingEbt],
          ['Pemetaan sosial', campus(selected.campusId).program?.socialMapping],
          ['Potensi konflik', campus(selected.campusId).program?.conflict],
          ['IKM DEB SoBI', campus(selected.campusId).program?.ikm],
          ['Kelembagaan', campus(selected.campusId).program?.institution],
          ['Perizinan lahan', campus(selected.campusId).program?.landPermit],
          ['Site survey', campus(selected.campusId).program?.siteSurvey],
          ['Ringkasan kebutuhan intervensi', campus(selected.campusId).program?.interventionSummary],
          ['Kebutuhan intervensi', campus(selected.campusId).program?.intervention]
        ]
      : []
  );
  $effect(() => {
    const id = page.url.searchParams.get('submission');
    const item = submissions.find((s) => s.id === id);
    if (item && id !== openedLink) {
      selectedId = item.id;
      status = item.status;
      openedLink = id!;
    }
  });
  $effect(() => {
    if (activeSubmissionId !== decisionSubmissionId) {
      decisionSubmissionId = activeSubmissionId;
      note = '';
      decision = null;
    }
  });
  async function review() {
    if (!selected || !decision) return;
    if (
      await app.mutate(
        () => dataService.reviewDeb(selected.id, decision!, note),
        decision === 'approved'
          ? 'Data DEB disetujui dan kampus telah diberi notifikasi.'
          : 'Permintaan revisi dikirim ke kampus.'
      )
    )
      decision = null;
  }
</script>

<svelte:head><title>Review Kampus · Digitalisasi DEB</title></svelte:head>
<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >RUANG REVIEW KAMPUS</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Tinjauan &amp; Konfirmasi DEB
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Periksa data yang dikirim kampus, beri catatan per indikator, lalu setujui atau minta revisi.
    </p>
  </div>
  <Badge tone="blue">{submissions.filter((s) => s.status === 'pending').length} menunggu</Badge>
</div>
<div
  class="[&>button]:text-[#18375f]! [&>button]:border-[color:rgb(218,_231,_245)]! [&>button:hover]:[box-shadow:0_8px_20px_#145b9c12]! [&>button:hover]:border-[color:rgb(88,_162,_229)]! [&>button.current]:[box-shadow:0_8px_20px_#145b9c12]! [&>button.current]:border-[color:rgb(88,_162,_229)]! [&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mt-[0px] [&&]:mb-[26px] [&&]:mx-[0px] max-[800.01px]:[&&]:gap-y-[8px] max-[800.01px]:[&&]:gap-x-[8px] review-status-strip"
  aria-label="Ringkasan review"
>
  {#each [{ value: 'pending', label: 'Menunggu tinjauan', icon: 'clock', note: 'Siap diperiksa Admin PF' }, { value: 'approved', label: 'Sudah dikonfirmasi', icon: 'check', note: 'Tersimpan dalam riwayat' }, { value: 'revision', label: 'Dikembalikan ke kampus', icon: 'edit', note: 'Perbaikan oleh pemilik data' }] as item}<button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#30482e] [&&]:flex [&&]:items-center [&&]:gap-y-[15px] [&&]:gap-x-[15px] [&&]:text-left [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:[transition-behavior:normal,_normal] [&&]:[transition-duration:0.15s,_0.15s] [&&]:[transition-timing-function:ease,_ease] [&&]:[transition-delay:0s,_0s] [&&]:[transition-property:border-color,_box-shadow] [&&]:p-[21px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(224,_231,_217)] [&&]:rounded-[14px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:[box-shadow:0_4px_14px_#29442108] [&:hover]:border-[color:rgb(138,_164,_116)] [&.current]:[box-shadow:0_4px_14px_#29442108] [&.current]:border-[color:rgb(138,_164,_116)] max-[800.01px]:[&&]:gap-y-[10px] max-[800.01px]:[&&]:gap-x-[10px] max-[800.01px]:[&&]:p-[13px] max-[800.01px]:[&&>svg]:hidden"
      class:current={status === item.value}
      onclick={() => {
        status = item.value as VerificationStatus;
        search = '';
      }}
      ><span
        class={[
          `status-icon ${item.value}`,
          '[&&]:w-[40px] [&&]:h-[40px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [background-image:initial]! [background-color:rgb(237,_245,_255)]! [&&]:shrink-0 [&&]:rounded-[12px] [&.pending]:[background-image:initial]! [&.pending]:[background-color:rgb(237,_245,_255)]! [&.pending]:text-[#507698] [&.revision]:[background-image:initial]! [&.revision]:[background-color:rgb(237,_245,_255)]! [&.revision]:text-[#a67c31] max-[800.01px]:[&&]:hidden'
        ]}><Icon name={item.icon} /></span
      ><span
        class="[&_small]:text-[#607797]! [&_strong_span]:text-[#607797]! [&>span]:text-[#607797]! [&_strong]:text-[#143763]! [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:min-w-[0] status-copy"
        ><small
          class="[&&]:text-[11px] [&&]:text-[#586d51] leading-[1.7] [&&]:block max-[800.01px]:[&&]:text-[10px] max-[800.01px]:[&&]:leading-[1.6]"
          >{item.label}</small
        ><strong
          class="font-[650] [&&]:flex [&&]:items-baseline [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[29px] [&&]:text-[#294426] [&&]:mx-[0px] [&&]:my-[7px] max-[800.01px]:[&&]:text-[24px]"
          >{submissions.filter((s) => s.status === item.value).length}<span
            class="[&&]:text-[10px] [&&]:font-[500] [&&]:text-[#687b60] max-[800.01px]:[&&]:hidden"
            >pengajuan</span
          ></strong
        ><span class="[&&]:text-[10px] [&&]:text-[#75816f] max-[800.01px]:[&&]:hidden"
          >{item.note}</span
        ></span
      ><Icon name="arrow" size={16} /></button
    >{/each}
</div>
<div
  class="[&&]:grid [&&]:grid-cols-[280px_minmax(0,_1fr)] [&&]:gap-y-[22px] [&&]:gap-x-[22px] [&&]:[align-items:start] max-[1200.01px]:[&&]:grid-cols-[minmax(0,_1fr)] verification-layout"
>
  <section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:sticky [&&]:top-[90px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[1200.01px]:[&&]:static panel queue"
    aria-label="Daftar pengajuan"
  >
    <div
      class="[&_p]:text-[#607797]! [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(227,_233,_223)] [&&]:p-[20px] max-[1200.01px]:[&&]:flex max-[1200.01px]:[&&]:flex-wrap max-[1200.01px]:[&&]:items-center max-[1200.01px]:[&&]:gap-y-[12px] max-[1200.01px]:[&&]:gap-x-[12px] queue-heading"
    >
      <h2
        class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
      >
        Kiriman kampus
      </h2>
      <p
        class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px] max-[1200.01px]:[&&]:w-[100%] max-[1200.01px]:[&&]:m-[0px]"
      >
        Paling lama menunggu ditampilkan lebih dulu.
      </p>
      <label
        class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] [&&&]:mt-[16px] [&&&]:mb-[12px] [&&&]:w-[100%] px-[12px] py-[0px] [&&&]:mx-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] max-[1200.01px]:[&&&]:grow max-[1200.01px]:[&&&]:shrink max-[1200.01px]:[&&&]:[flex-basis:0%] max-[1200.01px]:[&&&]:min-w-[180px] max-[1200.01px]:[&&&]:m-[0px] search-field"
        ><Icon name="search" size={17} /><input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:min-w-[0] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          aria-label="Cari pengajuan kampus"
          placeholder="Cari kampus atau wilayah…"
          bind:value={search}
        /></label
      ><select
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] [&&]:w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] max-[1200.01px]:[&&]:w-[auto] max-[600.01px]:[&&]:w-[100%]"
        aria-label="Status pengajuan"
        bind:value={status}
        >{#each ['pending', 'approved', 'revision'] as value}<option {value}
            >{verificationLabel[value as VerificationStatus]} ({submissions.filter(
              (s) => s.status === value
            ).length})</option
          >{/each}</select
      >
    </div>
    <div
      class="[&&]:max-h-[calc(100dvh_-_340px)] [&&]:min-h-[150px] [&&]:overflow-y-auto [&&]:p-[10px] max-[1200.01px]:[&&]:max-h-[250px] max-[1200.01px]:[&&]:grid max-[1200.01px]:[&&]:grid-cols-[repeat(2,_minmax(0,_1fr))] max-[1200.01px]:[&&]:gap-y-[6px] max-[1200.01px]:[&&]:gap-x-[6px] max-[600.01px]:[&&]:max-h-[235px] max-[600.01px]:[&&]:grid-cols-[1fr] queue-list"
    >
      {#each rows as row}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#243d32] [&&]:flex [&&]:flex-col [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:w-[100%] [&&]:text-left [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:mb-[6px] [&&]:p-[15px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:transparent] [&&]:rounded-[10px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:[background-image:initial]! [&:hover]:[background-color:rgb(243,_248,_255)]! [&.chosen]:[background-image:initial]! [&.chosen]:[background-color:rgb(233,_243,_255)]! [&.chosen]:[box-shadow:inset_3px_0_#1676d2]! [&.chosen]:border-[color:rgb(120,_178,_230)]! max-[1200.01px]:[&&]:m-[0px] queue-item"
          class:chosen={row.id === selected?.id}
          aria-pressed={row.id === selected?.id}
          onclick={() => {
            selectedId = row.id;
          }}
          ><strong class="font-[650] [&&]:text-[12px] [&&]:leading-[1.7]"
            >{campus(row.campusId).name}</strong
          ><span class="[&&]:text-[10px] [&&]:text-[#64735f]">{campus(row.campusId).region}</span>
          <div
            class="[&&]:flex [&&]:justify-between [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:items-center"
          >
            <Badge
              tone={row.status === 'pending'
                ? 'blue'
                : row.status === 'approved'
                  ? 'green'
                  : 'amber'}>Pengajuan #{row.version}</Badge
            ><small class="[&&]:text-[10px] [&&]:text-[#64735f] leading-[1.7]"
              >{row.simulated ? 'Simulasi' : 'Isian kampus'}</small
            >
          </div>
          <small class="[&&]:text-[10px] [&&]:text-[#64735f] leading-[1.7]"
            >Dikirim {date(row.submittedAt)}</small
          ></button
        >{:else}<p class="leading-[1.8] [&&]:text-[12px] [&&]:p-[18px] m-[0px] queue-empty">
          Tidak ada pengajuan yang cocok.
        </p>{/each}
    </div>
  </section>
  <div
    class="[&_p]:text-[#607797]! [&&]:min-w-[0] [&&]:grid [&&]:gap-y-[16px] [&&]:gap-x-[16px] review-content"
  >
    {#if selected}
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:p-[18px] panel review-summary"
      >
        <div
          class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap row-between"
        >
          <div>
            <span
              class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
              >PENGAJUAN #{selected.version}</span
            >
            <h2
              class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
            >
              {campus(selected.campusId).name}
            </h2>
            <p
              class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
            >
              {campus(selected.campusId).region} · Dikirim {date(selected.submittedAt)}
            </p>
          </div>
          <Badge
            tone={selected.status === 'approved'
              ? 'green'
              : selected.status === 'revision'
                ? 'amber'
                : 'blue'}>{verificationLabel[selected.status]}</Badge
          >
        </div>
        <div
          class="[&>div]:border-[color:rgb(219,_232,_247)]! [&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mx-[0px] [&&]:my-[20px] max-[600.01px]:[&&]:gap-y-[7px] max-[600.01px]:[&&]:gap-x-[7px] review-metrics"
        >
          <div
            class="[&&]:p-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(225,_233,_217)] [&&]:rounded-[10px] max-[600.01px]:[&&]:p-[10px]"
          >
            <small
              class="[&&]:text-[11px] [&&]:text-[#61715f] leading-[1.7] [&&]:block max-[600.01px]:[&&]:text-[10px]"
              >Indikator dikirim</small
            ><strong
              class="font-[650] [&&]:block [&&]:text-[28px] [&&]:mt-[8px] max-[600.01px]:[&&]:text-[24px]"
              >{selected.indicators.length}</strong
            >
          </div>
          <div
            class="[&&]:p-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(225,_233,_217)] [&&]:rounded-[10px] max-[600.01px]:[&&]:p-[10px]"
          >
            <small
              class="[&&]:text-[11px] [&&]:text-[#61715f] leading-[1.7] [&&]:block max-[600.01px]:[&&]:text-[10px]"
              >Target belum tercapai</small
            ><strong
              class="font-[650] [&&]:block [&&]:text-[28px] [&&]:mt-[8px] max-[600.01px]:[&&]:text-[24px]"
              >{gaps.length}</strong
            >
          </div>
          <div
            class="[&&]:p-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(225,_233,_217)] [&&]:rounded-[10px] max-[600.01px]:[&&]:p-[10px]"
          >
            <small
              class="[&&]:text-[11px] [&&]:text-[#61715f] leading-[1.7] [&&]:block max-[600.01px]:[&&]:text-[10px]"
              >Feedback revisi aktif</small
            ><strong
              class="font-[650] [&&]:block [&&]:text-[28px] [&&]:mt-[8px] max-[600.01px]:[&&]:text-[24px]"
              >{unresolved.length}</strong
            >
          </div>
        </div>
        <div
          class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] [&&&]:mt-[0px] [&&&]:mb-[18px] px-[15px] py-[13px] [&&&]:mx-[0px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
        >
          <Icon name="verifikasi" />
          <div>
            <strong class="font-[650]">Admin meninjau dan mengonfirmasi</strong>
            <p
              class="[&&]:mt-[8px] [&&&]:mb-[0] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
            >
              Nilai adalah isian kampus dan bersifat baca saja. Konfirmasi memverifikasi data
              pengajuan, bukan menetapkan kelulusan atau kenaikan kelas DEB.
            </p>
          </div>
        </div>
        <a
          class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] text-[12px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
          href={`/admin/campuses/${selected.campusId}`}
          >Buka profil dan proposal kampus <Icon name="arrow" size={15} /></a
        >
      </section>
      <section class="[background-color:white] min-w-[0] p-[24px] border border-[color:rgb(220,_231,_247)] rounded-[11px]" aria-label="Indikator kesiapan rencana aksi">
        <h2 class="font-[650] text-[color:var(--navy)] text-[16px] m-[0px]">Indikator kesiapan rencana aksi</h2>
        <p class="text-[12px] text-[#61715f] leading-[1.8] mt-[8px] mb-[16px]">Isian kampus untuk ditinjau admin.</p>
        <div class="grid grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[10px] max-[700.01px]:grid-cols-[1fr]">{#each readiness as [label, value]}<article class="p-[12px] [background-color:rgb(250,_253,_255)] border border-[#b9d9f5] rounded-[8px]"><strong class="block text-[10px] text-[color:var(--navy)]">{label}</strong><p class="text-[11px] text-[#617a9a] leading-[1.7] whitespace-pre-line mt-[6px] mb-[0px]">{value || 'Belum diisi'}</p></article>{/each}</div>
      </section>
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:p-[18px] panel gap-panel"
      >
        <div
          class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap row-between"
        >
          <h2
            class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
          >
            Kesenjangan terhadap target
          </h2>
          <small class="[&&]:text-[11px] [&&]:text-[#61715f] leading-[1.7]">Target simulasi</small>
        </div>
        {#if gaps.length}<p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
          >
            {gaps.length} indikator belum mencapai target. Menampilkan maksimal 6 capaian terendah.
          </p>
          <div class="[&&]:grid [&&]:gap-y-[18px] [&&]:gap-x-[18px] gap-list">
            {#each gaps.slice(0, 6) as item}<div>
                <div
                  class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap [&&&]:text-[11px] [&&&]:mb-[8px] row-between"
                >
                  <span>{item.name}</span><strong
                    class="[&&]:font-[500] [&&]:text-[10px] [&&]:text-[#61715f]"
                    >{number(item.current)} / {number(item.target)} {item.unit}</strong
                  >
                </div>
                <Progress value={progress(item)} label={item.name} />
              </div>{/each}
          </div>{:else}<p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
          >
            Seluruh indikator pada pengajuan ini sudah mencapai target simulasi.
          </p>{/if}
      </section>
      {#if selected.status === 'pending'}
        <div
          class="[background-color:white] min-w-[0] p-[24px] border border-[color:rgb(220,_231,_247)] rounded-[11px] [&&_.toolbar]:flex-wrap [&&_.toolbar]:gap-y-[10px] [&&_.toolbar]:gap-x-[10px] [&&_.toolbar]:p-[16px] [&&_.category-tabs]:overflow-x-auto [&&_.category-tabs]:[white-space-collapse:collapse] [&&_.category-tabs]:[text-wrap-mode:nowrap] [&&_.category-tabs]:px-[16px] [&&_.category-tabs]:py-[0px] [&&_.table-scroll_table]:min-w-[760px] max-[600.01px]:p-[18px] review-indicators"
        >
          <h2
            class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
          >
            Indikator yang ditinjau
          </h2>
          <p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
          >
            Buka Tinjau untuk membaca catatan kampus dan memberi feedback per indikator.
          </p>
          {#key selected.id}<Indicators campusId={selected.campusId} embedded />{/key}
        </div>
        <section
          class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:p-[18px] panel comments-panel"
        >
          <div
            class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap row-between"
          >
            <h2
              class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
            >
              Feedback kampus ini
            </h2>
            <Badge tone="amber">{unresolved.length} revisi aktif</Badge>
          </div>
          {#each comments as comment}<article
              class="[&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(227,_233,_223)] [&&]:px-[0px] [&&]:py-[16px] [&:first-of-type]:mt-[16px]"
            >
              <div
                class="flex items-center justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap row-between"
              >
                <strong class="font-[650] [&&]:text-[12px]"
                  >{definition(
                    app.data!.indicators.find((i) => i.id === comment.indicatorId)!.definitionId
                  ).name}</strong
                ><small class="[&&]:text-[11px] [&&]:text-[#61715f] leading-[1.7]"
                  >{comment.state === 'closed'
                    ? 'Selesai'
                    : comment.state === 'responded'
                      ? 'Sudah ditanggapi'
                      : 'Menunggu revisi'}</small
                >
              </div>
              <p
                class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px] pre-wrap"
              >
                {comment.text}
              </p>
              {#if comment.state !== 'closed'}<button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                  disabled={app.readOnly || app.loading || app.busy}
                  onclick={() =>
                    app.mutate(
                      () => dataService.closeFeedback(comment.id),
                      'Feedback ditandai selesai.'
                    )}>Tandai selesai</button
                >{/if}
            </article>{:else}<p
              class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
            >
              Belum ada feedback untuk kampus ini.
            </p>{/each}
        </section>
        <section
          class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:p-[18px] panel decision-panel"
        >
          <h2
            class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
          >
            Hasil tinjauan
          </h2>
          <p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
          >
            Tinjau seluruh data dan feedback sebelum memberikan keputusan.
          </p>
          <label
            class="[&&]:flex [&&]:flex-col [&&]:items-stretch [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mt-[22px] [&&]:mb-[18px] [&&]:text-[13px] [&&]:font-[600] [&&]:mx-[0px]"
            >Catatan keputusan<textarea
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[400] [font-stretch:inherit] [&&]:text-[13px] [&&]:leading-[1.8] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:rgb(252,_253,_251)] text-[#17365f] max-w-[100%] [&&]:[resize:vertical] [&&]:min-h-[156px] [&&]:block [&&]:box-border [&&]:w-[100%] [&&]:p-[16px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(214,_225,_206)] [&&]:rounded-[10px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(214,_225,_206)] [&::placeholder]:text-[#819079]"
              readonly={app.readOnly}
              rows="4"
              maxlength="5000"
              bind:value={note}
              placeholder="Wajib untuk permintaan revisi. Sebutkan indikator dan data yang perlu diperbaiki."
            ></textarea></label
          >{#if unresolved.length}<p
              class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#90651c]! [&&]:mx-[0px] decision-help"
            >
              Selesaikan feedback revisi aktif sebelum menyetujui, atau kembalikan pengajuan ke
              kampus melalui Minta Revisi.
            </p>{/if}
          <div
            class="flex items-center [&&&]:gap-y-[12px] [&&&]:gap-x-[12px] [&&&]:flex-wrap [&&&]:mt-[20px] button-row"
          >
            <button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] max-[600.01px]:[&&&&]:w-[100%] button"
              disabled={app.readOnly || app.loading || app.busy || unresolved.length > 0}
              onclick={() => (decision = 'approved')}
              ><Icon name="check" size={17} />Konfirmasi data</button
            ><button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] max-[600.01px]:[&&&&]:w-[100%] button secondary"
              disabled={app.readOnly || app.loading || app.busy || !note.trim()}
              onclick={() => (decision = 'revision')}>Minta Revisi</button
            >
          </div>
          <small
            class="[&&]:text-[11px] [&&]:text-[#61715f] [&&]:leading-[1.8] [&&]:block [&&]:mt-[18px]"
            >Keputusan tersimpan dalam riwayat pengajuan dan dikirim ke notifikasi kampus.</small
          >
        </section>
      {:else}
        <section
          class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:p-[18px] panel decision-panel"
        >
          <h2
            class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:leading-[1.5] m-[0px]"
          >
            Keputusan Admin PF
          </h2>
          <p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px]"
          >
            {selected.reviewedBy} · {date(selected.reviewedAt!)}
          </p>
          <p
            class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:text-[12px] [&&]:text-[#61715f] [&&]:mx-[0px] pre-wrap"
          >
            {selected.decisionNote || 'Data pengajuan telah disetujui.'}
          </p>
          <details class="[&&]:min-w-[0]">
            <summary
              class="[&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&&]:cursor-pointer [&&]:text-[13px] [&&]:px-[0px] [&&]:py-[12px]"
              >Lihat arsip nilai yang dikirim</summary
            >
            <div class="overflow-x-auto max-w-[100%] relative table-scroll">
              <table
                class="border-collapse w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap]"
              >
                <thead
                  ><tr
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Indikator</th
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Aktual</th
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Target</th
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Catatan kampus</th
                    ></tr
                  ></thead
                ><tbody
                  class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
                  >{#each selected.indicators as item}<tr
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] [&&]:min-w-[100px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] [&:last-child]:min-w-[220px]"
                        >{item.name}</td
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] [&&]:min-w-[100px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] [&:last-child]:min-w-[220px]"
                        >{number(item.current)}</td
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] [&&]:min-w-[100px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] [&:last-child]:min-w-[220px]"
                        >{item.target > 0 ? number(item.target) : 'Belum ditetapkan'}</td
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere [&&]:min-w-[100px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] [&:last-child]:min-w-[220px] pre-wrap"
                        >{item.note || '—'}</td
                      ></tr
                    >{/each}</tbody
                >
              </table>
            </div>
          </details>
        </section>
      {/if}
    {:else}<section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
      >
        <Empty
          title={search
            ? 'Pengajuan tidak ditemukan'
            : status === 'pending'
              ? 'Antrean sudah selesai'
              : 'Belum ada riwayat keputusan'}
          description={search
            ? 'Coba nama kampus atau wilayah lain.'
            : 'Pengajuan yang dikirim kampus akan muncul di antrean ini.'}
          icon="verifikasi"
        />
      </section>{/if}
  </div>
</div>
{#if decision && selected}<Modal
    title={decision === 'approved' ? 'Setujui pengajuan DEB?' : 'Kembalikan untuk revisi?'}
    onclose={() => {
      if (!app.busy) decision = null;
    }}
    ><p class="leading-[1.8] m-[0px]">
      <strong class="font-[650]"
        >{campus(selected.campusId).name} · Pengajuan #{selected.version}</strong
      >
    </p>
    <p class="leading-[1.8] m-[0px]">
      {decision === 'approved'
        ? 'Data pengajuan akan ditandai Terverifikasi dan dikeluarkan dari antrean.'
        : 'Kampus dapat memperbaiki indikator dan mengirim ulang pengajuannya.'}
    </p>
    {#if note.trim()}<p
        class="leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere m-[0px] pre-wrap"
      >
        {note}
      </p>{/if}
    <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        disabled={app.busy}
        onclick={() => (decision = null)}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        disabled={app.readOnly || app.loading || app.busy}
        onclick={review}>Konfirmasi keputusan</button
      >
    </div></Modal
  >{/if}
