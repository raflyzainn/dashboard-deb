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

<section
  class="[&&]:mb-[28px] [&&]:min-w-[0] max-[700.01px]:[&&]:mb-[22px] my-questions"
  aria-labelledby="my-questions-title"
>
  <div
    class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mb-[16px] section-heading"
  >
    <div>
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
        >DISKUSI KAMPUS ANDA</span
      >
      <h2
        class="[&&]:mt-[6px] mb-[0px] font-[650] [&&]:text-[#12386b] [&&]:text-[20px] [&&]:tracking-[-0.5px] [&&]:flex [&&]:items-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] mx-[0px] max-[700.01px]:[&&]:text-[18px]"
        id="my-questions-title"
      >
        Pertanyaan saya <span
          class="[&&]:inline-grid [&&]:items-center [&&]:[justify-items:center] [&&]:min-w-[26px] [&&]:h-[26px] [&&]:[background-image:initial] [&&]:[background-color:rgb(232,_241,_255)] [&&]:text-[#1262bd] [&&]:text-[12px] [&&]:tracking-[0] [&&]:px-[7px] [&&]:py-[0px] [&&]:rounded-[8px] total"
          >{questions.length}</span
        >
      </h2>
      <p
        class="[&&]:mt-[6px] mb-[0px] leading-[1.8] [&&]:text-[12px] [&&]:text-[#62768b] mx-[0px] max-[700.01px]:[&&]:text-[11px]"
      >
        Pantau jawaban dan lanjutkan pertanyaan yang Anda ajukan.
      </p>
    </div>
    <span
      class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[44px] [&&]:h-[44px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(232,_241,_255)] [&&]:text-[#1262bd] [&&]:rounded-[12px] section-symbol"
      ><Icon name="questions" size={22} /></span
    >
  </div>
  {#if questions.length}
    <ul
      class="[&&]:grid [&&]:grid-cols-[repeat(3,_minmax(0,_1fr))] [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:p-[0px] [&&]:m-[0px] max-[1100.01px]:[&&]:gap-y-[12px] max-[1100.01px]:[&&]:gap-x-[12px] max-[700.01px]:[&&]:grid-cols-[1fr] question-grid"
    >
      {#each questions.slice(0, visibleCount) as question (question.id)}
        <li class="[&&]:min-w-[0]">
          <a
            class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:flex [&&]:flex-col [&&]:h-[100%] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:[transition-behavior:normal,_normal] [&&]:[transition-duration:0.15s,_0.15s] [&&]:[transition-timing-function:ease,_ease] [&&]:[transition-delay:0s,_0s] [&&]:[transition-property:border-color,_box-shadow] [&&]:p-[20px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(214,_228,_246)] [&&]:rounded-[12px] [&:focus-visible]:[outline-color:rgb(22,_115,_222)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[box-shadow:0_4px_16px_#194b8a10] [&:hover]:border-[color:rgb(145,_182,_235)] max-[1100.01px]:[&&]:p-[16px] max-[700.01px]:[&&]:p-[18px] question-card"
            href={`/campus/questions/${question.id}`}
            aria-label={`Buka pertanyaan saya: ${question.title}`}
          >
            <div
              class="[&&]:flex [&&]:justify-between [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mb-[14px] [&&]:text-[#62768b] [&&]:text-[11px] card-meta"
            >
              <span>{date(question.createdAt)}</span><span>{question.replyCount || 0} balasan</span>
            </div>
            <strong
              class="font-[650] [&&]:text-[14px] [&&]:leading-[1.7] [&&]:text-[#12386b] [&&]:wrap-anywhere max-[700.01px]:[&&]:text-[13px] question-title"
              >{question.title}</strong
            >
            <CategoryTags ids={questionCategories(question)} />
            <div
              class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:mt-[auto] [&&]:pt-[14px] [&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(232,_239,_248)] [&&]:text-[11px] [&&]:text-[#9b6b17] max-[1100.01px]:[&&]:items-start max-[1100.01px]:[&&]:flex-col max-[700.01px]:[&&]:flex-row card-bottom"
            >
              <span
                class="[&.answered]:text-[#1262bd]"
                class:answered={questionStatus(question, app.data?.answers || []) === 'answered'}
                >{QUESTION_STATUS_LABELS[questionStatus(question, app.data?.answers || [])]}</span
              ><span
                class="[&&]:flex [&&]:items-center [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:text-[#1262bd] [&&]:font-[600] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] open-question"
                >Lihat diskusi<Icon name="arrow" size={16} /></span
              >
            </div>
          </a>
        </li>
      {/each}
    </ul>
    {#if questions.length > 3}
      <div
        class="[&&]:flex [&&]:justify-between [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mt-[10px] [&&]:text-[12px] [&&]:text-[#62768b] max-[700.01px]:[&&]:items-start max-[700.01px]:[&&]:gap-y-[4px] max-[700.01px]:[&&]:gap-x-[4px] max-[700.01px]:[&&]:flex-col section-footer"
      >
        <span
          >Menampilkan {Math.min(visibleCount, questions.length)} dari {questions.length} pertanyaan</span
        >
        <div class="[&&]:flex [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:flex-wrap">
          {#if visibleCount < questions.length}<button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[44px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
              onclick={() => (visibleCount += 3)}>Tampilkan lebih banyak</button
            >{/if}{#if visibleCount > 3}<button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[44px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
              onclick={() => (visibleCount = 3)}>Tampilkan lebih sedikit</button
            >{/if}
        </div>
      </div>
    {/if}
  {:else}
    <div
      class="[&&]:text-[#62768b] [&&]:text-[12px] [&&]:leading-[1.8] [&&]:[background-image:initial] [&&]:[background-color:rgb(247,_250,_255)] [&&]:p-[22px] [&&]:border-[1px] [&&]:border-dashed [&&]:border-[color:rgb(199,_217,_238)] [&&]:rounded-[12px] empty-questions"
    >
      <p class="leading-[1.8] m-[0px]">
        Anda belum mengajukan pertanyaan. Mulai diskusi dengan Admin PF di sini.
      </p>
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:min-h-[44px] [&&]:mt-[6px] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
        disabled={app.readOnly || app.loading || app.busy}
        onclick={onask}>Ajukan pertanyaan pertama<Icon name="arrow" size={16} /></button
      >
    </div>
  {/if}
</section>
