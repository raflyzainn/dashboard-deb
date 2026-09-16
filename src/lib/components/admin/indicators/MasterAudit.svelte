<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { auditOperations, auditFields } from '$lib/master-audit';
  import type { MasterAuditPage } from '$lib/types';
  import Empty from '$lib/components/ui/Empty.svelte';
  let query = $state(''),
    pageNumber = $state(1),
    retry = $state(0);
  let loading = $state(true),
    error = $state('');
  let result = $state<MasterAuditPage>({ items: [], page: 1, totalItems: 0, totalPages: 0 });
  let generation = 0;
  const display = (value: unknown) =>
    value === null || value === undefined
      ? '—'
      : typeof value === 'boolean'
        ? value
          ? 'Ya'
          : 'Tidak'
        : String(value);
  async function load(term: string, page: number, version: number) {
    try {
      const response = await dataService.masterAudit(term, page);
      if (version !== generation) return;
      const lastPage = Math.max(1, response.totalPages);
      if (page > lastPage) {
        pageNumber = lastPage;
        return;
      }
      result = response;
    } catch (e) {
      if (version === generation)
        error = e instanceof Error ? e.message : 'Riwayat belum dapat dimuat.';
    } finally {
      if (version === generation) loading = false;
    }
  }
  $effect(() => {
    const term = query.trim(),
      page = pageNumber;
    app.loadedAt;
    retry;
    const version = ++generation;
    loading = true;
    error = '';
    const timer = setTimeout(() => void load(term, page, version), 250);
    return () => {
      clearTimeout(timer);
      generation++;
    };
  });
</script>

<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] mt-[22px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&_.panel-heading]:flex-col max-[600.01px]:[&_.panel-heading]:items-stretch panel master-panel"
  aria-label="Riwayat perubahan master"
>
  <div
    class="pt-[22px] pb-[18px] flex items-center justify-between gap-y-[18px] gap-x-[18px] px-[23px] [&_h2]:text-[15px] [&_h2]:font-[700] [&_p]:text-[11px] [&_p]:text-[#71816a] [&_p]:mt-[5px] max-[700.01px]:items-start max-[700.01px]:gap-y-[10px] max-[700.01px]:gap-x-[10px] max-[700.01px]:px-[17px] max-[700.01px]:py-[20px] max-[700.01px]:[&_h2]:text-[14px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.text-link]:text-[9px] panel-heading"
  >
    <div>
      <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
        Riwayat perubahan master
      </h2>
      <p class="leading-[1.8] m-[0px]">
        Telusuri seluruh riwayat, termasuk perubahan yang sudah lama.
      </p>
    </div>
    <label
      class="grid gap-y-[7px] gap-x-[7px] text-[12px] font-[600] min-w-[180px] [&&]:w-[min(100%,_340px)] [&_input]:w-[100%] [&_input]:min-w-[0] search-label audit-search"
      >Cari perubahan master<input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        type="search"
        maxlength="200"
        bind:value={query}
        oninput={() => (pageNumber = 1)}
        placeholder="Nama, kode, isi, atau jenis perubahan"
      /></label
    >
  </div>
  <div aria-busy={loading}>
    {#if loading}<p class="leading-[1.8] px-[24px] py-[20px] m-[0px] master-padding" role="status">
        Mencari riwayat perubahan…
      </p>
    {:else if error}<div
        class="[background-image:initial] [background-color:rgb(255,_241,_236)] mt-[16px] p-[16px] rounded-[10px] master-error"
        role="alert"
      >
        {error}
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
          onclick={() => retry++}>Coba lagi</button
        >
      </div>
    {:else if !result.items.length}<Empty
        title={query.trim() ? 'Tidak ada perubahan yang cocok' : 'Belum ada perubahan master'}
        description={query.trim()
          ? 'Coba nama, kode, isi perubahan, atau kata seperti hapus indikator.'
          : 'Perubahan oleh Admin akan tercatat di sini.'}
      />
    {:else}
      <p
        class="leading-[1.8] [&&]:pt-[0px] [&&]:pb-[14px] [&&]:text-[#627691] [&&]:text-[12px] [&&]:wrap-anywhere [&&]:px-[24px] m-[0px] audit-count"
        role="status"
      >
        {result.totalItems} perubahan{query.trim() ? ` untuk “${query.trim()}”` : ''} · Halaman {result.page}
        dari {Math.max(1, result.totalPages)}
      </p>
      <div
        class="pt-[0px] pb-[20px] px-[24px] [&_details]:[border-top-width:1px] [&_details]:[border-top-style:solid] [&_details]:[border-top-color:rgb(227,_235,_245)] [&_details]:px-[0px] [&_details]:py-[14px] [&_summary]:cursor-pointer [&_summary]:text-[12px] [&_summary]:leading-[1.8] [&_summary_span]:block [&_summary_span]:text-[#6c7f99] [&_p]:text-[11px] [&_p]:mx-[0px] [&_p]:my-[10px] audit-list"
      >
        {#each result.items as item (item.id)}<details>
            <summary
              class="[&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
              ><strong class="font-[650]"
                >{String(item.after?.name || item.before?.name || item.entityId)}</strong
              ><span
                >{auditOperations[item.operation] || 'Perubahan master'} · {new Date(
                  item.created
                ).toLocaleString('id-ID')}</span
              ></summary
            >
            <p class="leading-[1.8] m-[0px]">
              Pelaku: {item.actor === app.session?.id ? 'Anda' : 'Admin lain'}
            </p>
            <div class="overflow-x-auto master-table-wrap">
              <table
                class="border-collapse w-[100%] text-left [white-space-collapse:collapse] [text-wrap-mode:nowrap] text-[12px] [&_th]:[border-bottom-width:1px] [&_th]:[border-bottom-style:solid] [&_th]:[border-bottom-color:rgb(227,_235,_245)] [&_th]:[background-image:initial] [&_th]:[background-color:rgb(246,_249,_253)] [&_th]:text-[#566e90] [&_th]:px-[20px] [&_th]:py-[16px] [&_td]:[border-bottom-width:1px] [&_td]:[border-bottom-style:solid] [&_td]:[border-bottom-color:rgb(227,_235,_245)] [&_td]:px-[20px] [&_td]:py-[16px] [&_small]:block [&_small]:mt-[6px] [&_small]:text-[#637a98] max-[600.01px]:[&_th]:p-[12px] max-[600.01px]:[&_td]:p-[12px] max-[600.01px]:min-w-[620px] master-table"
              >
                <thead
                  ><tr
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Field</th
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Sebelum</th
                    ><th
                      class="text-[9px] font-[650] tracking-[0.7px] [background-image:initial] [background-color:rgb(245,_249,_255)] text-[#68809f] [border-top-width:1px] [border-bottom-width:1px] [border-top-style:solid] [border-bottom-style:solid] px-[20px] py-[12px] border-[color:rgb(226,_236,_248)]"
                      >Sesudah</th
                    ></tr
                  ></thead
                ><tbody
                  class="[&_tr:last-child_td]:[border-bottom-width:0px] [&_tr:last-child_td]:[border-bottom-style:none] [&_tr:last-child_td]:[border-bottom-color:currentcolor] [&_tr:hover]:[background-image:initial] [&_tr:hover]:[background-color:rgb(247,_251,_255)]"
                  >{#each Object.keys(auditFields).filter((key) => item.before?.[key] !== item.after?.[key]) as key}<tr
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                        >{auditFields[key]}</td
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                        >{display(item.before?.[key])}</td
                      ><td
                        class="[border-bottom-width:1px] [border-bottom-style:solid] text-[12px] text-[#405e82] px-[20px] py-[15px] border-[color:rgb(232,_239,_248)]"
                        >{display(item.after?.[key])}</td
                      ></tr
                    >{/each}</tbody
                >
              </table>
            </div>
          </details>{/each}
      </div>
    {/if}
  </div>
  {#if !error && result.totalPages > 1}<nav
      class="[&&]:flex [&&]:justify-end [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:pt-[0px] [&&]:pb-[20px] [&&]:px-[24px] audit-pagination"
      aria-label="Halaman riwayat master"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
        disabled={loading || pageNumber <= 1}
        onclick={() => pageNumber--}>Sebelumnya</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
        disabled={loading || pageNumber >= result.totalPages}
        onclick={() => pageNumber++}>Berikutnya</button
      >
    </nav>{/if}
</section>
