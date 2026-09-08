<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { questionCategories } from '$lib/forum';
  import CategoryTags from './CategoryTags.svelte';
  import Icon from './Icon.svelte';

  const topQuestions = $derived((app.data?.questions || [])
    .map(question => ({ ...question, likes: app.data!.likes.filter(like => like.questionId === question.id).length }))
    .filter(question => question.likes > 0)
    .sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, 3));
</script>

<section class="top-rated" aria-labelledby="top-rated-title">
  <div class="top-rated-heading"><div><span class="eyebrow">PILIHAN KOMUNITAS</span><h2 id="top-rated-title">Top Rated Questions</h2><p>Pertanyaan dengan like terbanyak di seluruh forum.</p></div><span class="top-rated-symbol"><Icon name="like" size={22}/></span></div>
  {#if topQuestions.length}
    <ol class="top-rated-grid">{#each topQuestions as question, index}
      <li><a class="top-rated-card" href={`/${app.session?.role}/questions/${question.id}`} aria-label={`Buka pertanyaan populer: ${question.title}`}>
        <div class="card-top"><span class="rank">#{index + 1}</span><span class="likes"><Icon name="like" size={15}/>{question.likes} suka</span></div>
        <strong class="question-title">{question.title}</strong>
        <span class="question-author">{app.data?.campuses.find(campus => campus.id === question.campusId)?.name}</span>
        <CategoryTags ids={questionCategories(question)}/>
        <div class="card-bottom"><span class:answered={app.data?.answers.some(answer => answer.questionId === question.id)}>{app.data?.answers.some(answer => answer.questionId === question.id) ? 'Sudah dijawab' : 'Menunggu jawaban'}</span><span class="open-question">Lihat diskusi<Icon name="arrow" size={15}/></span></div>
      </a></li>
    {/each}</ol>
  {:else}<p class="top-rated-empty">Belum ada pertanyaan yang mendapat like. Sukai pertanyaan yang bermanfaat agar muncul di sini.</p>{/if}
</section>

<style>
  .top-rated{margin-bottom:28px;min-width:0}.top-rated-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.top-rated-heading h2{font-size:20px;letter-spacing:-.5px;margin-top:6px;color:#24452d}.top-rated-heading p{font-size:12px;color:#71816a;margin-top:6px}.top-rated-symbol{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#edf4e5;color:#5c813d}.top-rated-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;list-style:none;margin:0;padding:0}.top-rated-grid li{min-width:0}.top-rated-card{display:flex;flex-direction:column;height:100%;padding:20px;border:1px solid #dfe8d9;border-radius:12px;background:white;transition:border-color .15s,box-shadow .15s}.top-rated-card:hover{border-color:#9bb989;box-shadow:0 4px 16px #294d2010}.top-rated-card:focus-visible{outline:2px solid #428750;outline-offset:3px}.card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px}.rank{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#f3f5ed;color:#73815e;font-size:12px;font-weight:700}.top-rated-grid li:first-child .rank{background:#fff1ce;color:#926d1d}.likes{display:flex;align-items:center;gap:6px;color:#52733e;font-size:12px;font-weight:600}.question-title{font-size:14px;line-height:1.7;color:#29462d;overflow-wrap:anywhere}.question-author{font-size:10px;color:#7a8872;margin-top:9px}.card-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:14px;border-top:1px solid #eef1e9;font-size:10px;color:#96753e}.card-bottom .answered{color:#64814e}.open-question{display:flex;align-items:center;gap:5px;color:#377046;font-weight:600;white-space:nowrap}.top-rated-empty{padding:22px;border:1px dashed #d5e0cf;border-radius:12px;background:#f9fbf6;color:#71816a;font-size:12px;line-height:1.8}@media(max-width:1100px){.top-rated-grid{gap:12px}.top-rated-card{padding:16px}.card-bottom{align-items:flex-start;flex-direction:column}}@media(max-width:700px){.top-rated-grid{grid-template-columns:1fr}.top-rated-heading h2{font-size:18px}.top-rated-heading p{font-size:11px}.top-rated-card{padding:18px}.card-top{margin-bottom:10px}.card-bottom{flex-direction:row}.question-title{font-size:13px}.top-rated{margin-bottom:22px}}
</style>
