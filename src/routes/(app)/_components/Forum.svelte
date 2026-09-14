<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import Discussion from '$lib/components/Discussion.svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date } from '$lib/domain';
  import Icon from '$lib/components/Icon.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
  import CategoryTags from '$lib/components/CategoryTags.svelte';
  import TopRatedQuestions from '$lib/components/TopRatedQuestions.svelte';
  import MyQuestions from '$lib/components/MyQuestions.svelte';
  import { FORUM_CATEGORIES, questionStatus, QUESTION_STATUS_LABELS, questionCategories, matchesQuestion, type ForumCategoryId } from '$lib/forum';
  let { id = '' }: { id?: string } = $props();
  let search = $state('');
  let status = $state('all');
  let order = $state('newest');
  let compose = $state(false);
  let title = $state('');
  let body = $state('');
  let answerBody = $state('');
  let editingAnswer = $state(false);
  let categoryFilter = $state<ForumCategoryId[]>([]);
  let categoryIds = $state<ForumCategoryId[]>(['umum']);
  function toggleCategory(id: ForumCategoryId) { categoryFilter = categoryFilter.includes(id) ? categoryFilter.filter(c => c !== id) : [...categoryFilter, id]; }
  const isAdmin = $derived(app.session?.role === 'admin');
  const prefix = $derived(`/${app.session?.role}/questions`);
  const likeCount = (questionId: string) => app.data!.likes.filter(l => l.questionId === questionId).length;
  const liked = (questionId: string) => app.data!.likes.some(l => l.questionId === questionId && l.campusId === app.session?.campusId);
  const author = (campusId: string) => app.data!.campuses.find(c => c.id === campusId);
  const answered = (questionId: string) => app.data!.answers.find(a => a.questionId === questionId);
  const questions = $derived(app.data!.questions.filter(q => matchesQuestion(q, app.data!.answers, search, categoryFilter) && (status === 'all' || questionStatus(q, app.data!.answers) === status)).sort((a,b) => (order === 'popular' ? likeCount(b.id) - likeCount(a.id) : 0) || b.createdAt.localeCompare(a.createdAt)));
  const question = $derived(app.data!.questions.find(q => q.id === id));
  const answer = $derived(question ? answered(question.id) : undefined);
  const inFaq = $derived(app.data!.faq.some(f => f.questionId === id));
  async function ask() {
    let newId = '';
    if (await app.mutate(async () => { newId = await dataService.ask(title, body, categoryIds); }, 'Pertanyaan dibagikan ke seluruh kampus dan Admin.')) { compose = false; title = ''; body = ''; categoryIds = ['umum']; goto(`${prefix}/${newId}`); }
  }
  async function saveAnswer() { if (await app.mutate(() => dataService.answer(id, answerBody), 'Jawaban Admin berhasil disimpan.')) { editingAnswer = false; answerBody = ''; } }
</script>
{#snippet categoryFilters()}
  <div class="topic-filter"><div class="topic-filter-title"><strong>Filter kategori topik</strong>{#if categoryFilter.length}<button class="text-link" onclick={() => categoryFilter = []}>Hapus filter kategori</button>{/if}</div><div class="topic-buttons"><button class:active={!categoryFilter.length} aria-pressed={!categoryFilter.length} onclick={() => categoryFilter = []}>Semua kategori</button>{#each FORUM_CATEGORIES as category}<button class:active={categoryFilter.includes(category.id)} aria-pressed={categoryFilter.includes(category.id)} onclick={() => toggleCategory(category.id)}>{category.label}</button>{/each}</div><p>Pilih satu atau beberapa kategori. Hasil mencakup salah satu kategori yang dipilih.</p></div>
{/snippet}
{#if id}
  <a class="back-link" href={prefix}>← Kembali ke forum bersama</a>
  {#if !question}<section class="panel"><Empty title="Pertanyaan tidak ditemukan" description="Pertanyaan mungkin sudah tidak tersedia setelah data demo direset." icon="questions"/></section>{:else}
    <div class="forum-detail">
      <div class="thread-card">
        <article class="panel thread-row question-thread">
          <span class="thread-avatar">{author(question.campusId)?.initials}</span>
          <div class="thread-content">
            <div class="thread-meta"><strong>{author(question.campusId)?.name}</strong><small>{date(question.createdAt)}</small></div>
            <span class="thread-origin">Pertanyaan awal</span><h1>{question.title}</h1>
            <CategoryTags ids={questionCategories(question)}/>
            <p class="pre-wrap thread-body">{question.body}</p>
            <div class="thread-actions"><Badge tone={questionStatus(question, app.data!.answers) === 'answered' ? 'green' : 'amber'}>{QUESTION_STATUS_LABELS[questionStatus(question, app.data!.answers)]}</Badge>
              {#if !isAdmin}<button class="like-button" class:liked={liked(id)} aria-pressed={liked(id)} disabled={app.readOnly || app.loading || app.busy} onclick={() => app.mutate(() => dataService.setLike(id, !liked(id)), liked(id) ? 'Like dibatalkan.' : 'Pertanyaan disukai.')}><Icon name="like" size={18}/>{likeCount(id)} suka</button>{:else}<span class="muted">{likeCount(id)} suka</span>{/if}
            </div>
          </div>
        </article>
        <section class="panel thread-row answer-thread" aria-label="Jawaban Admin PF">
          <span class="thread-avatar pf-avatar">PF</span>
          <div class="thread-content">
            <div class="thread-meta"><strong>Admin Pertamina Foundation</strong>{#if answer}<Badge tone="green">Jawaban resmi</Badge>{/if}</div>
            {#if answer && !editingAnswer}
              <small class="muted">Diperbarui {date(answer.updatedAt)}</small>
              <p class="pre-wrap thread-body">{answer.body}</p>
              {#if isAdmin}<div class="thread-actions"><button disabled={app.readOnly || app.loading || app.busy} class="text-link" onclick={() => { answerBody = answer.body; editingAnswer = true; }}><Icon name="edit" size={15}/>Perbarui jawaban</button><button class="text-link" disabled={app.readOnly || app.loading || app.busy || inFaq} onclick={() => app.mutate(() => dataService.promoteFaq(id), 'Pertanyaan ditambahkan ke FAQ.')}><Icon name={inFaq ? 'check' : 'plus'} size={15}/>{inFaq ? 'Sudah masuk FAQ' : 'Jadikan FAQ'}</button></div>{/if}
            {:else if isAdmin}
              <form onsubmit={(e) => { e.preventDefault(); saveAnswer(); }}><label>Jawaban untuk semua kampus<textarea readonly={app.readOnly} rows="5" required maxlength="5000" bind:value={answerBody} placeholder="Tuliskan penjelasan yang membantu seluruh kampus..."></textarea></label><div class="button-row"><button class="button" disabled={app.readOnly || app.loading || app.busy}>{app.busy ? 'Menyimpan...' : 'Simpan jawaban'}</button>{#if editingAnswer}<button type="button" class="button secondary" onclick={() => editingAnswer = false}>Batal</button>{/if}</div></form>
            {:else}<p class="muted thread-body">Menunggu jawaban Admin PF.</p>{/if}
          </div>
        </section>
        {#if answer}{#key id}<Discussion {question} {answer}/>{/key}{/if}
      </div>
      <div class="info-note"><Icon name="globe" size={18}/><span>Terlihat oleh seluruh kampus dan Admin PF.</span></div>
    </div>
  {/if}
{:else}
  <div class="page-heading"><div><span class="eyebrow">BELAJAR BERSAMA</span><h1>Forum Q&A</h1><p>Satu pertanyaan, banyak pembelajaran. Terhubung dengan seluruh kampus mitra.</p></div>{#if !isAdmin}<button disabled={app.readOnly || app.loading || app.busy} class="button" onclick={() => compose = true}><Icon name="plus" size={18}/>Ajukan pertanyaan</button>{/if}</div>
  <div class="forum-banner"><span class="forum-banner-icon"><Icon name="questions" size={29}/></span><div><h2>Ruang bertanya. Ruang bertumbuh.</h2><p>Seluruh {app.data!.campuses.length} kampus dan Admin PF dapat membaca pertanyaan serta jawaban yang sama.</p></div><Badge tone="green">Forum bersama</Badge></div>
  <TopRatedQuestions/>
  {#if !isAdmin}<MyQuestions onask={() => compose = true}/>{/if}
  <div class="forum-layout"><section class="panel"><div class="toolbar"><div class="search-field"><Icon name="search" size={18}/><input aria-label="Cari pertanyaan" placeholder="Cari pertanyaan atau jawaban…" bind:value={search}/></div><select aria-label="Urutkan pertanyaan" bind:value={order}><option value="newest">Terbaru</option><option value="popular">Paling populer</option></select></div>{@render categoryFilters()}<div class="tabs"><button class:active={status === 'all'} onclick={() => status = 'all'}>Semua pertanyaan <span class="count">{app.data!.questions.length}</span></button><button class:active={status === 'unanswered'} onclick={() => status = 'unanswered'}>Belum dijawab</button><button class:active={status === 'waiting'} onclick={() => status = 'waiting'}>Menunggu tanggapan admin</button><button class:active={status === 'answered'} onclick={() => status = 'answered'}>Sudah dijawab</button></div>{#if questions.length}<div class="question-list">{#each questions as q}<article><div class="question-vote">{#if !isAdmin}<button class="like-button vertical" class:liked={liked(q.id)} aria-label={`Sukai ${q.title}`} aria-pressed={liked(q.id)} disabled={app.readOnly || app.loading || (app.busy)} onclick={() => app.mutate(() => dataService.setLike(q.id, !liked(q.id)), liked(q.id) ? 'Like dibatalkan.' : 'Pertanyaan disukai.')}><Icon name="like" size={19}/><strong>{likeCount(q.id)}</strong></button>{:else}<span class="like-button vertical"><Icon name="like" size={19}/><strong>{likeCount(q.id)}</strong></span>{/if}</div><div class="question-summary"><div class="question-meta"><span>{author(q.campusId)?.name}</span><span>·</span><span>{date(q.createdAt)}</span></div><a href={`${prefix}/${q.id}`}><h3>{q.title}</h3></a><p>{q.body}</p><CategoryTags ids={questionCategories(q)}/><div class="question-tags"><Badge tone={questionStatus(q, app.data!.answers) === 'answered' ? 'green' : 'amber'}>{QUESTION_STATUS_LABELS[questionStatus(q, app.data!.answers)]}</Badge><span class="muted">{q.replyCount || 0} balasan</span><a class="text-link" href={`${prefix}/${q.id}`}>{isAdmin && !answered(q.id) ? 'Berikan jawaban' : 'Lihat diskusi'}<Icon name="arrow" size={15}/></a></div></div></article>{/each}</div>{:else}<Empty title="Belum ada pertanyaan yang cocok" description="Ubah kata kunci, kategori, atau status untuk menemukan pertanyaan." icon="questions"/>{/if}</section><aside><section class="panel forum-guide"><span class="eyebrow">BERBAGI DENGAN BAIK</span><h3>Pertanyaan Anda bisa membantu yang lain.</h3><p>Gunakan judul yang jelas dan ceritakan konteks pertanyaan. Hindari mencantumkan data pribadi.</p><div class="section-divider"></div><div class="guide-item"><Icon name="search"/><span>Cari topik serupa terlebih dahulu.</span></div><div class="guide-item"><Icon name="questions"/><span>Admin PF menjawab untuk semua kampus.</span></div><div class="guide-item"><Icon name="like"/><span>Sukai pertanyaan yang juga ingin Anda ketahui.</span></div></section><a class="faq-promo" href={`/${app.session?.role}/faq`}><Icon name="faq" size={25}/><strong>Mungkin jawabannya<br/>sudah ada di FAQ.</strong><span>Jelajahi pusat bantuan<Icon name="arrow" size={16}/></span></a></aside></div>
{/if}
{#if compose}<Modal title="Ajukan pertanyaan" onclose={() => { if (!app.busy) compose = false; }}><p class="muted">Pertanyaan Anda dapat dibaca oleh seluruh kampus dan Admin PF.</p><form onsubmit={(e) => { e.preventDefault(); ask(); }}><fieldset class="topic-fieldset"><legend>Kategori pertanyaan</legend><p>Pilih setidaknya satu kategori yang sesuai.</p><div class="topic-checkboxes">{#each FORUM_CATEGORIES as category}<label><input type="checkbox" value={category.id} bind:group={categoryIds}/>{category.label}</label>{/each}</div></fieldset><label>Judul pertanyaan<input readonly={app.readOnly} required maxlength="180" bind:value={title} placeholder="Apa yang ingin Anda tanyakan?"/></label><label>Uraian pertanyaan<textarea readonly={app.readOnly} required maxlength="5000" rows="5" bind:value={body} placeholder="Ceritakan konteks agar pertanyaan lebih mudah dipahami…"></textarea></label><div class="dialog-actions"><button type="button" class="button secondary" onclick={() => compose = false} disabled={app.busy}>Batal</button><button class="button" disabled={app.readOnly || app.loading || (app.busy)}>{app.busy ? 'Mengirim…' : 'Bagikan pertanyaan'}</button></div></form></Modal>{/if}

<style>.topic-filter{padding:18px 22px;background:#f8faf8;border-block:1px solid #e4ebe4}.topic-filter-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.topic-filter-title strong{font-size:12px}.topic-filter-title button{font-size:10px}.topic-buttons{display:flex;flex-wrap:wrap;gap:8px}.topic-buttons button{padding:7px 11px;border:1px solid #d7e2d6;border-radius:7px;background:white;font-size:11px;color:#53664f}.topic-buttons button.active{background:#e0efdb;border-color:#76a565;color:#244d25;font-weight:700}.topic-filter>p,.topic-fieldset>p{font-size:10px;color:#778772;margin-top:10px;line-height:1.8}.topic-fieldset{border:1px solid #dce6d5;border-radius:8px;padding:14px;margin:0 0 20px}.topic-fieldset legend{font-size:12px;font-weight:600;padding:0 5px}.topic-fieldset>p{margin:0 0 10px}.topic-checkboxes{display:grid;grid-template-columns:1fr 1fr;gap:10px}.topic-checkboxes label{display:flex;flex-direction:row;align-items:center;gap:8px;margin:0;font-size:11px}.topic-checkboxes input{width:16px;height:16px;flex-shrink:0;accent-color:#2d793a}@media(max-width:700px){.topic-filter{padding:16px}.topic-buttons{gap:6px}.topic-buttons button{font-size:10px;padding:7px 9px}.topic-checkboxes{grid-template-columns:1fr}.topic-checkboxes label{padding:3px 0}}

.thread-card{display:grid;gap:18px}.thread-row{position:relative;display:flex;gap:14px;padding:26px}.thread-origin{display:block;margin-top:16px;font-size:11px;color:#1265c7;font-weight:600}.question-thread{border-top:3px solid #1972dc}.thread-avatar{position:relative;z-index:1;display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:50%;background:#eaf1fa;color:#295885;font-weight:700;font-size:10px}.pf-avatar{background:#1265df;color:white;font-size:12px}.thread-content{min-width:0;flex:1}.thread-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-height:36px}.thread-meta strong{font-size:14px}.thread-meta small,.thread-content>small{font-size:11px;color:#62768b}.thread-content h1{font-size:23px;line-height:1.5;margin:10px 0 12px;overflow-wrap:anywhere}.thread-body{font-size:14px;line-height:1.85;margin:14px 0;overflow-wrap:anywhere}.thread-actions{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.thread-actions button{min-height:40px}.thread-content form{margin-top:16px}.thread-content textarea{margin-top:10px}@media(max-width:600px){.thread-card{gap:14px}.thread-row{gap:10px;padding:20px 16px}.thread-avatar{width:32px;height:32px}.thread-content h1{font-size:19px}.thread-meta strong{font-size:12px}.thread-meta{gap:5px}.thread-actions{gap:10px}}
</style>
