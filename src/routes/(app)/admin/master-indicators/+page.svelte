<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte';
  import { periodsFrom } from '$lib/periods';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { DefinitionInput, MasterData, MasterDefinition } from '$lib/types';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import MasterAudit from '$lib/components/admin/indicators/MasterAudit.svelte';
  let data = $state<MasterData>({ definitions: [] });
  let loading = $state(true),
    error = $state(''),
    search = $state('');
  let editing = $state<DefinitionInput | null>(null);
  let targetText = $state('');
  let confirmation = $state<{ record: MasterDefinition; action: 'activate' | 'delete' } | null>(
    null
  );
  let generation = 0;
  let selectedPeriod = $state<string | undefined>(undefined);
  let creatingPeriod = $state(false);
  let periodName = $state('');
  let openingPeriod = $state(false);
  const periods = $derived(periodsFrom(data.definitions));
  const chosen = $derived(
    periods.find((p) => p.id === selectedPeriod) || periods.find((p) => p.state === 'active')
  );
  const archived = $derived(chosen?.state === 'archived');
  const pending = $derived(app.navigation.pendingCount);
  const reviewBlocked = $derived(chosen?.state !== 'draft' && pending > 0);
  const disabled = $derived(app.busy || app.loading || loading);
  const filtered = $derived(
    data.definitions.filter(
      (d) =>
        (d.period || '') === (chosen?.id || '') &&
        `${d.code} ${d.name} ${d.category}`.toLowerCase().includes(search.toLowerCase())
    )
  );
  async function refresh() {
    const version = ++generation;
    loading = true;
    error = '';
    try {
      const result = await dataService.masters();
      if (version === generation) data = result;
    } catch (e) {
      if (version === generation)
        error = e instanceof Error ? e.message : 'Master belum dapat dimuat.';
    } finally {
      if (version === generation) loading = false;
    }
  }
  $effect(() => {
    app.loadedAt;
    untrack(() => void refresh());
    return () => {
      generation++;
    };
  });
  function edit(record?: MasterDefinition) {
    app.error = '';
    app.toast = '';
    editing = record
      ? {
          id: record.id,
          revision: record.revision,
          period: record.period || '',
          code: record.code,
          name: record.name,
          category: record.category,
          unit: record.unit,
          description: record.description,
          baseline: record.baseline,
          target: record.target
        }
      : {
          period: chosen?.id || '',
          code: '',
          name: '',
          category: '',
          unit: '',
          description: '',
          baseline: 0,
        target: 1
        };
    targetText = formatRupiah(editing.target);
  }
  const formatRupiah = (value: number) =>
    `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)}`;
  function editRupiahTarget(event: Event) {
    if (!editing) return;
    editing.target = Number((event.currentTarget as HTMLInputElement).value.replace(/\D/g, '')) || 0;
    targetText = formatRupiah(editing.target);
  }
  async function save() {
    if (!editing) return;
    const input = { ...editing };
    if (await app.mutate(() => dataService.saveDefinition(input), 'Master indikator tersimpan.'))
      editing = null;
  }
  async function confirm() {
    if (!confirmation) return;
    const { record, action } = confirmation;
    if (
      await app.mutate(
        () =>
          action === 'activate'
            ? dataService.activateDefinition(record.id, record.revision)
            : dataService.deleteDefinition(record.id, record.revision),
        action === 'activate' ? 'Indikator aktif untuk seluruh kampus.' : 'Draft indikator dihapus.'
      )
    )
      confirmation = null;
  }
</script>
<svelte:head><title>Master indikator · Digitalisasi DEB</title></svelte:head>

<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >PENGATURAN BERSAMA</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Master indikator
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Kelola periode penilaian dan katalog indikator. Target diatur pada masing-masing kampus.
    </p>
  </div>
  <button
    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
    disabled={disabled || archived}
    onclick={() => edit()}>Tambah indikator</button
  >
</div>
<section
  class="[&&]:[background-image:linear-gradient(120deg,_rgb(255,_255,_255),_rgb(243,_250,_255))] [&&]:[background-color:initial] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:mb-[20px] [&&]:px-[24px] [&&]:py-[22px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[700.01px]:[&&]:p-[16px] panel period-management"
  aria-label="Pengaturan periode"
>
  <div
    class="[&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mb-[22px] max-[700.01px]:[&&]:gap-y-[10px] max-[700.01px]:[&&]:gap-x-[10px] max-[700.01px]:[&&]:flex-wrap period-heading"
  >
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[44px] [&&]:h-[44px] [&&]:[background-image:initial] [&&]:[background-color:rgb(230,_243,_255)] [&&]:text-[#087dba] [&&]:shrink-0 [&&]:rounded-[12px] period-symbol"
      ><Icon name="clock" size={22} /></span
    >
    <div
      class="max-[700.01px]:[&&]:grow max-[700.01px]:[&&]:shrink max-[700.01px]:[&&]:[flex-basis:0%] max-[700.01px]:[&&]:min-w-[160px]"
    >
      <h2
        class="[&&]:mt-[0px] [&&]:mb-[4px] font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] [&&]:mx-[0px]"
      >
        Periode penilaian
      </h2>
      <p class="[&&]:leading-[1.6] [&&]:text-[#71869f] [&&]:text-[12px] [&&]:m-[0px]">
        Siapkan periode berikutnya tanpa mengubah riwayat kampus.
      </p>
    </div>
    <span
      class="[&&]:ml-[auto] [&&]:text-[10px] [&&]:font-[650] [&&]:[background-image:initial] [&&]:[background-color:rgb(229,_247,_238)] [&&]:text-[#287154] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] [&&]:px-[10px] [&&]:py-[6px] [&&]:rounded-[20px] [&.draft]:[background-image:initial] [&.draft]:[background-color:rgb(255,_242,_214)] [&.draft]:text-[#966313] [&.archived]:[background-image:initial] [&.archived]:[background-color:rgb(237,_241,_247)] [&.archived]:text-[#687b95] max-[700.01px]:[&&]:ml-[0] period-badge"
      class:draft={chosen?.state === 'draft'}
      class:archived
      >{chosen?.state === 'draft' ? 'Persiapan' : archived ? 'Arsip' : 'Sedang berjalan'}</span
    >
  </div>
  <div
    class="[&&]:flex [&&]:items-end [&&]:justify-between [&&]:gap-y-[20px] [&&]:gap-x-[20px] max-[700.01px]:[&&]:items-stretch max-[700.01px]:[&&]:gap-y-[14px] max-[700.01px]:[&&]:gap-x-[14px] max-[700.01px]:[&&]:flex-col period-controls"
  >
    <label
      class="[&&]:grid [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:max-w-[400px] [&&]:text-[11px] [&&]:font-[600] [&&]:text-[#59718c] max-[700.01px]:[&&]:max-w-[none]"
      >Pilih periode<select
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] text-[#17365f] max-w-[290px] min-h-[37px] [&&]:w-[100%] px-[12px] py-[11px] [&&]:m-[0px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
        aria-label="Kelola periode"
        value={chosen?.id ?? ''}
        onchange={(event) => (selectedPeriod = event.currentTarget.value)}
        {disabled}
      >
        {#each periods as period}<option value={period.id}
            >{period.name} · {period.state === 'active'
              ? 'Aktif'
              : period.state === 'draft'
                ? 'Draft'
                : 'Arsip'}</option
          >{/each}
      </select></label
    >
    <div
      class="flex flex-wrap items-center gap-y-[8px] gap-x-[8px] max-[600.01px]:[&_.button]:[white-space-collapse:collapse] max-[600.01px]:[&_.button]:[text-wrap-mode:wrap] max-[700.01px]:[&&&]:flex-wrap master-actions"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        disabled={disabled || periods.some((p) => p.state === 'draft')}
        onclick={() => {
          periodName = '';
          creatingPeriod = true;
        }}>Periode baru</button
      >
      {#if chosen?.state === 'draft'}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={disabled || pending > 0}
          onclick={() => (openingPeriod = true)}>Buka periode</button
        >{/if}
    </div>
  </div>
  <p
    class="[&&]:mt-[18px] [&&]:mb-[0px] [&&]:leading-[1.7] [&&]:pt-[14px] [&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(223,_234,_245)] [&&]:text-[12px] [&&]:text-[#6e849e] [&&]:mx-[0px] period-help"
  >
    {archived
      ? 'Arsip hanya dapat dibaca. Indikator dan hasil periode ini tetap dipertahankan.'
      : chosen?.state === 'draft'
        ? 'Sesuaikan indikator, baseline, dan target sebelum membuka periode untuk kampus.'
        : 'Periode aktif digunakan untuk pengisian dan verifikasi kampus.'}
  </p>
</section>
<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] px-[24px] py-[20px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:mt-[8px] [&_p]:text-[#536b8b] panel master-intro"
>
  <strong class="font-[650]">Aktual, baseline, dan target tetap milik masing-masing kampus.</strong>
  <p class="leading-[1.8] m-[0px]">
    Siapkan indikator sebagai draft, lalu aktifkan untuk seluruh kampus. Target kampus disesuaikan
    admin pada detail kampus.
  </p>
  {#if pending}<p
      class="leading-[1.8] [background-image:initial] [background-color:rgb(255,_246,_223)] p-[12px] m-[0px] rounded-[8px] pending-note"
    >
      {pending} pengajuan pending. Aktivasi dan perubahan indikator aktif dikunci sampai review selesai.
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] text-[12px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
        href="/admin/verifikasi">Buka Review Kampus →</a
      >
    </p>{/if}
</section>
{#if error}<div
    class="[background-image:initial] [background-color:rgb(255,_241,_236)] mt-[16px] p-[16px] rounded-[10px] master-error"
    role="alert"
  >
    {error}
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
      onclick={refresh}>Coba lagi</button
    >
  </div>{/if}
<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] mt-[22px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&_.panel-heading]:flex-col max-[600.01px]:[&_.panel-heading]:items-stretch panel master-panel"
>
  <div
    class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
  >
    <div>
      <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
        Katalog bersama
      </h2>
      <p class="leading-[1.8] m-[0px]">
        {data.definitions.filter(
          (d) => (d.period || '') === (chosen?.id || '') && d.status === 'active'
        ).length} aktif · {data.definitions.filter(
          (d) => (d.period || '') === (chosen?.id || '') && d.status === 'draft'
        ).length} draft
      </p>
    </div>
    <label
      class="grid gap-y-[7px] gap-x-[7px] text-[12px] font-[600] min-w-[180px] [&_input]:w-[100%] [&_input]:min-w-[0] search-label"
      >Cari indikator<input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        type="search"
        bind:value={search}
        placeholder="Kode, nama, atau kategori"
      /></label
    >
  </div>
  {#if loading}<p class="leading-[1.8] px-[24px] py-[20px] m-[0px] master-padding" role="status">
      Memuat master…
    </p>{:else if !filtered.length}<Empty
      title="Tidak ada indikator"
      description="Tambahkan draft atau ubah kata pencarian."
    />{:else}<div class="overflow-x-auto master-table-wrap">
      <table
        class="border-collapse w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap] text-[12px] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:rgb(227,_235,_245)] [&_th]:[background-image:initial] [&_th]:[background-color:rgb(246,_249,_253)] [&_th]:text-[#566e90] [&_th]:px-[20px] [&_th]:py-[16px] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:rgb(227,_235,_245)] [&_td]:px-[20px] [&_td]:py-[16px] [&_small]:block [&_small]:mt-[6px] [&_small]:text-[#637a98] max-[600.01px]:[&_th]:p-[12px] max-[600.01px]:[&_td]:p-[12px] max-[600.01px]:min-w-[620px] master-table"
      >
        <thead
          ><tr
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >Indikator</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >Baseline</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >Target</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >Status</th
            ><th
              class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
              >Aksi</th
            ></tr
          ></thead
        ><tbody
          class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
          >{#each filtered as d (d.id)}<tr
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><strong class="font-[650]">{d.name}</strong><small
                  class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                  >{d.code} · {d.category} · {d.unit}</small
                ></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                >{d.baseline}</td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                >{d.target}</td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><span
                  class:active={d.status === 'active'}
                  class="[background-image:initial] [background-color:rgb(255,_243,_216)] text-[#805f20] text-[10px] px-[9px] py-[5px] rounded-[20px] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(230,_241,_255)] [&.active]:text-[#185faa] master-status"
                  >{d.status === 'active' ? 'Aktif' : 'Draft'}</span
                ></td
              ><td
                class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                ><div
                  class="flex flex-wrap items-center gap-y-[8px] gap-x-[8px] max-[600.01px]:[&_.button]:[white-space-collapse:collapse] max-[600.01px]:[&_.button]:[text-wrap-mode:wrap] master-actions"
                >
                  <button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
                    disabled={disabled || archived || (d.status === 'active' && reviewBlocked)}
                    onclick={() => edit(d)}>Edit</button
                  >{#if d.status === 'draft'}<button
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button small"
                      disabled={disabled || archived || reviewBlocked}
                      onclick={() => {
                        app.error = '';
                        confirmation = { record: d, action: 'activate' };
                      }}>Aktifkan</button
                    >{/if}<button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small danger-text"
                    disabled={disabled || archived}
                    onclick={() => {
                      app.error = '';
                      confirmation = { record: d, action: 'delete' };
                    }}>Hapus</button
                  >
                </div></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>{/if}
</section>
<MasterAudit />
{#if creatingPeriod}<Modal
    title="Buat draft periode baru"
    onclose={() => {
      if (!app.busy) creatingPeriod = false;
    }}
  >
    <form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
      onsubmit={async (event) => {
        event.preventDefault();
        if (
          await app.mutate(
            () => dataService.createPeriod(periodName.trim()),
            'Draft periode dibuat. Sesuaikan indikator sebelum membuka.'
          )
        ) {
          selectedPeriod = periodName.trim();
          creatingPeriod = false;
        }
      }}
    >
      <label
        >Nama periode<input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          required
          maxlength="80"
          bind:value={periodName}
          placeholder="Contoh: Semester I 2027"
        /></label
      >
      <p class="leading-[1.8] m-[0px]">
        Indikator aktif, baseline, dan target disalin dari periode aktif. Nilai capaian kampus tidak
        disalin.
      </p>
      <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          disabled={app.busy}
          onclick={() => (creatingPeriod = false)}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={app.busy}>Buat draft periode</button
        >
      </div>
    </form>
  </Modal>{/if}
{#if openingPeriod && chosen}<Modal
    title="Buka periode baru?"
    onclose={() => {
      if (!app.busy) openingPeriod = false;
    }}
  >
    <p class="leading-[1.8] m-[0px]">
      Periode <strong class="font-[650]">{chosen.name}</strong> akan dibuka. Periode aktif sebelumnya
      menjadi arsip baca saja. Kampus mulai mengisi capaian dan catatan baru.
    </p>
    <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        disabled={app.busy}
        onclick={() => (openingPeriod = false)}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        disabled={app.busy || pending > 0}
        onclick={async () => {
          if (
            await app.mutate(
              () => dataService.openPeriod(chosen!.id),
              'Periode baru dibuka. Data sebelumnya tersimpan sebagai arsip.'
            )
          )
            openingPeriod = false;
        }}>Ya, buka periode</button
      >
    </div>
  </Modal>{/if}

{#if editing}<Modal
    title={editing.id ? 'Edit indikator bersama' : 'Tambah draft indikator'}
    onclose={() => {
      if (!app.busy) editing = null;
    }}
    ><form
      class="[&_label]:grid [&_label]:flex-col [&_label]:gap-y-[7px] [&_label]:gap-x-[7px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_input]:min-w-[0] [&_textarea]:w-[100%] [&_textarea]:min-w-[0] grid gap-y-[16px] gap-x-[16px] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-[#627691] [&_.master-checkbox]:flex [&_.master-checkbox]:items-center master-form"
      onsubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label
        >Kode indikator<input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          required
          maxlength="100"
          bind:value={editing.code}
        /></label
      ><label
        >Nama indikator<input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          required
          maxlength="200"
          bind:value={editing.name}
        /></label
      >
      <div
        class="grid grid-cols-[1fr_1fr] gap-y-[14px] gap-x-[14px] max-[600.01px]:grid-cols-[1fr] master-form-grid"
      >
        <label
          >Kategori<input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            required
            maxlength="200"
            bind:value={editing.category}
          /></label
        ><label
          >Satuan<input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            required
            maxlength="200"
            bind:value={editing.unit}
          /></label
        ><label
          >Baseline bersama<input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            type="number"
            min="0"
            step="any"
            required
            bind:value={editing.baseline}
          /></label
        ><label
          >Target default kampus baru{#if editing.unit.includes('Rp')}<input
            class="font-[inherit] text-[12px] [background-color:white] text-[#17365f] px-[12px] py-[11px] border border-[color:rgb(212,_225,_241)] rounded-[7px] focus:outline-[#7fc1ff]"
            inputmode="numeric"
            required
            value={targetText}
            oninput={editRupiahTarget}
          />{:else}<input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
            type="number"
            min="0.000000001"
            step="any"
            required
            bind:value={editing.target}
          />{/if}</label
        >
      </div>
      <label
        >Deskripsi<textarea
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          maxlength="5000"
          rows="3"
          bind:value={editing.description}></textarea></label
      >
      <p class="leading-[1.8] m-[0px]">
        Nilai ini hanya menjadi default saat indikator baru dibuat. Target kampus diatur terpisah oleh admin.
      </p>
      <div
        class="flex flex-wrap items-center gap-y-[8px] gap-x-[8px] max-[600.01px]:[&_.button]:[white-space-collapse:collapse] max-[600.01px]:[&_.button]:[text-wrap-mode:wrap] master-actions"
      >
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          disabled={app.busy}
          onclick={() => (editing = null)}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          {disabled}>Simpan indikator</button
        >
      </div>
    </form></Modal
  >{/if}
{#if confirmation}<Modal
    title={confirmation.action === 'activate'
      ? 'Aktifkan untuk seluruh kampus?'
      : 'Hapus indikator?'}
    onclose={() => {
      if (!app.busy) confirmation = null;
    }}
    ><p class="leading-[1.8] m-[0px]">
      <strong class="font-[650]">{confirmation.record.name}</strong>
    </p>
    <p class="leading-[1.8] m-[0px]">
      {confirmation.action === 'activate'
        ? `Indikator ini menjadi kewajiban seluruh ${app.data?.campuses.length || 0} kampus. Kampus perlu mengisi nilai aktual; baseline dan target mengikuti master.`
        : 'Hanya indikator tanpa isian atau riwayat terkait yang dapat dihapus. Riwayat audit tetap disimpan.'}
    </p>
    <div
      class="flex flex-wrap items-center gap-y-[8px] gap-x-[8px] max-[600.01px]:[&_.button]:[white-space-collapse:collapse] max-[600.01px]:[&_.button]:[text-wrap-mode:wrap] master-actions"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        disabled={app.busy}
        onclick={() => (confirmation = null)}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        {disabled}
        onclick={confirm}
        >{confirmation.action === 'activate' ? 'Aktifkan indikator' : 'Hapus indikator'}</button
      >
    </div></Modal
  >{/if}
