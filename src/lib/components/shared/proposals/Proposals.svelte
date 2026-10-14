<script module lang="ts">
  // Last directory view, so the back link returns to the same search, filter and sort.
  let directoryQuery = $state('');
</script>
<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date, size } from '$lib/domain';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import ProposalDirectory from './ProposalDirectory.svelte';
  import ProposalDocument from './ProposalDocument.svelte';
  import ProposalReview from './ProposalReview.svelte';
  let { campusId = '', embedded = false }: { campusId?: string; embedded?: boolean } = $props();
  // Admin route: ?campus=<id> or ?version=<id> opens one campus, otherwise the directory is shown.
  const linkedCampus = $derived.by(() => {
    const params = page.url.searchParams;
    const id =
      params.get('campus') ||
      app.data?.proposals.find((p) => p.id === params.get('version'))?.campusId;
    return app.data?.campuses.some((c) => c.id === id) ? id! : '';
  });
  let upload = $state(false);
  let file = $state<File | null>(null);
  let changes = $state('');
  let selectedId = $state('');
  const isAdmin = $derived(app.session?.role === 'admin');
  const showDirectory = $derived(isAdmin && !campusId && !linkedCampus);
  const adminDetail = $derived(isAdmin && !campusId && !embedded && Boolean(linkedCampus));
  const activeCampus = $derived(campusId || (isAdmin ? linkedCampus : app.session!.campusId!));
  const activeCampusInfo = $derived(app.data!.campuses.find((c) => c.id === activeCampus));
  const campusOptions = $derived(
    [...app.data!.campuses].sort((a, b) => a.name.localeCompare(b.name, 'id'))
  );
  $effect(() => {
    if (!showDirectory) return;
    const keep = new URLSearchParams();
    for (const key of ['q', 'status', 'sort']) {
      const value = page.url.searchParams.get(key);
      if (value) keep.set(key, value);
    }
    const query = keep.toString();
    directoryQuery = query ? `?${query}` : '';
  });
  const versions = $derived(
    app
      .data!.proposals.filter((p) => p.campusId === activeCampus)
      .sort((a, b) => b.version - a.version)
  );
  const current = $derived(versions[0]);
  const selected = $derived(versions.find((p) => p.id === selectedId) || versions[0]);
  $effect(() => {
    activeCampus;
    selectedId = page.url.searchParams.get('version') || '';
  });
  async function save() {
    if (!file) {
      app.error = 'Pilih PDF untuk diunggah.';
      return;
    }
    if (
      await app.mutate(
        () => dataService.uploadProposal(file!, changes),
        'Versi baru proposal berhasil diajukan.'
      )
    ) {
      upload = false;
      selectedId = '';
      file = null;
      changes = '';
    }
  }
</script>
{#if adminDetail}
  <div class="mb-6">
    <div class="-ml-3">
      <Button variant="ghost" size="sm" icon="back" href={page.url.pathname + directoryQuery}
        >Semua proposal</Button
      >
    </div>
    <div class="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div class="min-w-0">
        <span class="mb-2 block text-[12px] font-bold tracking-[0.06em] text-[#3975b7]"
          >PROPOSAL KAMPUS</span
        >
        <h1
          class="m-0 text-[23px] leading-tight font-bold tracking-[-0.01em] text-[#0d234c] min-[900px]:text-[29px]"
        >
          {activeCampusInfo?.name}
        </h1>
        <p class="m-0 mt-2 text-sm leading-relaxed text-[#475569]">
          Baca setiap versi, tulis tanggapan, dan ikuti diskusi kampus ini.
        </p>
      </div>
      <label
        class="flex w-full flex-col gap-1.5 text-[13px] font-medium text-[#475569] min-[700px]:w-72"
      >
        Ganti kampus
        <select
          value={activeCampus}
          disabled={app.busy}
          onchange={(e) =>
            goto(`${page.url.pathname}?campus=${encodeURIComponent(e.currentTarget.value)}`)}
          class="min-h-[42px] w-full rounded-lg border border-[#dce7f7] bg-white px-3 text-sm text-[#17365f] focus:border-[#2790e8] focus:outline focus:outline-2 focus:outline-[#7fc1ff]"
        >
          {#each campusOptions as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
    </div>
  </div>
{:else if !embedded}<div
    class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[14px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[14px] max-[700.01px]:[&_p]:leading-[1.65] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
  >
    <div>
      <span
        class="block text-[12px] tracking-[0.06em] font-[700] text-[#3975b7] mb-[9px] max-[700.01px]:text-[10px] eyebrow"
        >DOKUMEN PROGRAM</span
      >
      <h1
        class="font-[700] text-[color:var(--navy)] text-[29px] tracking-[-0.01em] leading-[1.3] m-[0px]"
      >
        Proposal kampus
      </h1>
      <p class="leading-[1.6] m-[0px]">
        {isAdmin
          ? 'Ikuti perkembangan gagasan dan rencana kerja kampus mitra.'
          : 'Simpan rencana kerja Anda, lengkap dengan setiap jejak perubahannya.'}
      </p>
    </div>
    {#if !isAdmin}<button
        disabled={app.readOnly || app.loading || app.busy}
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[600] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[13px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        onclick={() => {
          file = null;
          changes = '';
          upload = true;
        }}><Icon name="plus" size={18} />Unggah versi baru</button
      >{/if}
  </div>{/if}
{#if showDirectory}<ProposalDirectory />{:else}<div
    class="grid grid-cols-[minmax(0,_2.5fr)_minmax(240px,_1fr)] gap-y-[24px] gap-x-[24px] max-[1200.01px]:grid-cols-[1fr] proposal-grid"
  >
    <div>
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
      >
        <div
          class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[16px] [&_h2]:font-[700] [&_p]:text-[13px] [&_p]:text-[#475569] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[15px] max-[700.01px]:[&_p]:text-[13px] max-[700.01px]:[&_.text-link]:text-[11px] panel-heading"
        >
          <div>
            <h2 class="font-[600] text-[color:var(--navy)] text-[18px] tracking-[-0.01em] m-[0px]">
              Proposal terbaru
            </h2>
            <p class="leading-[1.6] m-[0px]">
              {app.data!.campuses.find((c) => c.id === activeCampus)?.name}
            </p>
          </div>
          <Badge tone={current ? 'green' : 'neutral'}
            >{current ? 'Diajukan' : 'Belum diunggah'}</Badge
          >
        </div>
        {#if current}<div
            class="flex items-center gap-y-[30px] gap-x-[30px] pt-[6px] pb-[28px] px-[26px] max-[700.01px]:gap-y-[20px] max-[700.01px]:gap-x-[20px] max-[700.01px]:pt-[0px] max-[700.01px]:pb-[24px] max-[700.01px]:flex-wrap max-[700.01px]:px-[20px] proposal-current"
          >
            <div
              class="w-[138px] min-w-[138px] min-h-[178px] [background-image:linear-gradient(145deg,_rgb(231,_242,_255),_rgb(245,_249,_255))]! [background-color:initial]! relative text-[#2369ae]! [border-top-left-radius:5px] [border-top-right-radius:10px] [border-bottom-right-radius:10px] [border-bottom-left-radius:5px] [box-shadow:4px_4px_0_#f5f7ef] flex flex-col items-start gap-y-[9px] gap-x-[9px] p-[17px] border-[1px] border-solid border-[color:rgb(207,_226,_246)]! [&>span]:text-[10px] [&>span]:font-[800] [&>span]:tracking-[0.06em] [&>svg]:absolute [&>svg]:right-[10px] [&>svg]:top-[31px] [&>svg]:opacity-[0.13] [&>strong]:text-[14px] [&>strong]:leading-[1.5] [&>strong]:mt-[15px] [&>small]:text-[10px] max-[700.01px]:w-[110px] max-[700.01px]:min-w-[110px] max-[700.01px]:min-h-[148px] max-[700.01px]:p-[15px] max-[700.01px]:[&>strong]:text-[13px] pdf-cover"
            >
              <span>DEB PUTIH</span><Icon name="proposal" size={58} /><strong class="font-[600]"
                >PROPOSAL<br />PROGRAM</strong
              ><small class="text-[13px] text-[color:var(--muted)] leading-[1.55]"
                >Versi {current.version}</small
              >
              <div
                class="h-[3px] w-[35px] [background-image:initial]! [background-color:rgb(105,_169,_227)]! mt-[auto] pdf-cover-line"
              ></div>
            </div>
            <div
              class="min-w-[0] [&_h3]:text-[18px] [&_h3]:wrap-anywhere [&_p]:text-[13px] [&_p]:text-[#64748b] [&_p]:mt-[10px] [&_p]:mb-[20px] [&_p]:mx-[0px] max-[700.01px]:min-w-[150px] max-[700.01px]:grow max-[700.01px]:shrink max-[700.01px]:[flex-basis:0%] max-[700.01px]:[&_h3]:text-[16px] max-[700.01px]:[&_.button-row]:gap-y-[8px] max-[700.01px]:[&_.button-row]:gap-x-[8px] max-[700.01px]:[&_.button]:text-[12px] max-[700.01px]:[&_.button]:px-[11px] max-[700.01px]:[&_.button]:py-[9px] [&>p]:text-[#475569]! proposal-info"
            >
              <span
                class="block text-[12px] tracking-[0.06em] font-[700] text-[#3975b7] mb-[9px] max-[700.01px]:text-[10px] eyebrow"
                >DOKUMEN AKTIF · V{current.version}</span
              >
              <h3 class="font-[600] text-[color:var(--navy)] text-[16px] leading-[1.5] m-[0px]">
                {current.filename}
              </h3>
              <p class="leading-[1.6] m-[0px]">
                {date(current.createdAt)} · {size(current.size)} · PDF
              </p>
              <div class="flex items-center gap-y-[10px] gap-x-[10px] flex-wrap button-row">
                {#if !isAdmin}<button
                    disabled={app.readOnly || app.loading || app.busy}
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[600] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[13px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
                    onclick={() => {
                      file = null;
                      changes = '';
                      upload = true;
                    }}><Icon name="upload" size={17} />Perbarui</button
                  >{/if}
              </div>
            </div>
          </div>{:else}<Empty
            title="Proposal belum diunggah"
            description={isAdmin
              ? 'Kampus ini belum mengajukan proposal.'
              : 'Mulai dengan mengunggah rencana kerja dalam format PDF.'}
            icon="proposal"
          />{/if}
      </section>
      {#if selected}
        <section
          aria-label="Pratinjau proposal terpilih"
          class="mt-[24px] rounded-[11px] border border-[#dce7f7] bg-white p-[22px] max-[700px]:p-[16px]"
        >
          <div class="mb-[14px] flex flex-wrap items-center justify-between gap-[12px]">
            <h2 class="text-[16px] font-semibold text-[#0d234c]">
              Pratinjau PDF &middot; Versi {selected.version}
            </h2>
            <label class="text-[13px] text-[#647699]"
              >Pilih versi
              <select
                aria-label="Pilih versi proposal"
                value={selected.id}
                disabled={app.busy}
                onchange={(e) => (selectedId = e.currentTarget.value)}
                class="ml-[8px] rounded-[7px] border border-[#dce7f7] bg-white px-[10px] py-[8px] text-[#17365f]"
              >
                {#each versions as v}<option value={v.id}
                    >Versi {v.version}{v.id === current?.id ? ' (terbaru)' : ''}</option
                  >{/each}
              </select>
            </label>
          </div>
          {#key (app.session?.id || '') + ':' + selected.id}<ProposalDocument
              proposal={selected}
            /><ProposalReview proposal={selected} />{/key}
        </section>
      {/if}
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden mt-[24px] [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel history-panel"
      >
        <div
          class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[16px] [&_h2]:font-[700] [&_p]:text-[13px] [&_p]:text-[#475569] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[15px] max-[700.01px]:[&_p]:text-[13px] max-[700.01px]:[&_.text-link]:text-[11px] panel-heading"
        >
          <div>
            <h2 class="font-[600] text-[color:var(--navy)] text-[18px] tracking-[-0.01em] m-[0px]">
              Riwayat versi
            </h2>
            <p class="leading-[1.6] m-[0px]">Setiap perubahan adalah bagian dari perjalanan.</p>
          </div>
          <span
            class="text-[13px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
            >{versions.length} versi</span
          >
        </div>
        {#if versions.length}<div
            class="pt-[4px] pb-[24px] px-[25px] max-[700.01px]:px-[18px] version-list"
          >
            {#each versions as v, index}<article
                class="flex gap-y-[16px] gap-x-[16px] relative pb-[25px] [&:last-child]:pb-[0] [&:not(:last-child):before]:absolute [&:not(:last-child):before]:[content:''] [&:not(:last-child):before]:top-[34px] [&:not(:last-child):before]:bottom-[0] [&:not(:last-child):before]:left-[17px] [&:not(:last-child):before]:w-[1px] [&:not(:last-child):before]:[background-image:initial] [&:not(:last-child):before]:[background-color:rgb(225,_233,_215)] max-[700.01px]:gap-y-[11px] max-[700.01px]:gap-x-[11px] [&:before]:[background-image:initial]! [&:before]:[background-color:rgb(217,_232,_247)]! version-item"
              >
                <div
                  class="w-[35px] h-[35px] [background-image:initial] [background-color:rgb(247,_250,_241)] grid items-center [justify-items:center] text-[#64748b] shrink-0 z-[1] border-[1px] border-solid border-[color:rgb(224,_232,_214)] rounded-[50%] version-node"
                >
                  <Icon name="proposal" size={19} />
                </div>
                <div
                  class="grow shrink [flex-basis:0%] min-w-[0] [&_.row-between>div]:flex [&_.row-between>div]:items-center [&_.row-between>div]:gap-y-[10px] [&_.row-between>div]:gap-x-[10px] [&_strong]:text-[14px] [&>small]:text-[12px] [&>small]:block [&>small]:mt-[6px] max-[700.01px]:[&_.row-between]:gap-y-[7px] max-[700.01px]:[&_.row-between]:gap-x-[7px] max-[700.01px]:[&_.text-link]:text-[12px] max-[700.01px]:[&_strong]:text-[13px] [&_p]:text-[#475569]! version-content"
                >
                  <div
                    class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between"
                  >
                    <div>
                      <strong class="font-[600]">Versi {v.version}</strong>{#if index === 0}<Badge
                          tone="green">Terbaru</Badge
                        >{/if}
                    </div>
                    <button
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[600] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                      disabled={app.busy}
                      aria-label={`Pilih versi ${v.version}`}
                      aria-pressed={selected?.id === v.id}
                      onclick={() => (selectedId = v.id)}
                      >Pilih versi<Icon name="arrow" size={15} /></button
                    >
                  </div>
                  <small class="text-[13px] text-[color:var(--muted)] leading-[1.55]"
                    >{date(v.createdAt)} · {size(v.size)}</small
                  >
                  <div
                    class="[background-image:initial]! [background-color:rgb(243,_248,_255)]! mt-[12px] px-[14px] py-[12px] border-[1px] border-solid border-[color:rgb(205,_223,_242)]! rounded-[7px] [&>span]:text-[10px] [&>span]:font-[700] [&>span]:tracking-[0.06em] [&>span]:text-[#64748b] [&_p]:text-[13px] [&_p]:text-[#475569]! [&_p]:leading-[1.65] [&_p]:mt-[7px] max-[700.01px]:p-[10px] max-[700.01px]:[&>span]:text-[10px] max-[700.01px]:[&_p]:text-[12px] change-box"
                  >
                    <span
                      >{v.simulated
                        ? 'RINGKASAN PERUBAHAN · SIMULASI'
                        : 'CATATAN PERUBAHAN MANUAL'}</span
                    >
                    <p
                      class="leading-[1.6] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere m-[0px] pre-wrap"
                    >
                      {v.changes}
                    </p>
                  </div>
                </div>
              </article>{/each}
          </div>{:else}<Empty
            title="Belum ada riwayat"
            description="Versi proposal akan muncul setelah unggahan pertama."
          />{/if}
      </section>
    </div>
    <aside
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [align-self:start] [box-shadow:0_10px_30px_#1a4d8f08] p-[26px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_p]:text-[14px] [&_p]:text-[#475569]! [&_p]:mt-[12px] [&_h4]:text-[14px] [&_ul]:text-[13px] [&_ul]:text-[#475569]! [&_ul]:leading-[2.2] [&_ul]:pl-[17px] [&_ul]:mt-[10px] [&_ul]:mb-[22px] [&_ul]:mx-[0px] max-[1200.01px]:hidden [&:hover]:border-[color:rgb(210,_226,_245)] panel guidance"
    >
      <div class="text-[#2875bd]! mb-[15px] guidance-icon"><Icon name="leaf" size={25} /></div>
      <h3 class="font-[600] text-[color:var(--navy)] text-[16px] leading-[1.5] m-[0px]">
        Rencana yang terus bertumbuh.
      </h3>
      <p class="leading-[1.6] m-[0px]">
        Perbarui proposal saat ada perkembangan. Versi sebelumnya tetap tersimpan, sehingga
        perjalanan program mudah ditelusuri.
      </p>
      <div
        class="h-[1px] [background-image:initial] [background-color:var(--line)] mx-[0px] my-[24px] section-divider"
      ></div>
      <h4 class="font-[600] text-[color:var(--navy)] m-[0px]">Sebelum mengunggah</h4>
      <ul>
        <li>Gunakan dokumen berformat PDF.</li>
        <li>Ukuran file maksimal 40 MB.</li>
        <li>Tulis ringkasan perubahan yang jelas.</li>
      </ul>
      <div
        class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[12px] leading-[1.6] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
      >
        <Icon name="faq" size={17} /><span
          >Pilih versi pada timeline untuk membaca PDF dan tanggapan admin. Hanya satu PDF
          ditampilkan.</span
        >
      </div>
    </aside>
  </div>{/if}
{#if upload}<Modal
    title="Unggah versi proposal baru"
    onclose={() => {
      if (!app.busy) upload = false;
    }}
    ><form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[14px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
      onsubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label
        class="[background-image:initial]! [background-color:rgb(243,_248,_255)]! text-center items-center text-[#4376a8]! px-[18px] py-[28px] border-[1.5px] border-dashed border-[color:rgb(205,_223,_242)]! rounded-[10px] [&>span]:text-[12px] [&>span]:font-[400] [&_input]:text-[12px] [&_input]:w-[auto] [&_input]:max-w-[100%] [&_input]:p-[8px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] upload-zone"
        ><Icon name="upload" size={32} /><strong class="font-[600]">Pilih dokumen proposal</strong
        ><span>PDF · Maksimal 40 MB</span><input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#64748b]"
          type="file"
          aria-label="File proposal PDF"
          accept=".pdf,application/pdf"
          required
          onchange={(e) => {
            file = e.currentTarget.files?.[0] || null;
          }}
        /></label
      >{#if file}<p
          class="leading-[1.6] flex gap-y-[8px] gap-x-[8px] items-center text-[13px] wrap-anywhere pt-[0px] pb-[20px] px-[0px] m-[0px] file-selected"
        >
          <Icon name="proposal" size={18} />{file.name} · {size(file.size)}
        </p>{/if}<label
        >Catatan versi<textarea
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#64748b]"
          readonly={app.readOnly}
          rows="4"
          required
          maxlength="5000"
          bind:value={changes}
          placeholder="Tuliskan keterangan singkat untuk versi ini."></textarea></label
      >
      <p class="leading-[1.6] text-[color:var(--muted)] text-[14px] m-[0px] muted">
        Versi lama tetap tersimpan. File disimpan di server dan dapat diakses kampus
        pemilik serta Admin.
      </p>
      <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[600] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[13px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          disabled={app.busy}
          onclick={() => (upload = false)}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[600] [font-stretch:inherit] text-[14px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[13px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={app.readOnly || app.loading || app.busy}
          >{app.busy ? 'Menyimpan…' : 'Ajukan versi baru'}</button
        >
      </div>
    </form></Modal
  >{/if}
