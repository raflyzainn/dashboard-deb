<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { date } from '$lib/domain';
  import { questionCategories, questionStatus, QUESTION_STATUS_LABELS } from '$lib/forum';
  import CategoryTags from './CategoryTags.svelte';
  import Icon from './Icon.svelte';

  let { onask }: { onask: () => void } = $props();
  let visibleCount = $state(3);
  const questions = $derived(
    (app.data?.questions || [])
      .filter(
        (question) => Boolean(app.session?.campusId) && question.campusId === app.session?.campusId
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
  );
</script>

<section class="my-questions" aria-labelledby="my-questions-title">
  <div class="section-heading">
    <div>
      <span class="eyebrow">DISKUSI KAMPUS ANDA</span>
      <h2 id="my-questions-title">Pertanyaan saya <span class="total">{questions.length}</span></h2>
      <p>Pantau jawaban dan lanjutkan pertanyaan yang Anda ajukan.</p>
    </div>
    <span class="section-symbol"><Icon name="questions" size={22} /></span>
  </div>
  {#if questions.length}
    <ul class="question-grid">
      {#each questions.slice(0, visibleCount) as question (question.id)}
        <li>
          <a
            class="question-card"
            href={`/campus/questions/${question.id}`}
            aria-label={`Buka pertanyaan saya: ${question.title}`}
          >
            <div class="card-meta">
              <span>{date(question.createdAt)}</span><span>{question.replyCount || 0} balasan</span>
            </div>
            <strong class="question-title">{question.title}</strong>
            <CategoryTags ids={questionCategories(question)} />
            <div class="card-bottom">
              <span
                class:answered={questionStatus(question, app.data?.answers || []) === 'answered'}
                >{QUESTION_STATUS_LABELS[questionStatus(question, app.data?.answers || [])]}</span
              ><span class="open-question">Lihat diskusi<Icon name="arrow" size={16} /></span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
    {#if questions.length > 3}
      <div class="section-footer">
        <span
          >Menampilkan {Math.min(visibleCount, questions.length)} dari {questions.length} pertanyaan</span
        >
        <div>
          {#if visibleCount < questions.length}<button
              class="text-link"
              onclick={() => (visibleCount += 3)}>Tampilkan lebih banyak</button
            >{/if}{#if visibleCount > 3}<button class="text-link" onclick={() => (visibleCount = 3)}
              >Tampilkan lebih sedikit</button
            >{/if}
        </div>
      </div>
    {/if}
  {:else}
    <div class="empty-questions">
      <p>Anda belum mengajukan pertanyaan. Mulai diskusi dengan Admin PF di sini.</p>
      <button class="text-link" disabled={app.readOnly || app.loading || app.busy} onclick={onask}
        >Ajukan pertanyaan pertama<Icon name="arrow" size={16} /></button
      >
    </div>
  {/if}
</section>

<style>
  .my-questions {
    margin-bottom: 28px;
    min-width: 0;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .section-heading h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 20px;
    letter-spacing: -0.5px;
    margin-top: 6px;
    color: #12386b;
  }
  .section-heading p {
    font-size: 12px;
    color: #62768b;
    margin-top: 6px;
  }
  .total {
    display: inline-grid;
    place-items: center;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    border-radius: 8px;
    background: #e8f1ff;
    color: #1262bd;
    font-size: 12px;
    letter-spacing: 0;
  }
  .section-symbol {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
    background: #e8f1ff;
    color: #1262bd;
  }
  .question-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .question-grid li {
    min-width: 0;
  }
  .question-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 20px;
    border: 1px solid #d6e4f6;
    border-radius: 12px;
    background: white;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .question-card:hover {
    border-color: #91b6eb;
    box-shadow: 0 4px 16px #194b8a10;
  }
  .question-card:focus-visible {
    outline: 2px solid #1673de;
    outline-offset: 3px;
  }
  .card-meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
    color: #62768b;
    font-size: 11px;
  }
  .question-title {
    font-size: 14px;
    line-height: 1.7;
    color: #12386b;
    overflow-wrap: anywhere;
  }
  .card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid #e8eff8;
    font-size: 11px;
    color: #9b6b17;
  }
  .card-bottom .answered {
    color: #1262bd;
  }
  .open-question {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #1262bd;
    font-weight: 600;
    white-space: nowrap;
  }
  .section-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 10px;
    font-size: 12px;
    color: #62768b;
  }
  .section-footer > div {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .section-footer button {
    min-height: 44px;
  }
  .empty-questions {
    padding: 22px;
    border: 1px dashed #c7d9ee;
    border-radius: 12px;
    color: #62768b;
    font-size: 12px;
    line-height: 1.8;
    background: #f7faff;
  }
  .empty-questions button {
    min-height: 44px;
    margin-top: 6px;
  }
  @media (max-width: 1100px) {
    .question-grid {
      gap: 12px;
    }
    .question-card {
      padding: 16px;
    }
    .card-bottom {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  @media (max-width: 700px) {
    .question-grid {
      grid-template-columns: 1fr;
    }
    .section-heading h2 {
      font-size: 18px;
    }
    .section-heading p {
      font-size: 11px;
    }
    .question-card {
      padding: 18px;
    }
    .question-title {
      font-size: 13px;
    }
    .card-bottom {
      flex-direction: row;
    }
    .section-footer {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
    .my-questions {
      margin-bottom: 22px;
    }
  }
</style>
