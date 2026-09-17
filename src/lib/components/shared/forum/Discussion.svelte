<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService, DataReadError } from '$lib/data/service';
  import { pollVisible } from '$lib/polling';
  import type { Question, Answer, QuestionReply } from '$lib/types';

  let { question, answer }: { question: Question; answer: Answer } = $props();
  let replies = $state<QuestionReply[]>([]);
  let body = $state('');
  let target = $state<QuestionReply | null>(null);
  let loading = $state(true),
    olderLoading = $state(false),
    hasOlder = $state(false),
    sending = $state(false);
  let error = $state(''),
    readError = $state(''),
    newCount = $state(0);
  let composer = $state<HTMLTextAreaElement>();
  let end = $state<HTMLDivElement>();
  let alive = false;
  const canReply = $derived(
    !app.readOnly && (app.session?.role === 'admin' || app.session?.campusId === question.campusId)
  );
  const timestamp = (value: string) =>
    new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const merge = (items: QuestionReply[]) => {
    replies = [...new Map([...replies, ...items].map((r) => [r.id, r])).values()].sort(
      (a, b) => a.sequence - b.sequence
    );
  };
  function failure(e: unknown) {
    if (e instanceof DataReadError && e.status === 401) void app.logout();
    return e instanceof DataReadError && e.status === 404
      ? 'Diskusi belum tersedia. Silakan coba lagi sebentar.'
      : e instanceof Error
        ? e.message
        : 'Diskusi belum dapat dimuat. Coba lagi.';
  }
  async function older() {
    if (olderLoading || !hasOlder || !replies.length) return;
    olderLoading = true;
    const anchor = document.getElementById('reply-' + replies[0].id);
    const top = anchor?.getBoundingClientRect().top;
    try {
      const result = await dataService.replies(question.id, { before: replies[0].sequence });
      if (!alive) return;
      merge(result.items);
      hasOlder = result.hasMore;
      readError = '';
      await tick();
      if (anchor && top !== undefined) window.scrollBy(0, anchor.getBoundingClientRect().top - top);
    } catch (e) {
      if (alive) readError = failure(e);
    } finally {
      if (alive) olderLoading = false;
    }
  }
  async function refresh() {
    try {
      const initial = loading;
      const atEnd =
        end &&
        end.getBoundingClientRect().top <= window.innerHeight + 80 &&
        end.getBoundingClientRect().bottom >= 0;
      const result = await dataService.replies(
        question.id,
        initial ? {} : { after: replies.at(-1)?.sequence || 0 }
      );
      if (!alive) return;
      const added = result.items.filter((r) => !replies.some((old) => old.id === r.id)).length;
      merge(result.items);
      readError = '';
      if (initial) {
        hasOlder = result.hasMore;
        loading = false;
        const hash = location.hash.slice(1);
        if (/^reply-[a-z0-9]{15}$/.test(hash)) {
          while (alive && hasOlder && !replies.some((r) => 'reply-' + r.id === hash)) {
            const before = replies[0]?.sequence;
            await older();
            if (readError || replies[0]?.sequence === before) break;
          }
          await tick();
          if (alive) document.getElementById(hash)?.scrollIntoView({ block: 'center' });
        }
      } else if (added) {
        if (atEnd && !body) {
          await tick();
          end?.scrollIntoView({ block: 'nearest' });
        } else newCount += added;
      }
    } catch (e) {
      if (alive) readError = failure(e);
      throw e;
    }
  }
  onMount(() => {
    alive = true;
    const stop = pollVisible(refresh, 5000, true);
    return () => {
      alive = false;
      stop();
    };
  });
  function selectTarget(reply: QuestionReply | null) {
    target = reply;
    composer?.focus();
  }
  async function send() {
    if (sending || !canReply || !body.trim()) return;
    sending = true;
    error = '';
    try {
      await dataService.reply(question.id, body.trim(), target?.id);
      if (!alive) return;
      body = '';
      target = null;
      await Promise.allSettled([refresh(), app.refreshForum(), app.refreshNavigation()]);
    } catch (e) {
      if (alive) error = failure(e);
    } finally {
      if (alive) sending = false;
    }
  }
</script>

<section class="[&&]:min-w-[0] discussion" aria-labelledby="discussion-title">
  <div
    class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mt-[4px] [&&]:mb-[14px] [&&]:mx-[0px] max-[600.01px]:[&&]:items-start discussion-heading"
  >
    <h2
      class="[&&]:font-[600] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] m-[0px]"
      id="discussion-title"
    >
      Diskusi lanjutan
    </h2>
    <span class="[&&]:text-[12px] [&&]:text-[#62768b]"
      >{Math.max(question.replyCount || 0, replies.at(-1)?.sequence || 0)} balasan</span
    >
  </div>
  {#if readError}<p
      class="leading-[1.8] [&&]:text-[#b42318] [&&]:text-[13px] [&&]:mx-[0px] [&&]:my-[12px] error"
      role="status"
    >
      {readError} Pembaruan akan dicoba kembali otomatis.
    </p>{/if}
  {#if loading}<p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
      Memuat diskusi…
    </p>{:else if !replies.length}<p
      class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted"
    >
      Masih ada yang ingin ditanyakan? Lanjutkan diskusi di sini.
    </p>{/if}
  {#if hasOlder}<button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[44px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link older"
      disabled={olderLoading}
      onclick={older}>{olderLoading ? 'Memuat…' : 'Muat balasan sebelumnya'}</button
    >{/if}
  <div class="[&&]:grid [&&]:gap-y-[14px] [&&]:gap-x-[14px] messages">
    {#each replies as reply (reply.id)}
      <article
        id={'reply-' + reply.id}
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:relative [&&]:flex [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:[scroll-margin-top:100px] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] [&:target]:[background-image:initial] [&:target]:[background-color:rgb(241,_246,_255)] max-[600.01px]:[&&]:gap-y-[10px] max-[600.01px]:[&&]:gap-x-[10px] max-[600.01px]:[&&]:px-[16px] max-[600.01px]:[&&]:py-[20px] panel reply"
      >
        <span
          class="[&&]:relative [&&]:z-[1] [&&]:shrink-0 [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[36px] [&&]:h-[36px] [&&]:[background-image:initial] [&&]:[background-color:rgb(234,_240,_246)] [&&]:text-[#29496c] [&&]:text-[12px] [&&]:font-[700] [&&]:rounded-[50%] [&.admin]:[background-image:initial] [&.admin]:[background-color:rgb(226,_237,_255)] [&.admin]:text-[#125ec3] max-[600.01px]:[&&]:w-[32px] max-[600.01px]:[&&]:h-[32px] avatar"
          class:admin={reply.authorRole === 'admin'}
          aria-hidden="true">{reply.authorRole === 'admin' ? 'PF' : 'K'}</span
        >
        <div class="[&&]:min-w-[0] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] message">
          <div
            class="[&&]:flex [&&]:items-start [&&]:justify-start [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap max-[600.01px]:[&&]:gap-y-[4px] max-[600.01px]:[&&]:gap-x-[4px] max-[600.01px]:[&&]:flex-col meta"
          >
            <strong class="font-[650] [&&]:text-[13px]">{reply.authorName}</strong><span
              class="[&&]:text-[11px] [&&]:text-[#62768b] reply-number"
              >Balasan #{reply.sequence}</span
            ><time class="[&&]:text-[12px] [&&]:text-[#62768b]" datetime={reply.createdAt}
              >{timestamp(reply.createdAt)}</time
            >
          </div>
          <blockquote
            class="[&&]:[border-left-width:2px] [&&]:[border-left-style:solid] [&&]:[border-left-color:rgb(202,_216,_232)] [&&]:text-[#62768b] [&&]:text-[12px] [&&]:wrap-anywhere [&&]:px-[12px] [&&]:py-[8px] [&&]:mx-[0px] [&&]:my-[12px]"
          >
            <span class="[&&]:block [&&]:text-[10px] [&&]:mb-[3px]"
              >Membalas {reply.replyTo ? 'pesan' : 'jawaban resmi'}</span
            ><strong class="font-[650]">{reply.quote?.authorName || 'Jawaban Admin PF'}</strong>
            <p
              class="leading-[1.8] [&&]:[display:-webkit-box] [&&]:[-webkit-line-clamp:2] [&&]:[line-clamp:2] [&&]:[-webkit-box-orient:vertical] [&&]:overflow-x-hidden [&&]:overflow-y-hidden m-[0px]"
            >
              {reply.quote?.body || answer.body.slice(0, 200)}
            </p>
          </blockquote>
          <p
            class="[&&]:leading-[1.8] [white-space-collapse:preserve] [text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:text-[14px] m-[0px] pre-wrap reply-body"
          >
            {reply.body}
          </p>
          {#if canReply}<button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:mt-[8px] [&&]:min-h-[44px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link reply-action"
              onclick={() => selectTarget(reply)}
              >Balas<span
                class="[&&]:absolute [&&]:w-[1px] [&&]:h-[1px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[clip:rect(0,_0,_0,_0)] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] m-[-1px] border-[0px] border-none border-[color:currentcolor] sr-only"
              >
                pesan {reply.sequence}</span
              ></button
            >{/if}
        </div>
      </article>
    {/each}
  </div>
  <div bind:this={end}></div>
  {#if newCount}<button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_244,_255)] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:sticky [&&]:bottom-[18px] [&&]:z-[1] [&&]:px-[18px] [&&]:py-[10px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(212,_227,_250)] [&&]:rounded-[20px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link new-replies"
      onclick={() => {
        end?.scrollIntoView({ block: 'center' });
        newCount = 0;
      }}>{newCount} balasan baru — lihat</button
    >{/if}
  {#if canReply}
    <form
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:mt-[18px] [&&]:p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:px-[16px] max-[600.01px]:[&&]:py-[20px] panel reply-form"
      onsubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div
        class="[&&]:flex [&&]:items-center [&&]:justify-start [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:text-[12px] [&&]:text-[#62768b] [&&]:mb-[10px] replying"
      >
        Membalas {target?.authorName || 'jawaban Admin PF'}{#if target}<button
            type="button"
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[32px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
            disabled={sending}
            onclick={() => selectTarget(null)}>Batal</button
          >{/if}
      </div>
      {#if target}<p
          class="mt-[0px] [&&]:mb-[12px] leading-[1.8] [&&]:[display:-webkit-box] [&&]:[-webkit-line-clamp:2] [&&]:[line-clamp:2] [&&]:[-webkit-box-orient:vertical] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:text-[12px] [&&]:text-[#62768b] mx-[0px] quote-preview"
        >
          {target.body.slice(0, 200)}
        </p>{/if}
      <label class="[&&]:mb-[8px] [&&]:text-[13px]" for="discussion-body">Balasan Anda</label>
      <textarea
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:[resize:vertical] min-h-[85px] [&&]:w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        id="discussion-body"
        bind:this={composer}
        bind:value={body}
        readonly={sending}
        rows="4"
        maxlength="5000"
        required
        placeholder="Tuliskan pertanyaan lanjutan atau penjelasan…"></textarea>
      {#if error}<p
          class="leading-[1.8] [&&]:text-[#b42318] [&&]:text-[13px] [&&]:mx-[0px] [&&]:my-[12px] error"
          role="alert"
        >
          {error}
        </p>{/if}
      <div
        class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mt-[12px] max-[600.01px]:[&&]:items-start max-[600.01px]:[&&]:flex-col compose-footer"
      >
        <small class="[&&]:text-[12px] [&&]:text-[#62768b] leading-[1.7]"
          >Terlihat oleh seluruh kampus dan admin.</small
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] max-[600.01px]:[&&]:w-[100%] button"
          disabled={sending || loading || !body.trim()}
          >{sending ? 'Mengirim…' : 'Kirim balasan'}</button
        >
      </div>
    </form>
  {:else}<p
      class="[&&]:mt-[20px] mb-[0px] leading-[1.8] text-[color:var(--muted)] text-[12px] mx-[0px] muted reader-note"
    >
      Diskusi dilanjutkan oleh kampus penanya dan Admin PF.
    </p>{/if}
</section>
