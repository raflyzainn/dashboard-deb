<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { questionCategories, questionStatus, QUESTION_STATUS_LABELS } from '$lib/forum';
  import CategoryTags from './CategoryTags.svelte';
  import Icon from './Icon.svelte';

  const topQuestions = $derived(
    (app.data?.questions || [])
      .map((question) => ({
        ...question,
        likes: app.data!.likes.filter((like) => like.questionId === question.id).length
      }))
      .filter((question) => question.likes > 0)
      .sort(
        (a, b) =>
          b.likes - a.likes || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
      )
      .slice(0, 3)
  );
</script>

<section
  class="[&&]:mb-[28px] [&&]:min-w-[0] max-[700.01px]:[&&]:mb-[22px] top-rated"
  aria-labelledby="top-rated-title"
>
  <div
    class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mb-[16px] top-rated-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >PILIHAN KOMUNITAS</span
      >
      <h2
        class="[&&]:mt-[6px] mb-[0px] font-[650] [&&]:text-[#24452d] [&&]:text-[20px] [&&]:tracking-[-0.5px] mx-[0px] max-[700.01px]:[&&]:text-[18px]"
        id="top-rated-title"
      >
        Top Rated Questions
      </h2>
      <p
        class="[&&]:mt-[6px] mb-[0px] leading-[1.8] [&&]:text-[12px] [&&]:text-[#71816a] mx-[0px] max-[700.01px]:[&&]:text-[11px]"
      >
        Pertanyaan dengan like terbanyak di seluruh forum.
      </p>
    </div>
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[44px] [&&]:h-[44px] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_244,_229)] [&&]:text-[#5c813d] [&&]:rounded-[12px] top-rated-symbol"
      ><Icon name="like" size={22} /></span
    >
  </div>
  {#if topQuestions.length}
    <ol
      class="[&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:p-[0px] [&&]:m-[0px] max-[1100.01px]:[&&]:gap-y-[12px] max-[1100.01px]:[&&]:gap-x-[12px] max-[700.01px]:[&&]:grid-cols-[1fr] top-rated-grid"
    >
      {#each topQuestions as question, index}
        <li class="[&&]:min-w-[0]">
          <a
            class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:flex [&&]:flex-col [&&]:h-[100%] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[transition-behavior:normal,_normal] [&&]:[transition-duration:0.15s,_0.15s] [&&]:[transition-timing-function:ease,_ease] [&&]:[transition-delay:0s,_0s] [&&]:[transition-property:border-color,_box-shadow] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(223,_232,_217)] [&&]:rounded-[12px] [&:focus-visible]:[outline-color:rgb(66,_135,_80)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[box-shadow:0_4px_16px_#294d2010] [&:hover]:border-[color:rgb(155,_185,_137)] max-[1100.01px]:[&&]:p-[16px] max-[700.01px]:[&&]:p-[18px] top-rated-card"
            href={`/${app.session?.role}/questions/${question.id}`}
            aria-label={`Buka pertanyaan populer: ${question.title}`}
          >
            <div
              class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:mb-[16px] [&&]:gap-y-[12px] [&&]:gap-x-[12px] max-[700.01px]:[&&]:mb-[10px] card-top"
            >
              <span
                class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[32px] [&&]:h-[32px] [&&]:[background-image:initial] [&&]:[background-color:rgb(243,_245,_237)] [&&]:text-[#73815e] [&&]:text-[12px] [&&]:font-[700] [&&]:rounded-[9px] [.top-rated-grid_li:first-child_&]:[background-image:initial] [.top-rated-grid_li:first-child_&]:[background-color:rgb(255,_241,_206)] [.top-rated-grid_li:first-child_&]:text-[#926d1d] rank"
                >#{index + 1}</span
              ><span
                class="[&&]:flex [&&]:items-center [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:text-[#52733e] [&&]:text-[12px] [&&]:font-[600] likes"
                ><Icon name="like" size={15} />{question.likes} suka</span
              >
            </div>
            <strong
              class="font-[650] [&&]:text-[14px] [&&]:leading-[1.7] [&&]:text-[#29462d] [&&]:wrap-anywhere max-[700.01px]:[&&]:text-[13px] question-title"
              >{question.title}</strong
            >
            <span class="[&&]:text-[10px] [&&]:text-[#7a8872] [&&]:mt-[9px] question-author"
              >{app.data?.campuses.find((campus) => campus.id === question.campusId)?.name}</span
            >
            <CategoryTags ids={questionCategories(question)} />
            <div
              class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mt-[auto] [&&]:pt-[14px] [&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(238,_241,_233)] [&&]:text-[10px] [&&]:text-[#96753e] max-[1100.01px]:[&&]:items-start max-[1100.01px]:[&&]:flex-col max-[700.01px]:[&&]:flex-row card-bottom"
            >
              <span
                class="[&.answered]:text-[#64814e]"
                class:answered={questionStatus(question, app.data?.answers || []) === 'answered'}
                >{QUESTION_STATUS_LABELS[questionStatus(question, app.data?.answers || [])]}</span
              ><span
                class="[&&]:flex [&&]:items-center [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:text-[#377046] [&&]:font-[600] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] open-question"
                >Lihat diskusi<Icon name="arrow" size={15} /></span
              >
            </div>
          </a>
        </li>
      {/each}
    </ol>
  {:else}<p
      class="[&&]:leading-[1.8] [&&]:[background-image:initial] [&&]:[background-color:rgb(249,_251,_246)] [&&]:text-[#71816a] [&&]:text-[12px] [&&]:p-[22px] m-[0px] [&&]:border-[1px] [&&]:border-dashed [&&]:border-[color:rgb(213,_224,_207)] [&&]:rounded-[12px] top-rated-empty"
    >
      Belum ada pertanyaan yang mendapat like. Sukai pertanyaan yang bermanfaat agar muncul di sini.
    </p>{/if}
</section>
