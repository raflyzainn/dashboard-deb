<script lang="ts">
  import Icon from './Icon.svelte';
  let { title = 'Belum ada data', description = 'Data akan tampil di sini saat tersedia.', icon = 'search' } = $props();
</script>
<div class="empty"><div class="empty-icon"><Icon name={icon} size={28}/></div><h3>{title}</h3><p>{description}</p></div>
