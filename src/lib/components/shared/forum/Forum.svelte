<script lang="ts">
  // Shared presentation for the explicit Campus/Admin routes.
  import Discussion from './Discussion.svelte';
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { date } from '$lib/domain';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import CategoryTags from './CategoryTags.svelte';
  import TopRatedQuestions from './TopRatedQuestions.svelte';
  import MyQuestions from './MyQuestions.svelte';
  import {
    FORUM_CATEGORIES,
    questionStatus,
    QUESTION_STATUS_LABELS,
    questionCategories,
    matchesQuestion,
    type ForumCategoryId
  } from '$lib/forum';
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
  function toggleCategory(id: ForumCategoryId) {
    categoryFilter = categoryFilter.includes(id)
      ? categoryFilter.filter((c) => c !== id)
      : [...categoryFilter, id];
  }
  const isAdmin = $derived(app.session?.role === 'admin');
  const prefix = $derived(`/${app.session?.role}/questions`);
  const likeCount = (questionId: string) =>
    app.data!.likes.filter((l) => l.questionId === questionId).length;
  const liked = (questionId: string) =>
    app.data!.likes.some(
      (l) => l.questionId === questionId && l.campusId === app.session?.campusId
    );
  const author = (campusId: string) => app.data!.campuses.find((c) => c.id === campusId);
  const answered = (questionId: string) =>
    app.data!.answers.find((a) => a.questionId === questionId);
  const questions = $derived(
    app
      .data!.questions.filter(
        (q) =>
          matchesQuestion(q, app.data!.answers, search, categoryFilter) &&
          (status === 'all' || questionStatus(q, app.data!.answers) === status)
      )
      .sort(
        (a, b) =>
          (order === 'popular' ? likeCount(b.id) - likeCount(a.id) : 0) ||
          b.createdAt.localeCompare(a.createdAt)
      )
  );
  const question = $derived(app.data!.questions.find((q) => q.id === id));
  const answer = $derived(question ? answered(question.id) : undefined);
  const inFaq = $derived(app.data!.faq.some((f) => f.questionId === id));
  async function ask() {
    let newId = '';
    if (
      await app.mutate(async () => {
        newId = await dataService.ask(title, body, categoryIds);
      }, 'Pertanyaan dibagikan ke seluruh kampus dan Admin.')
    ) {
      compose = false;
      title = '';
      body = '';
      categoryIds = ['umum'];
      goto(`${prefix}/${newId}`);
    }
  }
  async function saveAnswer() {
    if (
      await app.mutate(() => dataService.answer(id, answerBody), 'Jawaban Admin berhasil disimpan.')
    ) {
      editingAnswer = false;
      answerBody = '';
    }
  }
</script>
{#snippet categoryFilters()}
  <div
    class="[&&]:[background-image:initial] [&&]:[background-color:rgb(248,_250,_248)] [&&]:[border-top-width:1px] [&&]:[border-bottom-width:1px] [&&]:[border-top-style:solid] [&&]:[border-bottom-style:solid] [&&]:[border-top-color:rgb(228,_235,_228)] [&&]:[border-bottom-color:rgb(228,_235,_228)] [&&]:px-[22px] [&&]:py-[18px] max-[700.01px]:[&&]:p-[16px] topic-filter"
  >
    <div
      class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mb-[12px] topic-filter-title"
    >
      <strong
        class="font-[650] [&&]:text-[12px] [.thread-meta_&]:text-[14px] max-[600.01px]:[.thread-meta_&]:text-[12px]"
        >Filter kategori topik</strong
      >{#if categoryFilter.length}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[10px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] [.topic-buttons_&]:text-[11px] [.topic-buttons_&]:text-[#53664f] [.topic-buttons_&]:[background-image:initial] [.topic-buttons_&]:[background-color:white] [.topic-buttons_&]:px-[11px] [.topic-buttons_&]:py-[7px] [.topic-buttons_&]:border-[1px] [.topic-buttons_&]:border-solid [.topic-buttons_&]:border-[color:rgb(215,_226,_214)] [.topic-buttons_&]:rounded-[7px] max-[700.01px]:[.topic-buttons_&]:text-[10px] max-[700.01px]:[.topic-buttons_&]:px-[9px] max-[700.01px]:[.topic-buttons_&]:py-[7px] [.thread-actions_&]:min-h-[40px] text-link"
          onclick={() => (categoryFilter = [])}>Hapus filter kategori</button
        >{/if}
    </div>
    <div
      class="[&&]:flex [&&]:flex-wrap [&&]:gap-y-[8px] [&&]:gap-x-[8px] max-[700.01px]:[&&]:gap-y-[6px] max-[700.01px]:[&&]:gap-x-[6px] topic-buttons"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#53664f] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:px-[11px] [&&]:py-[7px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(215,_226,_214)] [&&]:rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [.topic-filter-title_&]:text-[11px] [&.active]:font-[700] [&.active]:text-[#244d25] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(224,_239,_219)] [&.active]:border-[color:rgb(118,_165,_101)] max-[700.01px]:[&&]:text-[10px] max-[700.01px]:[&&]:px-[9px] max-[700.01px]:[&&]:py-[7px] [.thread-actions_&]:min-h-[40px]"
        class:active={!categoryFilter.length}
        aria-pressed={!categoryFilter.length}
        onclick={() => (categoryFilter = [])}>Semua kategori</button
      >{#each FORUM_CATEGORIES as category}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#53664f] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:px-[11px] [&&]:py-[7px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(215,_226,_214)] [&&]:rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [.topic-filter-title_&]:text-[11px] [&.active]:font-[700] [&.active]:text-[#244d25] [&.active]:[background-image:initial] [&.active]:[background-color:rgb(224,_239,_219)] [&.active]:border-[color:rgb(118,_165,_101)] max-[700.01px]:[&&]:text-[10px] max-[700.01px]:[&&]:px-[9px] max-[700.01px]:[&&]:py-[7px] [.thread-actions_&]:min-h-[40px]"
          class:active={categoryFilter.includes(category.id)}
          aria-pressed={categoryFilter.includes(category.id)}
          onclick={() => toggleCategory(category.id)}>{category.label}</button
        >{/each}
    </div>
    <p
      class="[&&]:mt-[10px] mb-[0px] [&&]:leading-[1.8] [&&]:text-[10px] [&&]:text-[#778772] mx-[0px] [.topic-fieldset>&]:mt-[0px] [.topic-fieldset>&]:mb-[10px] [.topic-fieldset>&]:leading-[1.8] [.topic-fieldset>&]:text-[10px] [.topic-fieldset>&]:text-[#778772] [.topic-fieldset>&]:mx-[0px]"
    >
      Pilih satu atau beberapa kategori. Hasil mencakup salah satu kategori yang dipilih.
    </p>
  </div>
{/snippet}
{#if id}
  <a
    class="[-webkit-tap-highlight-color:transparent] text-[#2875bd]! [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-block text-[11px] mb-[22px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] back-link"
    href={prefix}>← Kembali ke forum bersama</a
  >
  {#if !question}<section
      class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
    >
      <Empty
        title="Pertanyaan tidak ditemukan"
        description="Pertanyaan mungkin sudah tidak tersedia setelah data demo direset."
        icon="questions"
      />
    </section>{:else}
    <div class="max-w-[900px] mx-[auto] my-[0px] forum-detail">
      <div
        class="[&&]:grid [&&]:gap-y-[18px] [&&]:gap-x-[18px] max-[600.01px]:[&&]:gap-y-[14px] max-[600.01px]:[&&]:gap-x-[14px] thread-card"
      >
        <article
          class="[background-image:initial] [background-color:white] [&&]:[border-top-width:3px] [border-right-width:1px] [border-bottom-width:1px] [border-left-width:1px] [&&]:[border-top-style:solid] [border-right-style:solid] [border-bottom-style:solid] [border-left-style:solid] [&&]:[border-top-color:rgb(25,_114,_220)] [border-right-color:rgb(220,_231,_247)] [border-bottom-color:rgb(220,_231,_247)] [border-left-color:rgb(220,_231,_247)] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:relative [&&]:flex [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:p-[26px] rounded-[11px] [&:hover]:[border-top-color:rgb(25,_114,_220)] [&:hover]:[border-right-color:rgb(210,_226,_245)] [&:hover]:[border-bottom-color:rgb(210,_226,_245)] [&:hover]:[border-left-color:rgb(210,_226,_245)] max-[600.01px]:[&&]:gap-y-[10px] max-[600.01px]:[&&]:gap-x-[10px] max-[600.01px]:[&&]:px-[16px] max-[600.01px]:[&&]:py-[20px] panel thread-row question-thread"
        >
          <span
            class="[&&]:relative [&&]:z-[1] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:shrink-0 [&&]:w-[36px] [&&]:h-[36px] [&&]:[background-image:initial] [&&]:[background-color:rgb(234,_241,_250)] [&&]:text-[#295885] [&&]:font-[700] [&&]:text-[10px] [&&]:rounded-[50%] max-[600.01px]:[&&]:w-[32px] max-[600.01px]:[&&]:h-[32px] thread-avatar"
            >{author(question.campusId)?.initials}</span
          >
          <div class="[&&]:min-w-[0] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] thread-content">
            <div
              class="[&&]:flex [&&]:items-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:flex-wrap [&&]:min-h-[36px] max-[600.01px]:[&&]:gap-y-[5px] max-[600.01px]:[&&]:gap-x-[5px] thread-meta"
            >
              <strong class="font-[650] [&&]:text-[14px] max-[600.01px]:[&&]:text-[12px]"
                >{author(question.campusId)?.name}</strong
              ><small class="[&&]:text-[11px] [&&]:text-[#62768b] leading-[1.7]"
                >{date(question.createdAt)}</small
              >
            </div>
            <span
              class="[&&]:block [&&]:mt-[16px] [&&]:text-[11px] [&&]:text-[#1265c7] [&&]:font-[600] thread-origin"
              >Pertanyaan awal</span
            >
            <h1
              class="[&&]:mt-[10px] [&&]:mb-[12px] font-[650] text-[color:var(--navy)] [&&]:text-[23px] tracking-[-1.15px] [&&]:leading-[1.5] [&&]:wrap-anywhere [&&]:mx-[0px] max-[600.01px]:[&&]:text-[19px]"
            >
              {question.title}
            </h1>
            <CategoryTags ids={questionCategories(question)} />
            <p
              class="[&&]:leading-[1.85] [white-space-collapse:preserve] [text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:text-[14px] [&&]:mx-[0px] [&&]:my-[14px] pre-wrap thread-body"
            >
              {question.body}
            </p>
            <div
              class="[&&]:flex [&&]:items-center [&&]:gap-y-[18px] [&&]:gap-x-[18px] [&&]:flex-wrap max-[600.01px]:[&&]:gap-y-[10px] max-[600.01px]:[&&]:gap-x-[10px] thread-actions"
            >
              <Badge
                tone={questionStatus(question, app.data!.answers) === 'answered'
                  ? 'green'
                  : 'amber'}
                >{QUESTION_STATUS_LABELS[questionStatus(question, app.data!.answers)]}</Badge
              >
              {#if !isAdmin}<button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#899b74] inline-flex items-center gap-y-[8px] gap-x-[8px] [background-image:initial] [background-color:rgb(255,_255,_255)] [&&]:min-h-[40px] px-[12px] py-[8px] border-[1px] border-solid border-[color:rgb(226,_233,_216)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.liked]:text-[#116aca] [&.liked]:[background-image:initial] [&.liked]:[background-color:rgb(229,_242,_255)] [&.liked]:border-[color:rgb(159,_201,_239)] like-button"
                  class:liked={liked(id)}
                  aria-pressed={liked(id)}
                  disabled={app.readOnly || app.loading || app.busy}
                  onclick={() =>
                    app.mutate(
                      () => dataService.setLike(id, !liked(id)),
                      liked(id) ? 'Like dibatalkan.' : 'Pertanyaan disukai.'
                    )}><Icon name="like" size={18} />{likeCount(id)} suka</button
                >{:else}<span class="text-[color:var(--muted)] text-[12px] muted"
                  >{likeCount(id)} suka</span
                >{/if}
            </div>
          </div>
        </article>
        <section
          class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] [&&]:relative [&&]:flex [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:p-[26px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] max-[600.01px]:[&&]:gap-y-[10px] max-[600.01px]:[&&]:gap-x-[10px] max-[600.01px]:[&&]:px-[16px] max-[600.01px]:[&&]:py-[20px] panel thread-row answer-thread"
          aria-label="Jawaban Admin PF"
        >
          <span
            class="[&&]:relative [&&]:z-[1] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:shrink-0 [&&]:w-[36px] [&&]:h-[36px] [&&]:[background-image:initial] [&&]:[background-color:rgb(18,_101,_223)] [&&]:text-[white] [&&]:font-[700] [&&]:text-[12px] [&&]:rounded-[50%] max-[600.01px]:[&&]:w-[32px] max-[600.01px]:[&&]:h-[32px] thread-avatar pf-avatar"
            >PF</span
          >
          <div class="[&&]:min-w-[0] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] thread-content">
            <div
              class="[&&]:flex [&&]:items-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:flex-wrap [&&]:min-h-[36px] max-[600.01px]:[&&]:gap-y-[5px] max-[600.01px]:[&&]:gap-x-[5px] thread-meta"
            >
              <strong class="font-[650] [&&]:text-[14px] max-[600.01px]:[&&]:text-[12px]"
                >Admin Pertamina Foundation</strong
              >{#if answer}<Badge tone="green">Jawaban resmi</Badge>{/if}
            </div>
            {#if answer && !editingAnswer}
              <small class="[&&]:text-[11px] [&&]:text-[#62768b] leading-[1.7] muted"
                >Diperbarui {date(answer.updatedAt)}</small
              >
              <p
                class="[&&]:leading-[1.85] [white-space-collapse:preserve] [text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:text-[14px] [&&]:mx-[0px] [&&]:my-[14px] pre-wrap thread-body"
              >
                {answer.body}
              </p>
              {#if isAdmin}<div
                  class="[&&]:flex [&&]:items-center [&&]:gap-y-[18px] [&&]:gap-x-[18px] [&&]:flex-wrap max-[600.01px]:[&&]:gap-y-[10px] max-[600.01px]:[&&]:gap-x-[10px] thread-actions"
                >
                  <button
                    disabled={app.readOnly || app.loading || app.busy}
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[40px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                    onclick={() => {
                      answerBody = answer.body;
                      editingAnswer = true;
                    }}><Icon name="edit" size={15} />Perbarui jawaban</button
                  ><button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[40px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                    disabled={app.readOnly || app.loading || app.busy || inFaq}
                    onclick={() =>
                      app.mutate(
                        () => dataService.promoteFaq(id),
                        'Pertanyaan ditambahkan ke FAQ.'
                      )}
                    ><Icon name={inFaq ? 'check' : 'plus'} size={15} />{inFaq
                      ? 'Sudah masuk FAQ'
                      : 'Jadikan FAQ'}</button
                  >
                </div>{/if}
            {:else if isAdmin}
              <form
                class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] [&&]:mt-[16px]"
                onsubmit={(e) => {
                  e.preventDefault();
                  saveAnswer();
                }}
              >
                <label
                  >Jawaban untuk semua kampus<textarea
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] [&&]:mt-[10px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
                    readonly={app.readOnly}
                    rows="5"
                    required
                    maxlength="5000"
                    bind:value={answerBody}
                    placeholder="Tuliskan penjelasan yang membantu seluruh kampus..."
                  ></textarea></label
                >
                <div class="flex items-center gap-y-[10px] gap-x-[10px] flex-wrap button-row">
                  <button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
                    disabled={app.readOnly || app.loading || app.busy}
                    >{app.busy ? 'Menyimpan...' : 'Simpan jawaban'}</button
                  >{#if editingAnswer}<button
                      type="button"
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
                      onclick={() => (editingAnswer = false)}>Batal</button
                    >{/if}
                </div>
              </form>
            {:else}<p
                class="[&&]:leading-[1.85] text-[color:var(--muted)] [&&]:text-[14px] [&&]:wrap-anywhere [&&]:mx-[0px] [&&]:my-[14px] muted thread-body"
              >
                Menunggu jawaban Admin PF.
              </p>{/if}
          </div>
        </section>
        {#if answer}{#key id}<Discussion {question} {answer} />{/key}{/if}
      </div>
      <div
        class="flex items-start gap-y-[9px] gap-x-[9px] [background-image:initial] [background-color:rgb(242,_248,_255)] text-[#55759a] text-[10px] leading-[1.8] px-[15px] py-[13px] border-[1px] border-solid border-[color:rgb(219,_234,_251)] rounded-[8px] [&_svg]:mt-[1px] info-note"
      >
        <Icon name="globe" size={18} /><span>Terlihat oleh seluruh kampus dan Admin PF.</span>
      </div>
    </div>
  {/if}
{:else}
  <div
    class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >BELAJAR BERSAMA</span
      >
      <h1
        class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
      >
        Forum Q&A
      </h1>
      <p class="leading-[1.8] m-[0px]">
        Satu pertanyaan, banyak pembelajaran. Terhubung dengan seluruh kampus mitra.
      </p>
    </div>
    {#if !isAdmin}<button
        disabled={app.readOnly || app.loading || app.busy}
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        onclick={() => (compose = true)}><Icon name="plus" size={18} />Ajukan pertanyaan</button
      >{/if}
  </div>
  <div
    class="flex items-center gap-y-[20px] gap-x-[20px] [background-image:linear-gradient(135deg,_rgb(237,_246,_255),_rgb(248,_251,_255))]! [background-color:initial]! mb-[25px] px-[28px] py-[24px] border-[1px] border-solid border-[color:rgb(213,_231,_251)]! rounded-[12px] [&>div]:grow [&>div]:shrink [&>div]:[flex-basis:0%] [&_h2]:text-[18px] [&_h2]:text-[#174b89]! [&_p]:text-[12px] [&_p]:text-[#6680a2]! [&_p]:mt-[7px] max-[700.01px]:gap-y-[13px] max-[700.01px]:gap-x-[13px] max-[700.01px]:p-[19px] max-[700.01px]:[&>.badge]:hidden max-[700.01px]:[&_h2]:text-[15px] max-[700.01px]:[&_p]:text-[12px] forum-banner"
  >
    <span
      class="text-[#1777ce]! [background-image:initial] [background-color:rgba(255,_255,_255,_0.57)] w-[53px] h-[53px] grid items-center [justify-items:center] border-[1px] border-solid border-[color:rgb(213,_231,_251)]! rounded-[12px] max-[700.01px]:w-[43px] max-[700.01px]:h-[43px] max-[700.01px]:shrink-0 forum-banner-icon"
      ><Icon name="questions" size={29} /></span
    >
    <div>
      <h2 class="font-[650] text-[color:var(--navy)] text-[18px] tracking-[-0.45px] m-[0px]">
        Ruang bertanya. Ruang bertumbuh.
      </h2>
      <p class="leading-[1.8] m-[0px]">
        Seluruh {app.data!.campuses.length} kampus dan Admin PF dapat membaca pertanyaan serta jawaban
        yang sama.
      </p>
    </div>
    <Badge tone="green">Forum bersama</Badge>
  </div>
  <TopRatedQuestions />
  {#if !isAdmin}<MyQuestions onask={() => (compose = true)} />{/if}
  <div
    class="grid grid-cols-[minmax(0,_2.6fr)_minmax(230px,_1fr)] gap-y-[25px] gap-x-[25px] [align-items:start] max-[1200.01px]:grid-cols-[1fr] max-[1200.01px]:[&>aside]:hidden forum-layout"
  >
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
            aria-label="Cari pertanyaan"
            placeholder="Cari pertanyaan atau jawaban…"
            bind:value={search}
          />
        </div>
        <select
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
          aria-label="Urutkan pertanyaan"
          bind:value={order}
          ><option value="newest">Terbaru</option><option value="popular">Paling populer</option
          ></select
        >
      </div>
      {@render categoryFilters()}
      <div
        class="flex gap-y-[22px] gap-x-[22px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--line)] overflow-x-auto px-[23px] py-[0px] [&_button]:[background-image:none] [&_button]:[background-color:initial] [&_button]:[border-top-width:0px] [&_button]:[border-right-width:0px] [&_button]:[border-bottom-width:2px] [&_button]:[border-left-width:0px] [&_button]:[border-top-style:none] [&_button]:[border-right-style:none] [&_button]:[border-bottom-style:solid] [&_button]:[border-left-style:none] [&_button]:[border-top-color:currentcolor] [&_button]:[border-right-color:currentcolor] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-color:currentcolor] [&_button]:pt-[16px] [&_button]:pb-[13px] [&_button]:[white-space-collapse:collapse] [&_button]:[text-wrap-mode:nowrap] [&_button]:text-[11px] [&_button]:text-[#96a087] [&_button]:flex [&_button]:gap-y-[8px] [&_button]:gap-x-[8px] [&_button]:items-center [&_button]:px-[0px] [&_button.active]:text-[#075fc7] [&_button.active]:[border-bottom-color:#1681df] [&_button.active]:font-[700] max-[700.01px]:gap-y-[19px] max-[700.01px]:gap-x-[19px] max-[700.01px]:px-[16px] max-[700.01px]:[&_button]:text-[10px] tabs"
      >
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          class:active={status === 'all'}
          onclick={() => (status = 'all')}
          >Semua pertanyaan <span
            class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
            >{app.data!.questions.length}</span
          ></button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          class:active={status === 'unanswered'}
          onclick={() => (status = 'unanswered')}>Belum dijawab</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          class:active={status === 'waiting'}
          onclick={() => (status = 'waiting')}>Menunggu tanggapan admin</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          class:active={status === 'answered'}
          onclick={() => (status = 'answered')}>Sudah dijawab</button
        >
      </div>
      {#if questions.length}<div
          class="[&>article]:flex [&>article]:gap-y-[19px] [&>article]:gap-x-[19px] [&>article]:[border-bottom-width:1px] [&>article]:[border-bottom-style:solid] [&>article]:[border-bottom-color:rgb(237,_241,_230)] [&>article]:p-[25px] [&>article:last-child]:[border-bottom-width:0px] [&>article:last-child]:[border-bottom-style:none] [&>article:last-child]:[border-bottom-color:currentcolor] max-[700.01px]:[&>article]:gap-y-[12px] max-[700.01px]:[&>article]:gap-x-[12px] max-[700.01px]:[&>article]:px-[16px] max-[700.01px]:[&>article]:py-[20px] question-list"
        >
          {#each questions as q}<article>
              <div class="question-vote">
                {#if !isAdmin}<button
                    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#899b74] inline-flex items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [background-image:initial] [background-color:rgb(255,_255,_255)] [&&]:flex-col [&&]:min-w-[48px] [&&]:px-[12px] [&&]:py-[10px] border-[1px] border-solid border-[color:rgb(226,_233,_216)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.liked]:text-[#116aca] [&.liked]:[background-image:initial] [&.liked]:[background-color:rgb(229,_242,_255)] [&.liked]:border-[color:rgb(159,_201,_239)] max-[700.01px]:[&&]:min-w-[40px] max-[700.01px]:[&&]:p-[9px] like-button vertical"
                    class:liked={liked(q.id)}
                    aria-label={`Sukai ${q.title}`}
                    aria-pressed={liked(q.id)}
                    disabled={app.readOnly || app.loading || app.busy}
                    onclick={() =>
                      app.mutate(
                        () => dataService.setLike(q.id, !liked(q.id)),
                        liked(q.id) ? 'Like dibatalkan.' : 'Pertanyaan disukai.'
                      )}
                    ><Icon name="like" size={19} /><strong class="font-[650]"
                      >{likeCount(q.id)}</strong
                    ></button
                  >{:else}<span
                    class="inline-flex items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#899b74] text-[11px] [&&]:flex-col [&&]:min-w-[48px] [&&]:px-[12px] [&&]:py-[10px] border-[1px] border-solid border-[color:rgb(226,_233,_216)] rounded-[8px] max-[700.01px]:[&&]:min-w-[40px] max-[700.01px]:[&&]:p-[9px] like-button vertical"
                    ><Icon name="like" size={19} /><strong class="font-[650]"
                      >{likeCount(q.id)}</strong
                    ></span
                  >{/if}
              </div>
              <div
                class="grow shrink [flex-basis:0%] min-w-[0] [&_h3]:text-[15px] [&_h3]:leading-[1.7] [&_h3]:text-[#3d5831] [&_a:hover_h3]:text-[#075fc7] [&>p]:text-[12px] [&>p]:text-[#748366] [&>p]:mt-[8px] [&>p]:mb-[15px] [&>p]:[display:-webkit-box] [&>p]:[-webkit-line-clamp:2] [&>p]:[-webkit-box-orient:vertical] [&>p]:overflow-x-hidden [&>p]:overflow-y-hidden [&>p]:mx-[0px] max-[700.01px]:[&_h3]:text-[13px] max-[700.01px]:[&>p]:text-[11px] question-summary"
              >
                <div
                  class="flex flex-wrap gap-y-[7px] gap-x-[7px] text-[#71845e] text-[11px] mb-[9px] max-[700.01px]:text-[10px] question-meta"
                >
                  <span>{author(q.campusId)?.name}</span><span>·</span><span
                    >{date(q.createdAt)}</span
                  >
                </div>
                <a
                  class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
                  href={`${prefix}/${q.id}`}
                  ><h3
                    class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]"
                  >
                    {q.title}
                  </h3></a
                >
                <p class="leading-[1.8] m-[0px]">{q.body}</p>
                <CategoryTags ids={questionCategories(q)} />
                <div
                  class="flex gap-y-[15px] gap-x-[15px] items-center justify-between max-[700.01px]:gap-y-[7px] max-[700.01px]:gap-x-[7px] max-[700.01px]:flex-wrap max-[700.01px]:[&_.text-link]:text-[11px] [&_.text-link]:text-[11px] question-tags"
                >
                  <Badge
                    tone={questionStatus(q, app.data!.answers) === 'answered' ? 'green' : 'amber'}
                    >{QUESTION_STATUS_LABELS[questionStatus(q, app.data!.answers)]}</Badge
                  ><span class="text-[color:var(--muted)] text-[12px] muted"
                    >{q.replyCount || 0} balasan</span
                  ><a
                    class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] text-[12px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                    href={`${prefix}/${q.id}`}
                    >{isAdmin && !answered(q.id) ? 'Berikan jawaban' : 'Lihat diskusi'}<Icon
                      name="arrow"
                      size={15}
                    /></a
                  >
                </div>
              </div>
            </article>{/each}
        </div>{:else}<Empty
          title="Belum ada pertanyaan yang cocok"
          description="Ubah kata kunci, kategori, atau status untuk menemukan pertanyaan."
          icon="questions"
        />{/if}
    </section>
    <aside>
      <section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] p-[24px] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&_h3]:text-[17px] [&_h3]:leading-[1.7] [&_h3]:mx-[0px] [&_h3]:my-[12px] [&_p]:text-[12px] [&_p]:text-[#6680a2]! [&:hover]:border-[color:rgb(210,_226,_245)] panel forum-guide"
      >
        <span
          class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
          >BERBAGI DENGAN BAIK</span
        >
        <h3 class="font-[650] text-[color:var(--navy)] text-[15px] leading-[1.5] m-[0px]">
          Pertanyaan Anda bisa membantu yang lain.
        </h3>
        <p class="leading-[1.8] m-[0px]">
          Gunakan judul yang jelas dan ceritakan konteks pertanyaan. Hindari mencantumkan data
          pribadi.
        </p>
        <div
          class="h-[1px] [background-image:initial] [background-color:var(--line)] mx-[0px] my-[24px] section-divider"
        ></div>
        <div
          class="flex items-start gap-y-[10px] gap-x-[10px] text-[#8c9c76] text-[10px] leading-[1.8] mb-[16px] [&>svg]:mt-[2px] guide-item"
        >
          <Icon name="search" /><span>Cari topik serupa terlebih dahulu.</span>
        </div>
        <div
          class="flex items-start gap-y-[10px] gap-x-[10px] text-[#8c9c76] text-[10px] leading-[1.8] mb-[16px] [&>svg]:mt-[2px] guide-item"
        >
          <Icon name="questions" /><span>Admin PF menjawab untuk semua kampus.</span>
        </div>
        <div
          class="flex items-start gap-y-[10px] gap-x-[10px] text-[#8c9c76] text-[10px] leading-[1.8] mb-[16px] [&>svg]:mt-[2px] guide-item"
        >
          <Icon name="like" /><span>Sukai pertanyaan yang juga ingin Anda ketahui.</span>
        </div>
      </section>
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[#829866] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] flex flex-col gap-y-[17px] gap-x-[17px] [background-image:linear-gradient(135deg,_rgb(237,_246,_255),_rgb(248,_251,_255))]! [background-color:initial]! mt-[22px] p-[24px] border-[1px] border-solid border-[color:rgb(213,_231,_251)]! rounded-[11px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&_strong]:text-[16px] [&_strong]:leading-[1.6] [&_strong]:text-[#174b89]! [&>span]:flex [&>span]:items-center [&>span]:gap-y-[8px] [&>span]:gap-x-[8px] [&>span]:text-[10px] faq-promo"
        href={`/${app.session?.role}/faq`}
        ><Icon name="faq" size={25} /><strong class="font-[650]"
          >Mungkin jawabannya<br />sudah ada di FAQ.</strong
        ><span>Jelajahi pusat bantuan<Icon name="arrow" size={16} /></span></a
      >
    </aside>
  </div>
{/if}
{#if compose}<Modal
    title="Ajukan pertanyaan"
    onclose={() => {
      if (!app.busy) compose = false;
    }}
    ><p class="leading-[1.8] text-[color:var(--muted)] text-[12px] m-[0px] muted">
      Pertanyaan Anda dapat dibaca oleh seluruh kampus dan Admin PF.
    </p>
    <form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%]"
      onsubmit={(e) => {
        e.preventDefault();
        ask();
      }}
    >
      <fieldset
        class="[&&]:mt-[0px] [&&]:mb-[20px] [&&]:p-[14px] [&&]:mx-[0px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_230,_213)] [&&]:rounded-[8px] topic-fieldset"
      >
        <legend class="[&&]:text-[12px] [&&]:font-[600] [&&]:px-[5px] [&&]:py-[0px]"
          >Kategori pertanyaan</legend
        >
        <p
          class="[&&]:mt-[0px] [&&]:mb-[10px] [&&]:leading-[1.8] [&&]:text-[10px] [&&]:text-[#778772] [&&]:mx-[0px]"
        >
          Pilih setidaknya satu kategori yang sesuai.
        </p>
        <div
          class="[&&]:grid [&&]:grid-cols-[1fr_1fr] [&&]:gap-y-[10px] [&&]:gap-x-[10px] max-[700.01px]:[&&]:grid-cols-[1fr] topic-checkboxes"
        >
          {#each FORUM_CATEGORIES as category}<label
              class="[&&]:flex [&&]:flex-row [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[11px] [&&]:m-[0px] max-[700.01px]:[&&]:px-[0px] max-[700.01px]:[&&]:py-[3px]"
              ><input
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:w-[16px] [&&]:h-[16px] [&&]:shrink-0 [&&]:[accent-color:#2d793a] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
                type="checkbox"
                value={category.id}
                bind:group={categoryIds}
              />{category.label}</label
            >{/each}
        </div>
      </fieldset>
      <label
        >Judul pertanyaan<input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          readonly={app.readOnly}
          required
          maxlength="180"
          bind:value={title}
          placeholder="Apa yang ingin Anda tanyakan?"
        /></label
      ><label
        >Uraian pertanyaan<textarea
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [resize:vertical] min-h-[85px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          readonly={app.readOnly}
          required
          maxlength="5000"
          rows="5"
          bind:value={body}
          placeholder="Ceritakan konteks agar pertanyaan lebih mudah dipahami…"></textarea></label
      >
      <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
          onclick={() => (compose = false)}
          disabled={app.busy}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
          disabled={app.readOnly || app.loading || app.busy}
          >{app.busy ? 'Mengirim…' : 'Bagikan pertanyaan'}</button
        >
      </div>
    </form></Modal
  >{/if}
