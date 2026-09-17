<script lang="ts">
  import { FORUM_CATEGORIES, type ForumCategoryId } from '$lib/forum';
  let { ids }: { ids: ForumCategoryId[] } = $props();
</script>
<div
  class="[&&]:flex [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:flex-wrap [&&]:mx-[0px] [&&]:my-[10px] category-tags"
>
  {#each ids as id}{@const category = FORUM_CATEGORIES.find((c) => c.id === id)}{#if category}<span
        class={[
          `topic-tag topic-${category.color}`,
          '[&&]:text-[10px] [&&]:font-[600] [&&]:leading-[1.4] [&&]:px-[8px] [&&]:py-[4px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:currentcolor] [&&]:rounded-[5px] [&.topic-blue]:[background-image:initial] [&.topic-blue]:[background-color:rgb(229,_240,_255)] [&.topic-blue]:text-[#2057a5] [&.topic-blue]:border-[color:rgb(184,_212,_245)] [&.topic-violet]:[background-image:initial] [&.topic-violet]:[background-color:rgb(238,_232,_255)] [&.topic-violet]:text-[#6437aa] [&.topic-violet]:border-[color:rgb(208,_188,_241)] [&.topic-teal]:[background-image:initial] [&.topic-teal]:[background-color:rgb(220,_245,_240)] [&.topic-teal]:text-[#146957] [&.topic-teal]:border-[color:rgb(164,_219,_203)] [&.topic-purple]:[background-image:initial] [&.topic-purple]:[background-color:rgb(244,_229,_255)] [&.topic-purple]:text-[#77339c] [&.topic-purple]:border-[color:rgb(222,_192,_237)] [&.topic-pink]:[background-image:initial] [&.topic-pink]:[background-color:rgb(255,_233,_241)] [&.topic-pink]:text-[#a52c61] [&.topic-pink]:border-[color:rgb(241,_191,_208)] [&.topic-amber]:[background-image:initial] [&.topic-amber]:[background-color:rgb(255,_244,_214)] [&.topic-amber]:text-[#896007] [&.topic-amber]:border-[color:rgb(232,_208,_148)] [&.topic-green]:[background-image:initial] [&.topic-green]:[background-color:rgb(226,_246,_223)] [&.topic-green]:text-[#2a6927] [&.topic-green]:border-[color:rgb(184,_220,_177)] [&.topic-orange]:[background-image:initial] [&.topic-orange]:[background-color:rgb(255,_240,_227)] [&.topic-orange]:text-[#984817] [&.topic-orange]:border-[color:rgb(237,_204,_174)] [&.topic-gray]:[background-image:initial] [&.topic-gray]:[background-color:rgb(239,_242,_241)] [&.topic-gray]:text-[#53625a] [&.topic-gray]:border-[color:rgb(212,_221,_215)]'
        ]}>{category.label}</span
      >{/if}{/each}
</div>
