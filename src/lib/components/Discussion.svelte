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

<section class="discussion" aria-labelledby="discussion-title">
  <div class="discussion-heading">
    <h2 id="discussion-title">Diskusi lanjutan</h2>
    <span>{Math.max(question.replyCount || 0, replies.at(-1)?.sequence || 0)} balasan</span>
  </div>
  {#if readError}<p class="error" role="status">
      {readError} Pembaruan akan dicoba kembali otomatis.
    </p>{/if}
  {#if loading}<p class="muted">Memuat diskusi…</p>{:else if !replies.length}<p class="muted">
      Masih ada yang ingin ditanyakan? Lanjutkan diskusi di sini.
    </p>{/if}
  {#if hasOlder}<button class="text-link older" disabled={olderLoading} onclick={older}
      >{olderLoading ? 'Memuat…' : 'Muat balasan sebelumnya'}</button
    >{/if}
  <div class="messages">
    {#each replies as reply (reply.id)}
      <article id={'reply-' + reply.id} class="panel reply">
        <span class="avatar" class:admin={reply.authorRole === 'admin'} aria-hidden="true"
          >{reply.authorRole === 'admin' ? 'PF' : 'K'}</span
        >
        <div class="message">
          <div class="meta">
            <strong>{reply.authorName}</strong><span class="reply-number"
              >Balasan #{reply.sequence}</span
            ><time datetime={reply.createdAt}>{timestamp(reply.createdAt)}</time>
          </div>
          <blockquote>
            <span>Membalas {reply.replyTo ? 'pesan' : 'jawaban resmi'}</span><strong
              >{reply.quote?.authorName || 'Jawaban Admin PF'}</strong
            >
            <p>{reply.quote?.body || answer.body.slice(0, 200)}</p>
          </blockquote>
          <p class="pre-wrap reply-body">{reply.body}</p>
          {#if canReply}<button class="text-link reply-action" onclick={() => selectTarget(reply)}
              >Balas<span class="sr-only"> pesan {reply.sequence}</span></button
            >{/if}
        </div>
      </article>
    {/each}
  </div>
  <div bind:this={end}></div>
  {#if newCount}<button
      class="text-link new-replies"
      onclick={() => {
        end?.scrollIntoView({ block: 'center' });
        newCount = 0;
      }}>{newCount} balasan baru — lihat</button
    >{/if}
  {#if canReply}
    <form
      class="panel reply-form"
      onsubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div class="replying">
        Membalas {target?.authorName || 'jawaban Admin PF'}{#if target}<button
            type="button"
            class="text-link"
            disabled={sending}
            onclick={() => selectTarget(null)}>Batal</button
          >{/if}
      </div>
      {#if target}<p class="quote-preview">{target.body.slice(0, 200)}</p>{/if}
      <label for="discussion-body">Balasan Anda</label>
      <textarea
        id="discussion-body"
        bind:this={composer}
        bind:value={body}
        readonly={sending}
        rows="4"
        maxlength="5000"
        required
        placeholder="Tuliskan pertanyaan lanjutan atau penjelasan…"></textarea>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="compose-footer">
        <small>Terlihat oleh seluruh kampus dan admin.</small><button
          class="button"
          disabled={sending || loading || !body.trim()}
          >{sending ? 'Mengirim…' : 'Kirim balasan'}</button
        >
      </div>
    </form>
  {:else}<p class="muted reader-note">Diskusi dilanjutkan oleh kampus penanya dan Admin PF.</p>{/if}
</section>

<style>
  .discussion {
    min-width: 0;
  }
  .discussion-heading,
  .meta,
  .compose-footer,
  .replying {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .discussion-heading {
    margin: 4px 0 14px;
  }
  .discussion-heading h2 {
    font-size: 16px;
    font-weight: 600;
  }
  .discussion-heading span,
  time,
  .compose-footer small,
  .replying {
    font-size: 12px;
    color: #62768b;
  }
  .reply {
    position: relative;
    display: flex;
    gap: 14px;
    padding: 24px;
    scroll-margin-top: 100px;
  }
  .messages {
    display: grid;
    gap: 14px;
  }
  .reply-number {
    font-size: 11px;
    color: #62768b;
  }
  .message blockquote > span {
    display: block;
    font-size: 10px;
    margin-bottom: 3px;
  }
  .reply:target {
    background: #f1f6ff;
  }
  .avatar {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #eaf0f6;
    color: #29496c;
    font-size: 12px;
    font-weight: 700;
  }
  .avatar.admin {
    background: #e2edff;
    color: #125ec3;
  }
  .message {
    min-width: 0;
    flex: 1;
  }
  .meta {
    align-items: flex-start;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .meta strong {
    font-size: 13px;
  }
  .reply-body {
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
  .message blockquote {
    border-left: 2px solid #cad8e8;
    padding: 8px 12px;
    margin: 12px 0;
    color: #62768b;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .message blockquote p,
  .quote-preview {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .reply-action {
    margin-top: 8px;
    min-height: 44px;
  }
  .older {
    min-height: 44px;
  }
  .new-replies {
    position: sticky;
    bottom: 18px;
    background: #edf4ff;
    border: 1px solid #d4e3fa;
    border-radius: 20px;
    padding: 10px 18px;
    z-index: 1;
  }
  .discussion form {
    margin-top: 18px;
    padding: 24px;
  }
  .replying {
    justify-content: flex-start;
    margin-bottom: 10px;
  }
  .replying button {
    min-height: 32px;
  }
  .quote-preview {
    font-size: 12px;
    color: #62768b;
    margin-bottom: 12px;
  }
  .discussion label {
    margin-bottom: 8px;
    font-size: 13px;
  }
  .discussion textarea {
    width: 100%;
    resize: vertical;
  }
  .compose-footer {
    margin-top: 12px;
  }
  .error {
    color: #b42318;
    font-size: 13px;
    margin: 12px 0;
  }
  .reader-note {
    margin-top: 20px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
  @media (max-width: 600px) {
    .reply {
      gap: 10px;
      padding: 20px 16px;
    }
    .avatar {
      width: 32px;
      height: 32px;
    }
    .discussion form {
      padding: 20px 16px;
    }
    .compose-footer {
      align-items: flex-start;
      flex-direction: column;
    }
    .compose-footer button {
      width: 100%;
    }
    .meta {
      gap: 4px;
      flex-direction: column;
    }
    .discussion-heading {
      align-items: flex-start;
    }
  }
</style>
