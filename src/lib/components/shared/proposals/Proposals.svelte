<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { onDestroy } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date, size } from '$lib/domain';
  import type { ProposalVersion } from '$lib/types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import ProposalCompare from './ProposalCompare.svelte';
  let { campusId = '', embedded = false }: { campusId?: string; embedded?: boolean } = $props();
  let campus = $state('');
  $effect(() => {
    if (!app.data?.campuses.some((c) => c.id === campus)) campus = app.data?.campuses[0]?.id || '';
  });
  let search = $state('');
  let status = $state('all');
  let upload = $state(false);
  let file = $state<File | null>(null);
  let changes = $state('');
  let preview = $state<{ url: string; proposal: ProposalVersion } | null>(null);
  let fileLoading = $state(false);
  const isAdmin = $derived(app.session?.role === 'admin');
  const activeCampus = $derived(campusId || (isAdmin ? campus : app.session!.campusId!));
  const versions = $derived(
    app
      .data!.proposals.filter((p) => p.campusId === activeCampus)
      .sort((a, b) => b.version - a.version)
  );
  const current = $derived(versions[0]);
  const campuses = $derived(
    app.data!.campuses.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) &&
        (status === 'all' ||
          (status === 'submitted'
            ? app.data!.proposals.some((p) => p.campusId === c.id)
            : !app.data!.proposals.some((p) => p.campusId === c.id)))
    )
  );
  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    preview = null;
  }
  let destroyed = false;
  onDestroy(() => {
    destroyed = true;
    closePreview();
  });
  async function view(proposal: ProposalVersion) {
    fileLoading = true;
    try {
      const blob = await dataService.proposalFile(proposal.id);
      if (!destroyed) {
        closePreview();
        preview = { url: URL.createObjectURL(blob), proposal };
      }
    } catch (e) {
      if (!destroyed) app.error = e instanceof Error ? e.message : 'PDF tidak dapat dibuka.';
    } finally {
      fileLoading = false;
    }
  }
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
      file = null;
      changes = '';
    }
  }
</script>
{#snippet comparison()}
  {#key activeCampus}<ProposalCompare {versions} actor={app.session!} onview={view} />{/key}
{/snippet}
{#if !embedded}<div
    class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >DOKUMEN PROGRAM</span
      >
      <h1
        class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
      >
        Proposal kampus
      </h1>
      <p class="leading-[1.8] m-[0px]">
        {isAdmin
          ? 'Ikuti perkembangan gagasan dan rencana kerja kampus mitra.'
          : 'Simpan rencana kerja Anda, lengkap dengan setiap jejak perubahannya.'}
      </p>
    </div>
    {#if !isAdmin}<button
        disabled={app.readOnly || app.loading || app.busy}
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        onclick={() => {
          file = null;
          changes = '';
          upload = true;
        }}><Icon name="plus" size={18} />Unggah versi baru</button
      >{/if}
  </div>{/if}
{#if isAdmin && !campusId}<section
    class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden mb-[24px] [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel proposal-selector"
  >
    <div
      class="flex items-center gap-y-[12px] gap-x-[12px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:rgb(237,_241,_232)] flex-wrap px-[22px] py-[19px] max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:p-[16px] max-[700.01px]:[&_.search-field]:[flex-basis:100%] max-[700.01px]:[&_select]:grow max-[700.01px]:[&_select]:shrink max-[700.01px]:[&_select]:[flex-basis:0%] max-[700.01px]:[&_select]:max-w-[100%] max-[700.01px]:[&_select]:min-w-[0] toolbar"
    >
      <div
        class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
      >
        <Icon name="search" size={18} /><input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          aria-label="Cari proposal kampus"
          bind:value={search}
          placeholder="Cari kampus…"
        />
      </div>
      <select
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
        aria-label="Filter proposal"
        bind:value={status}
        ><option value="all">Semua status</option><option value="submitted">Diajukan</option><option
          value="missing">Belum diunggah</option
        ></select
      >
    </div>
    <div
      class="flex items-center gap-y-[18px] gap-x-[18px] px-[22px] py-[18px] [&_label]:flex [&_label]:items-center [&_label]:gap-y-[14px] [&_label]:gap-x-[14px] [&_label]:text-[12px] [&_select]:max-w-[400px] max-[700.01px]:items-start max-[700.01px]:flex-col max-[700.01px]:p-[16px] max-[700.01px]:[&_label]:items-start max-[700.01px]:[&_label]:gap-y-[9px] max-[700.01px]:[&_label]:gap-x-[9px] max-[700.01px]:[&_label]:flex-col max-[700.01px]:[&_label]:w-[100%] max-[700.01px]:[&_select]:max-w-[100%] max-[700.01px]:[&_select]:w-[100%] campus-picker"
    >
      <label
        >Kampus yang ditinjau<select
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
          aria-label="Pilih kampus proposal"
          bind:value={campus}
          >{#each campuses as c}<option value={c.id}
              >{c.name} — {app.data!.proposals.some((p) => p.campusId === c.id)
                ? 'Diajukan'
                : 'Belum diunggah'}</option
            >{/each}</select
        ></label
      ><span class="text-[color:var(--muted)] text-[12px] muted"
        >{campuses.length} kampus sesuai filter</span
      >
    </div>
    {#if !campuses.length}<Empty
        title="Kampus tidak ditemukan"
        description="Ubah kata pencarian atau status proposal."
      />{:else if !campuses.some((c) => c.id === campus)}<p
        class="leading-[1.8] pt-[0px] pb-[20px] text-[#617a9a]! text-[12px] px-[22px] m-[0px] inline-hint"
      >
        Pilih kampus dari hasil filter untuk meninjau proposal.
      </p>{/if}
  </section>{/if}
{#if !isAdmin || campusId || campuses.some((c) => c.id === campus)}<div
    class="grid grid-cols-[minmax(0,_2.5fr)_minmax(240px,_1fr)] gap-y-[24px] gap-x-[24px] max-[1200.01px]:grid-cols-[1fr] proposal-grid"
  >
    <div>
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
      >
        <div
          class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
        >
          <div>
            <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
              Proposal terbaru
            </h2>
            <p class="leading-[1.8] m-[0px]">
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
              class="w-[138px] min-w-[138px] min-h-[178px] [background-image:linear-gradient(145deg,_rgb(231,_242,_255),_rgb(245,_249,_255))]! [background-color:initial]! relative text-[#2369ae]! [border-top-left-radius:5px] [border-top-right-radius:10px] [border-bottom-right-radius:10px] [border-bottom-left-radius:5px] [box-shadow:4px_4px_0_#f5f7ef] flex flex-col items-start gap-y-[9px] gap-x-[9px] p-[17px] border-[1px] border-solid border-[color:rgb(207,_226,_246)]! [&>span]:text-[7px] [&>span]:font-[800] [&>span]:tracking-[1.3px] [&>svg]:absolute [&>svg]:right-[10px] [&>svg]:top-[31px] [&>svg]:opacity-[0.13] [&>strong]:text-[13px] [&>strong]:leading-[1.5] [&>strong]:mt-[15px] [&>small]:text-[8px] max-[700.01px]:w-[110px] max-[700.01px]:min-w-[110px] max-[700.01px]:min-h-[148px] max-[700.01px]:p-[15px] max-[700.01px]:[&>strong]:text-[11px] pdf-cover"
            >
              <span>DEB PUTIH</span><Icon name="proposal" size={58} /><strong class="font-[650]"
                >PROPOSAL<br />PROGRAM</strong
              ><small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                >Versi {current.version}</small
              >
              <div
                class="h-[3px] w-[35px] [background-image:initial]! [background-color:rgb(105,_169,_227)]! mt-[auto] pdf-cover-line"
              ></div>
            </div>
            <div
              class="min-w-[0] [&_h3]:text-[18px] [&_h3]:wrap-anywhere [&_p]:text-[11px] [&_p]:text-[#8d9c80] [&_p]:mt-[10px] [&_p]:mb-[20px] [&_p]:mx-[0px] max-[700.01px]:min-w-[150px] max-[700.01px]:grow max-[700.01px]:shrink max-[700.01px]:[flex-basis:0%] max-[700.01px]:[&_h3]:text-[15px] max-[700.01px]:[&_.button-row]:gap-y-[8px] max-[700.01px]:[&_.button-row]:gap-x-[8px] max-[700.01px]:[&_.button]:text-[10px] max-[700.01px]:[&_.button]:px-[11px] max-[700.01px]:[&_.button]:py-[9px] [&>p]:text-[#617a9a]! proposal-info"
            >
              <span
                class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
                >DOKUMEN AKTIF · V{current.version}</span
              >
              <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">
                {current.filename}
              </h3>
              <p class="leading-[1.8] m-[0px]">
                {date(current.createdAt)} · {size(current.size)} · PDF
              </p>
              <div class="flex items-center gap-y-[10px] gap-x-[10px] flex-wrap button-row">
                <button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
                  disabled={fileLoading}
                  onclick={() => view(current)}><Icon name="eye" size={17} />Lihat proposal</button
                >{#if !isAdmin}<button
                    disabled={app.readOnly || app.loading || app.busy}
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
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
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden mt-[24px] [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel history-panel"
      >
        <div
          class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
        >
          <div>
            <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
              Riwayat versi
            </h2>
            <p class="leading-[1.8] m-[0px]">Setiap perubahan adalah bagian dari perjalanan.</p>
          </div>
          <span
            class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
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
                  class="w-[35px] h-[35px] [background-image:initial] [background-color:rgb(247,_250,_241)] grid items-center [justify-items:center] text-[#97ac7e] shrink-0 z-[1] border-[1px] border-solid border-[color:rgb(224,_232,_214)] rounded-[50%] version-node"
                >
                  <Icon name="proposal" size={19} />
                </div>
                <div
                  class="grow shrink [flex-basis:0%] min-w-[0] [&_.row-between>div]:flex [&_.row-between>div]:items-center [&_.row-between>div]:gap-y-[10px] [&_.row-between>div]:gap-x-[10px] [&_strong]:text-[12px] [&>small]:text-[10px] [&>small]:block [&>small]:mt-[6px] max-[700.01px]:[&_.row-between]:gap-y-[7px] max-[700.01px]:[&_.row-between]:gap-x-[7px] max-[700.01px]:[&_.text-link]:text-[10px] max-[700.01px]:[&_strong]:text-[11px] [&_p]:text-[#617a9a]! version-content"
                >
                  <div
                    class="flex items-center justify-between gap-y-[12px] gap-x-[12px] row-between"
                  >
                    <div>
                      <strong class="font-[650]">Versi {v.version}</strong>{#if index === 0}<Badge
                          tone="green">Terbaru</Badge
                        >{/if}
                    </div>
                    <button
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                      disabled={fileLoading}
                      aria-label={`Lihat proposal versi ${v.version}`}
                      onclick={() => view(v)}>Lihat PDF<Icon name="arrow" size={15} /></button
                    >
                  </div>
                  <small class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                    >{date(v.createdAt)} · {size(v.size)}</small
                  >
                  <div
                    class="[background-image:initial]! [background-color:rgb(243,_248,_255)]! mt-[12px] px-[14px] py-[12px] border-[1px] border-solid border-[color:rgb(205,_223,_242)]! rounded-[7px] [&>span]:text-[8px] [&>span]:font-[700] [&>span]:tracking-[1px] [&>span]:text-[#95a083] [&_p]:text-[11px] [&_p]:text-[#617a9a]! [&_p]:leading-[1.9] [&_p]:mt-[7px] max-[700.01px]:p-[10px] max-[700.01px]:[&>span]:text-[7px] max-[700.01px]:[&_p]:text-[10px] change-box"
                  >
                    <span
                      >{v.simulated
                        ? 'RINGKASAN PERUBAHAN · SIMULASI'
                        : 'CATATAN PERUBAHAN MANUAL'}</span
                    >
                    <p
                      class="leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere m-[0px] pre-wrap"
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
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [align-self:start] [box-shadow:0_10px_30px_#1a4d8f08] p-[26px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_p]:text-[12px] [&_p]:text-[#617a9a]! [&_p]:mt-[12px] [&_h4]:text-[12px] [&_ul]:text-[11px] [&_ul]:text-[#617a9a]! [&_ul]:leading-[2.2] [&_ul]:pl-[17px] [&_ul]:mt-[10px] [&_ul]:mb-[22px] [&_ul]:mx-[0px] max-[1200.01px]:hidden [&:hover]:border-[color:rgb(210,_226,_245)] panel guidance"
    >
      <div class="text-[#2875bd]! mb-[15px] guidance-icon"><Icon name="leaf" size={25} /></div>
      <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">
        Rencana yang terus bertumbuh.
      </h3>
      <p class="leading-[1.8] m-[0px]">
        Perbarui proposal saat ada perkembangan. Versi sebelumnya tetap tersimpan, sehingga
        perjalanan program mudah ditelusuri.
      </p>
      <div
        class="h-[1px] [background-image:initial] [background-color:var(--line)] mx-[0px] my-[24px] section-divider"
      ></div>
      <h4 class="font-[650] text-[color:var(--navy)] m-[0px]">Sebelum mengunggah</h4>
      <ul>
        <li>Gunakan dokumen berformat PDF.</li>
        <li>Ukuran file maksimal 10 MiB.</li>
        <li>Tulis ringkasan perubahan yang jelas.</li>
        <li>Gunakan dokumen simulasi untuk demo.</li>
      </ul>
      <div
        class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
      >
        <Icon name="faq" size={17} /><span
          >Catatan perubahan diisi manual. Gunakan perbandingan versi di bawah untuk meninjau
          perubahan teks PDF.</span
        >
      </div>
    </aside>
  </div>{/if}
{#if !isAdmin || campusId || campuses.some((c) => c.id === campus)}{@render comparison()}{/if}
{#if upload}<Modal
    title="Unggah versi proposal baru"
    onclose={() => {
      if (!app.busy) upload = false;
    }}
    ><form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
      onsubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label
        class="[background-image:initial]! [background-color:rgb(243,_248,_255)]! text-center items-center text-[#4376a8]! px-[18px] py-[28px] border-[1.5px] border-dashed border-[color:rgb(205,_223,_242)]! rounded-[10px] [&>span]:text-[10px] [&>span]:font-[400] [&_input]:text-[10px] [&_input]:w-[auto] [&_input]:max-w-[100%] [&_input]:p-[8px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] upload-zone"
        ><Icon name="upload" size={32} /><strong class="font-[650]">Pilih dokumen proposal</strong
        ><span>PDF · Maksimal 10 MiB</span><input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          type="file"
          aria-label="File proposal PDF"
          accept=".pdf,application/pdf"
          required
          onchange={(e) => {
            file = e.currentTarget.files?.[0] || null;
          }}
        /></label
      >{#if file}<p
          class="leading-[1.8] flex gap-y-[8px] gap-x-[8px] items-center text-[11px] wrap-anywhere pt-[0px] pb-[20px] px-[0px] m-[0px] file-selected"
        >
          <Icon name="proposal" size={18} />{file.name} · {size(file.size)}
        </p>{/if}<label
        >Catatan perubahan<textarea
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          readonly={app.readOnly}
          rows="4"
          required
          maxlength="5000"
          bind:value={changes}
          placeholder="Apa yang ditambahkan, diperbarui, atau dihapus pada versi ini?"
        ></textarea></label
      >
      <p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
        Versi lama tetap tersimpan. File disimpan di PocketBase dan hanya dapat diakses kampus
        pemilik serta Admin.
      </p>
      <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          disabled={app.busy}
          onclick={() => (upload = false)}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={app.readOnly || app.loading || app.busy}
          >{app.busy ? 'Menyimpan…' : 'Ajukan versi baru'}</button
        >
      </div>
    </form></Modal
  >{/if}
{#if preview}<Modal title={`Proposal versi ${preview.proposal.version}`} onclose={closePreview} wide
    ><div
      class="flex items-center justify-between gap-y-[12px] gap-x-[12px] mb-[18px] [&_p]:text-[11px] [&_p]:wrap-anywhere max-[700.01px]:flex-wrap row-between preview-heading"
    >
      <p class="leading-[1.8] m-[0px]">{preview.proposal.filename}</p>
      <a
        class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#075fc7] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:text-[11px] font-[650] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
        href={preview.url}
        download={preview.proposal.filename}><Icon name="download" size={16} />Unduh PDF</a
      >
    </div>
    <iframe
      class="w-[100%] h-[60vh] border-[1px] border-solid border-[color:var(--line)] rounded-[8px] pdf-preview"
      src={preview.url}
      title={`Pratinjau ${preview.proposal.filename}`}
    ></iframe>
    <p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
      Jika pratinjau tidak didukung browser, gunakan Unduh PDF.
    </p></Modal
  >{/if}
