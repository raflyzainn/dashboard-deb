<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { hasTarget, progress, number, date, feedbackLabel } from '$lib/domain';
  import type { CampusIndicator } from '$lib/types';
  import SubmissionStatus from './SubmissionStatus.svelte';
  import { latestSubmission } from '$lib/verification';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  let { campusId = '', embedded = false, review = false }: { campusId?: string; embedded?: boolean; review?: boolean } = $props();
  let campus = $state('');
  $effect(() => {
    if (!app.data?.campuses.some((c) => c.id === campus)) campus = app.data?.campuses[0]?.id || '';
  });
  let search = $state('');
  let category = $state('Semua bidang');
  let status = $state('all');
  let selected = $state<CampusIndicator | null>(null);
  let current = $state<number | undefined>(0);
  let target = $state<number | undefined>(0);
  let note = $state('');
  let feedback = $state('');
  let revision = $state(true);
  const archived = $derived(app.data?.period?.state === 'archived');
  const isAdmin = $derived(app.session?.role === 'admin');
  const activeCampus = $derived(campusId || (isAdmin ? campus : app.session!.campusId!));
  const locked = $derived(
    !isAdmin && latestSubmission(app.data!, activeCampus)?.status === 'pending'
  );
  const definition = (id: string) => app.data!.definitions.find((d) => d.id === id)!;
  const rows = $derived(
    app
      .data!.indicators.filter((i) => i.campusId === activeCampus)
      .filter((i) => {
        const d = definition(i.definitionId);
        const revising = app.data!.feedback.some(
          (f) => f.indicatorId === i.id && f.requiresRevision && f.state !== 'closed'
        );
        return (
          d.name.toLowerCase().includes(search.toLowerCase()) &&
          (category === 'Semua bidang' || d.category === category) &&
          (status === 'all' ||
            (status === 'revision'
              ? revising
              : status === 'achieved'
                ? !i.unfilled && hasTarget(i) && i.current >= i.target
                : i.unfilled || !hasTarget(i) || i.current < i.target))
        );
      })
  );
  const comments = $derived(
    selected
      ? app
          .data!.feedback.filter((f) => f.indicatorId === selected!.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : []
  );
  function open(item: CampusIndicator) {
    selected = item;
    current = item.current;
    target = item.target;
    note = item.note;
    feedback = '';
    revision = true;
    app.error = '';
  }
  async function save() {
    if (current === undefined || current === null) {
      app.error = 'Nilai aktual wajib diisi.';
      return;
    }
    if (
      await app.mutate(
        () => dataService.updateIndicator(selected!.id, current!, note),
        'Indikator berhasil diperbarui.'
      )
    )
      selected = null;
  }
  async function comment() {
    if (
      await app.mutate(
        () => dataService.addFeedback(selected!.id, feedback, revision),
        'Feedback berhasil dikirim.'
      )
    )
      feedback = '';
  }
  async function saveTarget() {
    if (target === undefined || target === null || target <= 0) {
      app.error = 'Target harus lebih dari nol.';
      return;
    }
    if (
      await app.mutate(
        () => dataService.updateIndicatorTarget(selected!.id, target!),
        'Target kampus tersimpan.'
      )
    )
      selected = null;
  }
</script>
{#if !embedded}<div
    class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >CAPAIAN PROGRAM</span
      >
      <h1
        class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
      >
        Indikator DEB Putih
      </h1>
      <p class="leading-[1.8] m-[0px]">
        {isAdmin
          ? 'Tinjau perkembangan kampus dan berikan arahan yang sesuai.'
          : 'Catat perkembangan nyata, satu indikator setiap langkah.'}
      </p>
    </div>
    <Badge tone="green">{app.data!.definitions.length} indikator simulasi</Badge>
  </div>{/if}
{#if !isAdmin && !embedded}<SubmissionStatus />{/if}
{#if isAdmin}<div
    class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
  >
    <Icon name="verifikasi" /><span
      ><strong class="font-[650]">Data isian kampus ? Baca saja</strong><br />Admin meninjau dan
      memberi feedback. Perbaikan nilai hanya dilakukan oleh kampus.</span
    >
  </div>{/if}
<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
>
  <div
    class="flex items-center gap-y-[12px] gap-x-[12px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:rgb(237,_241,_232)] flex-wrap px-[22px] py-[19px] max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:p-[16px] max-[700.01px]:[&_.search-field]:[flex-basis:100%] max-[700.01px]:[&_select]:grow max-[700.01px]:[&_select]:shrink max-[700.01px]:[&_select]:[flex-basis:0%] max-[700.01px]:[&_select]:max-w-[100%] max-[700.01px]:[&_select]:min-w-[0] toolbar"
  >
    <div
      class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
    >
      <Icon name="search" size={18} /><input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        aria-label="Cari indikator"
        placeholder="Cari indikator…"
        bind:value={search}
      />
    </div>
    {#if isAdmin && !campusId}<select
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
        aria-label="Pilih kampus"
        bind:value={campus}
        >{#each app.data!.campuses as c}<option value={c.id}>{c.name}</option>{/each}</select
      >{/if}<select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
      aria-label="Filter status indikator"
      bind:value={status}
      ><option value="all">Semua status</option><option value="achieved">Tercapai</option><option
        value="progress">Dalam proses</option
      ><option value="revision">Perlu tindak lanjut</option></select
    >
  </div>
  <div
    class="flex gap-y-[22px] gap-x-[22px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--line)] overflow-x-auto px-[23px] py-[0px] [&_button]:[background-image:none] [&_button]:[background-color:initial] [&_button]:[border-top-width:0px] [&_button]:[border-right-width:0px] [&_button]:[border-bottom-width:2px] [&_button]:[border-left-width:0px] [&_button]:[border-top-style:none] [&_button]:[border-right-style:none] [&_button]:[border-bottom-style:solid] [&_button]:[border-left-style:none] [&_button]:[border-top-color:currentcolor] [&_button]:[border-right-color:currentcolor] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-color:currentcolor] [&_button]:pt-[16px] [&_button]:pb-[13px] [&_button]:[white-space-collapse:collapse] [&_button]:[text-wrap-mode:nowrap] [&_button]:text-[11px] [&_button]:text-[#96a087] [&_button]:flex [&_button]:gap-y-[8px] [&_button]:gap-x-[8px] [&_button]:items-center [&_button]:px-[0px] [&_button.active]:text-[#075fc7] [&_button.active]:[border-bottom-color:#1681df] [&_button.active]:font-[700] max-[700.01px]:gap-y-[19px] max-[700.01px]:gap-x-[19px] max-[700.01px]:px-[16px] max-[700.01px]:[&_button]:text-[10px] tabs category-tabs"
  >
    {#each ['Semua bidang', ...new Set(app.data!.definitions.map((d) => d.category))] as c}<button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
        class:active={category === c}
        onclick={() => (category = c)}>{c}</button
      >{/each}
  </div>
  {#if rows.length}
    <!-- Keyboard users can focus the scroll region to scroll the table. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class={`overflow-x-auto max-w-[100%] relative table-scroll ${review ? 'max-h-[60dvh] overflow-y-auto focus-visible:outline-2 focus-visible:outline-[#1681df] [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-[0_1px_0_#e2ecf8] [&_table]:table-fixed [&_table]:!min-w-[780px] [&_th:first-child]:w-[22%] [&_th:nth-child(2)]:w-[12%] [&_th:nth-child(3)]:w-[12%] [&_th:nth-child(4)]:w-[12%] [&_th:nth-child(5)]:w-[14%] [&_th:nth-child(6)]:w-[16%] [&_th:last-child]:w-[12%] [&_th]:!px-2 [&_td]:!px-2 [&_td]:!min-w-0 [&_td]:tabular-nums [&_td:first-child]:whitespace-normal [&_th:nth-child(2)]:text-right [&_th:nth-child(3)]:text-right [&_th:nth-child(4)]:text-right [&_td:nth-child(2)]:text-right [&_td:nth-child(3)]:text-right [&_td:nth-child(4)]:text-right [&_td:nth-child(6)]:whitespace-normal' : ''}`}
      tabindex="0"
      role="region"
      aria-label={review ? 'Tabel indikator untuk ditinjau' : 'Tabel indikator kampus'}
    >
      <table
        class="border-collapse w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap]"
      >
        <thead
          ><tr
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >INDIKATOR</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >BASELINE</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >TARGET</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >AKTUAL</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >PROGRES</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >STATUS</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >AKSI</th
            ></tr
          ></thead
        ><tbody
          class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
          >{#each rows as i}{@const d = definition(i.definitionId)}{@const revise =
              app.data!.feedback.some(
                (f) => f.indicatorId === i.id && f.requiresRevision && f.state !== 'closed'
              )}<tr
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><strong class="font-[650] block text-[12px] table-title">{d.name}</strong><small
                  class="text-[10px] text-[#778669] leading-[1.7] block mt-[4px] table-subtitle"
                  >{d.category} · {d.unit}</small
                ></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                >{number(i.baseline)}</td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                >{hasTarget(i) ? number(i.target) : 'Belum ditetapkan'}{#if i.targetSimulated}<small class="block text-[10px] text-[#986611]">Target simulasi</small>{/if}</td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><strong class="font-[650]">{i.unfilled ? 'Belum diisi' : number(i.current)}</strong
                ></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] min-w-[135px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] progress-cell"
                ><Progress value={progress(i)} showValue /></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><div class="flex flex-col items-start gap-y-[5px] gap-x-[5px] badge-stack">
                  <Badge tone={!i.unfilled && hasTarget(i) && i.current >= i.target ? 'green' : 'neutral'}
                    >{i.unfilled
                      ? 'Belum diisi'
                      : !hasTarget(i)
                        ? 'Target belum ditetapkan'
                        : i.current >= i.target
                        ? 'Tercapai'
                        : 'Dalam proses'}</Badge
                  >{#if revise}<Badge tone="amber">Perlu tindak lanjut</Badge>{/if}
                </div></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
                  disabled={app.loading}
                  aria-label={`${review ? 'Tinjau' : 'Lihat'} ${d.name}`}
                  onclick={() => open(i)}
                  ><Icon name={isAdmin ? 'eye' : 'edit'} size={15} />{review ? 'Tinjau' : 'Lihat'}</button
                ></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
    <div
      class="[border-top-width:1px] [border-top-style:solid] [border-top-color:rgb(237,_241,_232)] text-[10px] text-[#98a18e] px-[22px] py-[15px] table-foot"
    >
      {rows.length} indikator · Baseline dan target adalah referensi simulasi.
    </div>{:else}<Empty
      title="Tidak ada indikator yang cocok"
      description="Ubah pencarian, bidang, atau filter status."
    />{/if}
</section>
{#if selected}<Modal
    title={definition(selected.definitionId).name}
    onclose={() => {
      if (!app.busy) selected = null;
    }}
    wide
    ><p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
      {definition(selected.definitionId).description}
    </p>
    <div
      class="grid grid-cols-[repeat(3,_1fr)] [background-image:initial] [background-color:rgb(247,_251,_255)] mx-[0px] my-[20px] border-[1px] border-solid border-[color:rgb(220,_233,_247)] rounded-[9px] [&>div]:text-center [&>div]:p-[14px] [&>div+div]:[border-left-width:1px] [&>div+div]:[border-left-style:solid] [&>div+div]:[border-left-color:var(--line)] [&_strong]:block [&_strong]:mt-[5px] [&_strong]:text-[17px] [&_small]:text-[10px] mini-stats"
    >
      <div>
        <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]">Baseline</small><strong
          class="font-[650]">{selected.baseline}</strong
        >
      </div>
      <div>
        <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]">Target</small><strong
          class="font-[650]">{hasTarget(selected) ? selected.target : 'Belum ditetapkan'}</strong
        >
      </div>
      <div>
        <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]">Satuan</small><strong
          class="font-[650]">{definition(selected.definitionId).unit}</strong
        >
      </div>
    </div>
    {#if !isAdmin}<form
        class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
        onsubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label
          >Nilai aktual<input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            readonly={archived || app.readOnly || locked || app.busy}
            type="number"
            min="0"
            step="any"
            required
            bind:value={current}
          /></label
        ><label
          >Catatan perkembangan<textarea
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            readonly={archived || app.readOnly || locked || app.busy}
            rows="3"
            maxlength="5000"
            bind:value={note}
            placeholder="Periode data, kegiatan, dan hasil yang dicapai…"></textarea></label
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={archived || app.readOnly || app.loading || locked || app.busy}
          >{app.busy ? 'Menyimpan…' : 'Simpan perubahan'}</button
        >
      </form>{:else}{@const actual = app.data!.indicators.find((i) => i.id === selected!.id)!}
      <div
        class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
      >
        <Icon name="indicators" />
        <div>
          <strong class="font-[650]"
            >Nilai aktual: {actual.unfilled ? 'Belum diisi' : number(actual.current)}</strong
          >
          <p class="leading-[1.8] m-[0px]">{actual.note || 'Belum ada catatan dari kampus.'}</p>
          <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
            >Diperbarui {date(actual.updatedAt)}</small
          >
        </div>
      </div>{/if}
    {#if isAdmin}<form
        class="mt-[16px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_input]:w-full"
        onsubmit={(event) => {
          event.preventDefault();
          saveTarget();
        }}
      ><label>Target kampus<input class="text-[12px] text-[#17365f] px-[12px] py-[11px] border border-[#b9d6f3] rounded-[7px] focus:outline-[#7fc1ff]" type="number" min="0.000000001" step="any" required bind:value={target} /></label><button class="mt-[14px] text-[12px] font-[650] text-white [background-color:#0877d8] px-[16px] py-[10px] rounded-[8px] disabled:opacity-50" disabled={archived || app.readOnly || app.loading || app.busy}>Simpan target kampus</button></form>{/if}
    <div
      class="h-[1px] [background-image:initial] [background-color:var(--line)] mx-[0px] my-[24px] section-divider"
    ></div>
    <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">
      Feedback Admin PF <span
        class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
        >{comments.length}</span
      >
    </h3>
    {#if comments.length}<div class="grid gap-y-[14px] gap-x-[14px] mt-[18px] feedback-list">
        {#each comments as f}<article
            class="[background-image:initial] [background-color:rgb(247,_251,_255)] p-[16px] border-[1px] border-solid border-[color:rgb(220,_233,_247)] rounded-[9px] [&_.row-between>strong]:text-[12px] [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:mx-[0px] [&_p]:my-[12px] [&_small]:text-[10px] max-[700.01px]:[&_p]:text-[11px] feedback-card"
          >
            <div class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between">
              <strong class="font-[650]">Admin PF</strong><Badge
                tone={f.state === 'closed' ? 'green' : f.state === 'responded' ? 'blue' : 'amber'}
                >{f.requiresRevision ? feedbackLabel[f.state] : 'Catatan'}</Badge
              >
            </div>
            <p
              class="leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere m-[0px] pre-wrap"
            >
              {f.text}
            </p>
            <div class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between">
              <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                >{date(f.createdAt)}</small
              >{#if isAdmin && f.state !== 'closed'}<button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                  disabled={archived || app.readOnly || app.loading || app.busy}
                  onclick={() =>
                    app.mutate(() => dataService.closeFeedback(f.id), 'Feedback ditandai selesai.')}
                  ><Icon name="check" size={15} />Tandai selesai</button
                >{/if}
            </div>
          </article>{/each}
      </div>{:else}<p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
        Belum ada feedback untuk indikator ini.
      </p>{/if}{#if isAdmin}<form
        class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] pt-[16px] feedback-form"
        onsubmit={(e) => {
          e.preventDefault();
          comment();
        }}
      >
        <label
          >Feedback baru<textarea
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            readonly={archived || app.readOnly}
            rows="3"
            required
            maxlength="5000"
            bind:value={feedback}
            placeholder="Tuliskan arahan atau masukan untuk kampus…"></textarea></label
        ><label
          class="flex-row items-center [&_input]:w-[16px] [&_input]:h-[16px] [&_input]:[accent-color:#1265d8] checkbox-label"
          ><input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            type="checkbox"
            bind:checked={revision}
          />Minta revisi data</label
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={archived || app.readOnly || app.loading || app.busy}
          >{app.busy ? 'Mengirim…' : 'Kirim feedback'}</button
        >
      </form>{/if}</Modal
  >{/if}
