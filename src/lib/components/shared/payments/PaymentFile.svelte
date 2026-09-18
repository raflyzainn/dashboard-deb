<script lang="ts">
  import { dataService } from '$lib/data/service';
  let { paymentId, fileId, filename }: { paymentId: string; fileId: string; filename: string } =
    $props();
  let url = $state(''),
    error = $state('');
  $effect(() => {
    const id = fileId,
      payment = paymentId;
    let disposed = false,
      objectUrl = '';
    url = '';
    error = '';
    dataService
      .paymentFile(payment, id)
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        url = objectUrl;
      })
      .catch((e) => {
        if (!disposed) error = e.message;
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  });
</script>
{#if error}<p role="alert" class="p-4 text-red-700">{error}</p>
{:else if url}<iframe
    title={`Pratinjau berkas ${filename}`}
    src={url}
    class="h-[420px] w-full rounded-lg border bg-slate-50"
  ></iframe><a
    class="mt-3 inline-block text-sm font-semibold text-blue-700"
    href={url}
    download={filename}>Unduh {filename}</a
  >
{:else}<p role="status" class="p-4 text-sm text-slate-500">Memuat berkas…</p>{/if}
