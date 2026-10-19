<script lang="ts">
  import { page } from '$app/state';
  import Layar from '$lib/components/admin/pencairan/Layar.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
</script>

<svelte:head><title>Pencairan · Desa Energi Berdikari</title></svelte:head>
<div class="mb-4">
  <Button icon="file" href={`/admin/pencairan/${page.params.id}/pelaporan`}>
    Buka Pelaporan dan LPJ
    <Icon name="arrow" size={16} />
  </Button>
</div>
{#key page.params.id}<Layar campusId={page.params.id!} />{/key}
