<script lang="ts">
  import { page } from '$app/state';
  import Forum from '../../../_components/Forum.svelte';
</script>

<svelte:head><title>Forum Q&A · Digitalisasi DEB</title></svelte:head>
{#key page.params.id}
  <Forum id={page.params.id} />
{/key}
