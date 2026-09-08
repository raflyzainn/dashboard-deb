<script lang="ts">
  import { FORUM_CATEGORIES, type ForumCategoryId } from '$lib/forum';
  let { ids }: { ids: ForumCategoryId[] } = $props();
</script>
<div class="category-tags">{#each ids as id}{@const category = FORUM_CATEGORIES.find(c => c.id === id)}{#if category}<span class={`topic-tag topic-${category.color}`}>{category.label}</span>{/if}{/each}</div>
<style>
  .category-tags{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.topic-tag{font-size:10px;font-weight:600;padding:4px 8px;border-radius:5px;border:1px solid;line-height:1.4}.topic-blue{background:#e5f0ff;color:#2057a5;border-color:#b8d4f5}.topic-violet{background:#eee8ff;color:#6437aa;border-color:#d0bcf1}.topic-teal{background:#dcf5f0;color:#146957;border-color:#a4dbcb}.topic-purple{background:#f4e5ff;color:#77339c;border-color:#dec0ed}.topic-pink{background:#ffe9f1;color:#a52c61;border-color:#f1bfd0}.topic-amber{background:#fff4d6;color:#896007;border-color:#e8d094}.topic-green{background:#e2f6df;color:#2a6927;border-color:#b8dcb1}.topic-orange{background:#fff0e3;color:#984817;border-color:#edccae}.topic-gray{background:#eff2f1;color:#53625a;border-color:#d4ddd7}
</style>
