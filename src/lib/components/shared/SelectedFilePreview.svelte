<script lang="ts">
  import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
  let { file }: { file: File | null } = $props();
  let src = $state('');
  $effect(() => {
    if (!file) { src = ''; return; }
    const url = URL.createObjectURL(file); src = url;
    return () => URL.revokeObjectURL(url);
  });
</script>
{#if file && src}
  <div class="min-w-0 space-y-2">
    <p class="text-xs font-semibold text-slate-600">Pratinjau pilihan berkas (belum disimpan)</p>
    {#if file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mp4')}
      <!-- svelte-ignore a11y_media_has_caption: pratinjau berkas lokal pengguna. -->
      <video class="max-h-80 w-full rounded-xl bg-slate-900" controls preload="metadata" aria-label={`Pratinjau ${file.name}`} {src}></video>
    {:else}<FileViewer {src} mime={file.type} name={file.name} height={300} showDownload={false} />{/if}
  </div>
{/if}
