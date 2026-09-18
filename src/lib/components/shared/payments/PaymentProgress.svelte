<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { date } from '$lib/domain';
  import { STAGES, type PaymentCase } from '$lib/payments';
  let { payment: p, showAmount = false }: { payment: PaymentCase; showAmount?: boolean } = $props();
  const proposal = $derived(app.data?.proposals.find((v) => v.id === p.proposalId));
</script>
<section class="mb-5 rounded-xl border border-blue-200 bg-white p-5" aria-label="Status pembayaran">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-xs text-slate-500">Proposal versi {proposal?.version} · Pengajuan simulasi</p>
      <h2 class="mt-1 text-xl font-semibold text-[#0d234c]">{STAGES[p.stage]}</h2>
    </div>
    {#if showAmount}<strong class="text-xl text-blue-700"
        >Rp {p.amount.toLocaleString('id-ID')}</strong
      >{/if}
  </div>
  <ol class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
    {#each Object.entries(STAGES) as [key, label], i}<li
        aria-current={key === p.stage ? 'step' : undefined}
        class={`rounded-lg p-3 text-xs ${key === p.stage ? 'bg-blue-700 text-white' : i < Object.keys(STAGES).indexOf(p.stage) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}
      >
        <span class="font-bold">{i + 1}.</span>
        {label}
      </li>{/each}
  </ol>
  {#if showAmount && p.paymentReference}<p class="mt-4 text-sm text-emerald-800">
      Referensi simulasi: {p.paymentReference} · {date(p.paidAt!)}
    </p>{/if}
</section>
