<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { FaqEntry } from '$lib/types';
  import Icon from '$lib/components/Icon.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
  let search = $state('');
  let editing = $state(false);
  let editId = $state<string | undefined>();
  let question = $state('');
  let answer = $state('');
  let removing = $state<FaqEntry | null>(null);
  const isAdmin = $derived(app.session?.role === 'admin');
  const all = $derived([...app.data!.faq].sort((a, b) => a.order - b.order));
  const entries = $derived(
    all.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(search.toLowerCase()))
  );
  function edit(entry?: FaqEntry) {
    editId = entry?.id;
    question = entry?.question || '';
    answer = entry?.answer || '';
    editing = true;
  }
  async function save() {
    if (
      await app.mutate(
        () => dataService.saveFaq({ id: editId, question, answer }),
        'FAQ berhasil disimpan.'
      )
    )
      editing = false;
  }
</script>
<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >PUSAT BANTUAN</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Jawaban untuk langkah Anda.
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Temukan panduan singkat seputar indikator, proposal, dan ruang kerja DEB.
    </p>
  </div>
  {#if isAdmin}<button
      disabled={app.readOnly || app.loading || app.busy}
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
      onclick={() => edit()}><Icon name="plus" size={18} />Tambah FAQ</button
    >{/if}
</div>
<section
  class="text-center [background-image:linear-gradient(135deg,_rgb(237,_246,_255),_rgb(248,_251,_255))]! [background-color:initial]! pt-[30px] pb-[35px] px-[25px] border-[1px] border-solid border-[color:rgb(213,_231,_251)]! rounded-[12px] [&_h2]:text-[25px] [&_h2]:text-[#174b89]! [&_p]:text-[12px] [&_p]:text-[#6680a2]! [&_p]:mt-[10px] [&_p]:mb-[20px] [&_p]:mx-[0px] [&_.search-field]:max-w-[560px] [&_.search-field]:mx-[auto] [&_.search-field]:my-[0px] [&_.search-field_input]:text-[12px] [&_.search-field_input]:p-[14px] max-[700.01px]:px-[17px] max-[700.01px]:py-[25px] max-[700.01px]:[&_h2]:text-[22px] max-[700.01px]:[&_p]:text-[11px] max-[700.01px]:[&_.search-field_input]:text-[10px] max-[700.01px]:[&_.search-field_input]:px-[5px] max-[700.01px]:[&_.search-field_input]:py-[12px] faq-header"
>
  <div
    class="text-[#1777ce]! mt-[0px] mb-[14px] w-[58px] h-[58px] [background-image:initial] [background-color:rgba(255,_255,_255,_0.65)] grid items-center [justify-items:center] mx-[auto] border-[color:rgb(213,_231,_251)]! rounded-[14px] faq-header-icon"
  >
    <Icon name="faq" size={36} />
  </div>
  <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
    Apa yang ingin Anda ketahui?
  </h2>
  <p class="leading-[1.8] m-[0px]">Pengetahuan bersama yang dikurasi oleh Admin PF.</p>
  <div
    class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] grow shrink [flex-basis:0%] min-w-[200px] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
  >
    <Icon name="search" size={20} /><input
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
      aria-label="Cari FAQ"
      bind:value={search}
      placeholder="Cari jawaban, misalnya cara mengunggah proposal…"
    />
  </div>
</section>
<div class="max-w-[900px] mx-[auto] my-[32px] faq-content">
  <div
    class="flex items-center justify-between gap-y-[12px] gap-x-[12px] mb-[20px] [&_h2]:text-[15px] max-[700.01px]:[&_h2]:text-[12px] row-between faq-count"
  >
    <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
      Pertanyaan yang sering ditanyakan
    </h2>
    <span
      class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
      >{entries.length} panduan</span
    >
  </div>
  {#if entries.length}<div class="grid gap-y-[13px] gap-x-[13px] faq-list">
      {#each entries as f (f.id)}<div
          class="[background-image:initial] [background-color:white] overflow-x-hidden overflow-y-hidden border-[1px] border-solid border-[color:rgb(220,_231,_245)] rounded-[9px] [&_summary]:flex [&_summary]:justify-between [&_summary]:gap-y-[15px] [&_summary]:gap-x-[15px] [&_summary]:items-center [&_summary]:cursor-pointer [&_summary]:text-[13px] [&_summary]:font-[650] [&_summary]:text-[#244f84] [&_summary]:[list-style-position:initial] [&_summary]:[list-style-image:initial] [&_summary]:[list-style-type:none] [&_summary]:p-[22px] [&_summary::-webkit-details-marker]:hidden [&_summary>svg]:text-[#9aaf83] [&_details[open]_summary>svg]:[transform:rotate(45deg)] max-[700.01px]:[&_summary]:text-[12px] max-[700.01px]:[&_summary]:leading-[1.7] max-[700.01px]:[&_summary]:px-[17px] max-[700.01px]:[&_summary]:py-[20px] faq-entry"
        >
          <details>
            <summary
              class="[&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
              ><span>{f.question}</span><Icon name="plus" size={20} /></summary
            >
            <div
              class="[white-space-collapse:preserve] [text-wrap-mode:wrap] wrap-anywhere pt-[0px] pb-[23px] text-[12px] leading-[1.95] text-[#5d7697] px-[22px] max-[700.01px]:pt-[0px] max-[700.01px]:pb-[20px] max-[700.01px]:text-[11px] max-[700.01px]:px-[17px] faq-answer pre-wrap"
            >
              {f.answer}
            </div>
          </details>
          {#if isAdmin}<div
              class="[border-top-width:1px] [border-top-style:solid] [border-top-color:rgb(237,_242,_229)] flex items-center justify-between [background-image:initial] [background-color:rgb(251,_252,_248)] px-[18px] py-[8px] [&>span]:text-[9px] [&>span]:text-[#9aa88b] faq-admin"
            >
              <span>{f.questionId ? 'Dikurasi dari forum' : 'Panduan manual'}</span>
              <div class="flex items-center gap-y-[10px] gap-x-[10px] flex-wrap button-row">
                <button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
                  aria-label={`Naikkan FAQ ${f.question}`}
                  disabled={app.readOnly ||
                    app.loading ||
                    app.busy ||
                    all[0]?.id === f.id ||
                    !!search}
                  onclick={() =>
                    app.mutate(() => dataService.moveFaq(f.id, -1), 'Urutan FAQ diperbarui.')}
                  ><Icon name="up" size={17} /></button
                ><button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
                  aria-label={`Turunkan FAQ ${f.question}`}
                  disabled={app.readOnly ||
                    app.loading ||
                    app.busy ||
                    all.at(-1)?.id === f.id ||
                    !!search}
                  onclick={() =>
                    app.mutate(() => dataService.moveFaq(f.id, 1), 'Urutan FAQ diperbarui.')}
                  ><Icon name="down" size={17} /></button
                ><button
                  disabled={app.readOnly || app.loading || app.busy}
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
                  aria-label={`Edit FAQ ${f.question}`}
                  onclick={() => edit(f)}><Icon name="edit" size={17} /></button
                ><button
                  disabled={app.readOnly || app.loading || app.busy}
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button danger-text"
                  aria-label={`Hapus FAQ ${f.question}`}
                  onclick={() => (removing = f)}><Icon name="trash" size={17} /></button
                >
              </div>
            </div>{/if}
        </div>{/each}
    </div>{:else}<section
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
    >
      <Empty
        title="Jawaban belum ditemukan"
        description="Coba kata kunci lain atau ajukan pertanyaan melalui forum bersama."
        icon="faq"
      />
    </section>{/if}
  <div
    class="flex items-center gap-y-[20px] gap-x-[20px] [background-image:linear-gradient(135deg,_rgb(237,_246,_255),_rgb(248,_251,_255))]! [background-color:initial]! mt-[28px] text-[#8aa473] p-[24px] border-[1px] border-solid border-[color:rgb(213,_231,_251)]! rounded-[10px] [&>div]:grow [&>div]:shrink [&>div]:[flex-basis:0%] [&_h3]:text-[14px] [&_p]:text-[11px] [&_p]:text-[#6680a2]! [&_p]:mt-[6px] max-[700.01px]:gap-y-[13px] max-[700.01px]:gap-x-[13px] max-[700.01px]:flex-wrap max-[700.01px]:p-[20px] max-[700.01px]:[&_.button]:w-[100%] max-[700.01px]:[&_p]:text-[10px] faq-contact"
  >
    <Icon name="questions" size={26} />
    <div>
      <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">
        Masih punya pertanyaan?
      </h3>
      <p class="leading-[1.8] m-[0px]">
        Bagikan di forum agar seluruh kampus bisa belajar bersama.
      </p>
    </div>
    <a
      class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#075fc7] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] text-[12px] font-[650] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
      href={`/${app.session?.role}/questions`}>Buka forum<Icon name="arrow" size={17} /></a
    >
  </div>
</div>
{#if editing}<Modal
    title={editId ? 'Edit FAQ' : 'Tambah FAQ'}
    onclose={() => {
      if (!app.busy) editing = false;
    }}
    ><form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
      onsubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label
        >Pertanyaan FAQ<input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          readonly={app.readOnly}
          required
          maxlength="180"
          bind:value={question}
        /></label
      ><label
        >Jawaban FAQ<textarea
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          readonly={app.readOnly}
          required
          rows="6"
          maxlength="5000"
          bind:value={answer}></textarea></label
      >
      <p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
        Isi FAQ dikelola terpisah dari jawaban di forum.
      </p>
      <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          onclick={() => (editing = false)}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={app.readOnly || app.loading || app.busy}
          >{app.busy ? 'Menyimpan…' : 'Simpan FAQ'}</button
        >
      </div>
    </form></Modal
  >{/if}
{#if removing}<Modal
    title="Hapus FAQ ini?"
    onclose={() => {
      if (!app.busy) removing = null;
    }}
    ><p class="leading-[1.8] m-[0px]">{removing.question}</p>
    <p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
      FAQ akan dihapus dari pusat bantuan. Pertanyaan dan jawaban sumber di forum tetap tersedia.
    </p>
    <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        onclick={() => (removing = null)}
        disabled={app.busy}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(184,_67,_56)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(184,_67,_56)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button danger"
        disabled={app.readOnly || app.loading || app.busy}
        onclick={async () => {
          if (await app.mutate(() => dataService.deleteFaq(removing!.id), 'FAQ dihapus.'))
            removing = null;
        }}>Hapus FAQ</button
      >
    </div></Modal
  >{/if}
