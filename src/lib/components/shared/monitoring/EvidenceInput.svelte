<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import FileViewer from '$lib/components/admin/pencairan/FileViewer.svelte';
  import { dataService } from '$lib/data/service';
  import type { MonitoringFile } from '$lib/monitoring';
  let { campusId, period, kind, label, value = $bindable(''), files, disabled = false, onUploaded, onBusy }: { campusId: string; period: string; kind: string; label: string; value?: string; files: MonitoringFile[]; disabled?: boolean; onUploaded: () => Promise<void>; onBusy?: (busy: boolean) => void } = $props();
  let busy = $state(false), error = $state('');
  let operationId = '', fileSignature = '';
  const photo = $derived(['solar', 'reactor', 'hero'].includes(kind));
  const selected = $derived(files.find(file => file.id === value));
  async function upload(event: Event) {
    const input = event.currentTarget as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    if (file.size > (photo ? 2 : 20) * 1024 * 1024) { error = `Berkas maksimal ${photo ? 2 : 20} MB.`; input.value = ''; return; }
    busy = true; onBusy?.(true); error = '';
    const signature = `${file.name}:${file.size}:${file.lastModified}`;
    if (signature !== fileSignature) { operationId = crypto.randomUUID(); fileSignature = signature; }
    const form = new FormData(); form.set('file', file); form.set('period', period); form.set('kind', kind); form.set('operationId', operationId);
    try { const result = await dataService.api.post<{ id: string }>(`/api/monitoring/${campusId}/files`, form); await onUploaded(); value = result.id; operationId = ''; fileSignature = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'Unggah gagal. Coba lagi.'; }
    finally { busy = false; onBusy?.(false); input.value = ''; }
  }
</script>
<div class="grid min-w-0 gap-2">
  <label class="grid gap-1 text-sm"><span class="font-medium">{label}</span>
    <select class="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-2" bind:value disabled={disabled || busy}>
      <option value="">Belum tersedia / tidak berlaku</option>
      {#each files.filter(f => f.kind === kind) as file}<option value={file.id}>{file.originalName}</option>{/each}
    </select>
  </label>
  {#if value}
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="min-w-0 break-all text-xs font-semibold text-slate-600">{selected?.originalName || label}</span>
        <Button variant="secondary" size="sm" icon="file" href={`/api/monitoring/${campusId}/files/${value}`} target="_blank">Buka berkas</Button>
      </div>
      {#if selected}<FileViewer src={`/api/monitoring/${campusId}/files/${value}`} mime={selected.mime} name={selected.originalName} height={photo ? 260 : 360} showDownload={false} />{/if}
    </div>
  {/if}
  <label class="grid gap-1 text-xs text-slate-600"><span>{busy ? 'Mengunggah…' : `Unggah baru · ${photo ? 'JPG/PNG/WebP, maksimal 2 MB' : 'PDF/DOCX, maksimal 20 MB'}`}</span>
    <input class="w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2" type="file" accept={photo ? '.jpg,.jpeg,.png,.webp' : '.pdf,.docx'} disabled={disabled || busy} onchange={upload} />
  </label>
  {#if error}<p class="text-sm text-red-700" role="alert">{error}</p>{/if}
</div>
