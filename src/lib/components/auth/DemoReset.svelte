<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { goto } from '$app/navigation';
  let { onclose }: { onclose: () => void } = $props();
  let busy = $state(false);
  let error = $state('');
  async function reset() {
    busy = true;
    try {
      await dataService.reset();
      await app.logout();
      onclose();
      await goto('/login');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Reset belum berhasil.';
    } finally {
      busy = false;
    }
  }
</script>
<Modal
  title="Reset data demo"
  onclose={() => {
    if (!busy) onclose();
  }}
>
  <p class="text-[13px] leading-[1.8] text-[#647699]">
    Kembalikan seluruh data simulasi di browser ini ke kondisi awal? Isian indikator, unggahan PDF,
    dan tanggapan demo yang Anda buat akan dihapus. Data pada perangkat lain tidak terpengaruh.
  </p>
  {#if error}<p role="alert" class="mt-[12px] text-red-700">{error}</p>{/if}
  <div class="mt-[24px] flex justify-end gap-[12px]">
    <button
      disabled={busy}
      onclick={onclose}
      class="rounded-[8px] border border-[#dce7f7] px-[18px] py-[10px] text-[#17365f]">Batal</button
    >
    <button
      disabled={busy}
      onclick={reset}
      class="rounded-[8px] bg-[#075fc7] px-[18px] py-[10px] text-white"
      >{busy ? 'Mereset...' : 'Ya, reset demo'}</button
    >
  </div>
</Modal>
