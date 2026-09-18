<script lang="ts">
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { date } from '$lib/domain';
  import { STAGES, type PaymentCase } from '$lib/payments';
  let { payment: p, showAmount = false }: { payment: PaymentCase; showAmount?: boolean } = $props();
  const proposal = $derived(app.data?.proposals.find((v) => v.id === p.proposalId));
  const stages = Object.entries(STAGES);
  const currentIndex = $derived(stages.findIndex(([key]) => key === p.stage));
  const progress = $derived(((currentIndex + 1) / stages.length) * 100);
</script>
<section
  class="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
  aria-label="Status pembayaran"
>
  <div class="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span class="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700"
            >Tahap {currentIndex + 1} dari {stages.length}</span
          >
          <span>Proposal versi {proposal?.version}</span>
          <span aria-hidden="true">·</span>
          <span>Pengajuan simulasi</span>
        </div>
        <p class="mt-4 text-xs font-semibold uppercase tracking-wider text-blue-600">
          Tahap saat ini
        </p>
        <h2 class="mt-1 text-xl font-semibold text-[#0d234c] sm:text-2xl">{STAGES[p.stage]}</h2>
        <p class="mt-1 text-sm text-slate-500">
          {p.stage === 'paid'
            ? 'Proses pencairan telah selesai.'
            : 'Selesaikan tahap ini untuk melanjutkan proses pencairan.'}
        </p>
      </div>
      {#if showAmount}<div class="rounded-xl border border-blue-100 bg-white px-4 py-3 text-right shadow-sm">
          <span class="block text-xs text-slate-500">Nominal pengajuan</span>
          <strong class="mt-1 block text-lg text-blue-700 sm:text-xl"
            >Rp {p.amount.toLocaleString('id-ID')}</strong
          >
        </div>{/if}
    </div>
    <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <div class="h-full rounded-full bg-blue-600 transition-[width]" style={`width: ${progress}%`}></div>
    </div>
  </div>
  <ol class="grid grid-cols-1 gap-x-3 gap-y-0 p-5 sm:p-6 xl:grid-cols-8">
    {#each stages as [key, label], i}<li
        aria-current={key === p.stage ? 'step' : undefined}
        class="relative flex min-w-0 gap-3 pb-5 text-xs xl:block xl:pb-0 xl:text-center"
      >
        {#if i < stages.length - 1}<span
            aria-hidden="true"
            class={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px xl:left-[calc(50%+16px)] xl:right-[calc(-50%+16px)] xl:top-[15px] xl:h-0.5 xl:w-auto ${i < currentIndex ? 'bg-emerald-300' : 'bg-slate-200'}`}
          ></span>{/if}
        <span
          class={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border font-bold xl:mx-auto ${
            i < currentIndex
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : i === currentIndex
                ? 'border-blue-700 bg-blue-700 text-white ring-4 ring-blue-100'
                : 'border-slate-200 bg-slate-50 text-slate-400'
          }`}
        >{#if i < currentIndex}<Icon name="check" size={15} />{:else}{i + 1}{/if}</span
        >
        <span class="min-w-0 pt-1 xl:mt-3 xl:block xl:pt-0">
          <span
            class={`block leading-5 ${i === currentIndex ? 'font-bold text-blue-700' : i < currentIndex ? 'font-semibold text-emerald-700' : 'font-medium text-slate-500'}`}
            >{label}</span
          >
          <span class="mt-0.5 block text-[10px] text-slate-400">
            {i < currentIndex ? 'Selesai' : i === currentIndex ? 'Sedang diproses' : 'Berikutnya'}
          </span>
        </span>
      </li>{/each}
  </ol>
  {#if showAmount && p.paymentReference}<p
      class="mx-5 mb-5 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:mx-6 sm:mb-6"
    >
      <Icon name="check" size={17} /> Referensi simulasi: {p.paymentReference} · {date(p.paidAt!)}
    </p>{/if}
</section>
