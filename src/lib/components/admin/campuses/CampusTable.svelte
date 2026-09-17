<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { campusStats, percent } from '$lib/domain';
  const CAMPUS_REGIONS = $derived(
    [...new Set(app.data?.campuses.map((c) => c.region) || [])].sort()
  );
  import Icon from '$lib/components/ui/Icon.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  let { compact = false }: { compact?: boolean } = $props();
  let search = $state('');
  let filter = $state('all');
  let region = $state('all');
  let page = $state(1);
  const rows = $derived(
    (app.data?.campuses || [])
      .map((c) => ({ ...c, ...campusStats(app.data!, c.id) }))
      .filter(
        (c) =>
          `${c.name} ${c.acronym ?? ''} ${c.city ?? ''} ${c.region}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (region === 'all' || c.region === region) &&
          (filter === 'all' || (filter === 'revision' ? c.revisions > 0 : !c.proposal))
      )
  );
  const pages = $derived(Math.max(1, Math.ceil(rows.length / 10)));
  const visible = $derived(
    compact
      ? rows.slice(0, 5)
      : rows.slice((Math.min(page, pages) - 1) * 10, Math.min(page, pages) * 10)
  );
</script>
{#if !compact}<div
    class="flex items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:rgb(237,_241,_232)] [&&]:flex-wrap px-[22px] py-[19px] max-[700.01px]:[&&]:gap-y-[12px] max-[700.01px]:[&&]:gap-x-[12px] max-[700.01px]:p-[16px] max-[700.01px]:[&_.search-field]:[flex-basis:100%] max-[700.01px]:[&_select]:grow max-[700.01px]:[&_select]:shrink max-[700.01px]:[&_select]:[flex-basis:0%] max-[700.01px]:[&_select]:max-w-[100%] max-[700.01px]:[&_select]:min-w-[0] toolbar"
  >
    <div
      class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
    >
      <Icon name="search" size={18} /><input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        aria-label="Cari kampus"
        placeholder="Cari nama kampus…"
        bind:value={search}
        oninput={() => (page = 1)}
      />
    </div>
    <select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:max-w-[260px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] max-[700.01px]:[&&]:max-w-[100%]"
      aria-label="Filter kampus"
      bind:value={filter}
      onchange={() => (page = 1)}
      ><option value="all">Semua status</option><option value="revision">Perlu tindak lanjut</option
      ><option value="missing">Belum ada proposal</option></select
    ><select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:max-w-[260px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] max-[700.01px]:[&&]:max-w-[100%]"
      aria-label="Filter wilayah kampus"
      bind:value={region}
      onchange={() => (page = 1)}
      ><option value="all">Semua wilayah</option>{#each CAMPUS_REGIONS as area}<option value={area}
          >{area}</option
        >{/each}</select
    ><span class="text-[color:var(--muted)] text-[12px] muted">{rows.length} kampus</span>
  </div>{/if}
{#if !visible.length}<Empty
    title="Kampus tidak ditemukan"
    description="Coba kata pencarian atau filter lainnya."
  />{:else}<div class="overflow-x-auto max-w-[100%] relative table-scroll">
    <table
      class="border-collapse w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap]"
    >
      <thead
        ><tr
          ><th
            class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
            >KAMPUS MITRA</th
          ><th
            class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
            >PROGRES DEB</th
          ><th
            class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
            >PROPOSAL</th
          ><th
            class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
            >STATUS</th
          ><th
            class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
            ><span
              class="absolute w-[1px] h-[1px] overflow-x-hidden overflow-y-hidden [clip:rect(0,_0,_0,_0)] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] m-[-1px] border-[0px] border-none border-[color:currentcolor] sr-only"
              >Detail</span
            ></th
          ></tr
        ></thead
      ><tbody
        class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
        >{#each visible as row}<tr
            ><td
              class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
              ><a
                class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] flex items-center gap-y-[10px] gap-x-[10px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&_strong]:text-[12px] [&_small]:block [&_small]:text-[10px] [&_small]:text-[#778669] campus-name"
                href={`/admin/campuses/${row.id}`}
                ><span
                  class={[
                    'grid items-center [justify-items:center] w-[31px] h-[31px] [background-image:initial] [background-color:rgb(233,_243,_255)] text-[#176ac3] text-[9px] font-[650] shrink-0 border-[1px] border-solid border-[color:rgb(211,_230,_251)] rounded-[8px] table-avatar',
                    row.initials.length > 4 ? 'text-[9px]!' : undefined
                  ]}>{row.initials}</span
                ><span
                  ><strong class="font-[650]">{row.name}</strong><small
                    class="text-[11px] text-[color:var(--muted)] leading-[1.7]"
                    >{row.acronym}{#if row.city}
                      · {row.city}{/if}<br />{row.region}</small
                  ></span
                ></a
              ></td
            ><td
              class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] min-w-[135px] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)] progress-cell"
              ><Progress value={row.progress} showValue /></td
            ><td
              class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
              ><Badge tone={row.proposal ? 'green' : 'neutral'}
                >{row.proposal ? 'Diajukan' : 'Belum diunggah'}</Badge
              ></td
            ><td
              class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
              >{#if row.revisions}<Badge tone="amber">Perlu tindak lanjut</Badge>{:else}<span
                  class="text-[color:var(--muted)] text-[12px] muted"
                  >{row.progress >= 100 ? 'Tercapai' : 'Dalam proses'}</span
                >{/if}</td
            ><td
              class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
              ><a
                class="[-webkit-tap-highlight-color:transparent] text-[#53739c] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
                href={`/admin/campuses/${row.id}`}
                aria-label={`Lihat ${row.name}, progres ${percent(row.progress)}`}
                ><Icon name="chevron" size={18} /></a
              ></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>{/if}
{#if !compact && rows.length}<div
    class="[border-top-width:1px] [border-top-style:solid] [border-top-color:var(--line)] flex items-center justify-between gap-y-[16px] gap-x-[16px] text-[#8e9c80] text-[10px] px-[22px] py-[17px] [&>div]:flex [&>div]:items-center [&>div]:gap-y-[12px] [&>div]:gap-x-[12px] max-[700.01px]:flex-col max-[700.01px]:p-[14px] max-[700.01px]:[&>div]:w-[100%] max-[700.01px]:[&>div]:justify-between pagination"
  >
    <span
      >Menampilkan {Math.min((Math.min(page, pages) - 1) * 10 + 1, rows.length)}–{Math.min(
        Math.min(page, pages) * 10,
        rows.length
      )} dari {rows.length} kampus</span
    >
    <div>
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
        disabled={page <= 1}
        onclick={() => page--}>Sebelumnya</button
      ><span>{Math.min(page, pages)} / {pages}</span><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
        disabled={page >= pages}
        onclick={() => page++}>Berikutnya</button
      >
    </div>
  </div>{/if}
