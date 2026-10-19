<script lang="ts">
  import { calculateMonitoring, type Formula, type CompleteMonth } from '$lib/monitoring';
  let { rows, beneficiaries, formula, title = 'Pratinjau perhitungan', gasEquivalentKwh, savedResult, showFormula = true }: { rows: CompleteMonth[]; beneficiaries: number; formula: Formula; title?: string; gasEquivalentKwh?: number; savedResult?: ReturnType<typeof calculateMonitoring>; showFormula?: boolean } = $props();
  const result = $derived.by(() => {
    const result = savedResult || calculateMonitoring(rows, beneficiaries, formula);
    return gasEquivalentKwh === undefined ? result : { ...result, gasEquivalentKwh, equivalentKwh: result.electricityKwh + gasEquivalentKwh };
  });
  const n = (v: number | null) => v === null ? 'Belum dapat dihitung' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(v);
  const money = (v: number | null) => v === null ? 'Belum dapat dihitung' : `Rp ${n(v / 100)}`;
</script>
<section class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed" aria-label={title}>
  <h3 class="text-base font-bold text-slate-900">{title}</h3>
  {#if showFormula}
  <p class="mt-1 text-slate-600">Estimasi sementara · {formula.version}, revisi {formula.revision}. {result.months} bulan dilaporkan; bulan kosong tidak dianggap nol.</p>
  <dl class="mt-3 grid gap-3 sm:grid-cols-2">
    <div><dt class="font-semibold">Rata-rata pendapatan bulanan</dt><dd>{money(result.incomeSen)} ÷ {result.months} bulan = {money(result.averageIncomeSen)}/bulan</dd></div>
    <div><dt class="font-semibold">Estimasi pendapatan tahunan</dt><dd>Total pendapatan ÷ jumlah bulan dilaporkan × 12</dd><dd>{money(result.incomeSen)} ÷ {result.months} × 12 = {money(result.annualIncomeSen)}/tahun</dd></div>
    <div><dt class="font-semibold">Estimasi pendapatan per kapita</dt><dd>Estimasi pendapatan tahunan ÷ penerima manfaat unik</dd><dd>{money(result.annualIncomeSen)} ÷ {n(beneficiaries)} orang = {money(result.perCapitaSen)}/tahun/orang</dd></div>
    <div><dt class="font-semibold">Estimasi energi biogas</dt><dd>{gasEquivalentKwh === undefined ? 'Volume biogas × faktor kandungan energi' : 'Jumlah energi biogas tiap snapshot memakai faktor historisnya'}</dd><dd>{#if gasEquivalentKwh === undefined}{n(result.biogasM3)} m³ × {n(formula.biogasFactor)} kWh/m³ = {/if}{n(result.gasEquivalentKwh)} kWh-setara</dd></div>
    <div><dt class="font-semibold">Total energi setara</dt><dd>Listrik EBT non-biogas + estimasi energi biogas</dd><dd>{n(result.electricityKwh)} kWh + {n(result.gasEquivalentKwh)} kWh-setara = {n(result.equivalentKwh)} kWh-setara</dd></div>
  </dl>
  {#if !result.months || beneficiaries <= 0}<p class="mt-3 font-semibold">Per kapita belum dapat dihitung: diperlukan bulan dengan data lengkap dan penerima manfaat lebih dari nol.</p>{/if}
  <p class="mt-3 text-slate-600">Energi biogas adalah estimasi kandungan energi, bukan listrik terukur. Listrik yang dihasilkan dari biogas tidak dijumlahkan lagi. Kapasitas kWp/kW/m³ bukan produksi bulanan.</p>
  <p class="mt-2 break-words text-xs text-slate-600">Sumber/alasan faktor: {#if /^https:\/\//.test(formula.source)}<a class="underline" href={formula.source} target="_blank" rel="noreferrer">{formula.source}</a>{:else}{formula.source}{/if}</p>
  {:else}
    <p class="mt-1 text-slate-600">{result.months} bulan dilaporkan.</p>
    <dl class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div><dt class="text-slate-500">Total pendapatan</dt><dd class="font-semibold">{money(result.incomeSen)}</dd></div>
      <div><dt class="text-slate-500">Rata-rata pendapatan bulanan</dt><dd class="font-semibold">{money(result.averageIncomeSen)}</dd></div>
      <div><dt class="text-slate-500">Estimasi pendapatan tahunan</dt><dd class="font-semibold">{money(result.annualIncomeSen)}</dd></div>
      <div><dt class="text-slate-500">Estimasi per kapita per tahun</dt><dd class="font-semibold">{money(result.perCapitaSen)}</dd></div>
      <div><dt class="text-slate-500">Listrik EBT non-biogas</dt><dd class="font-semibold">{n(result.electricityKwh)} kWh</dd></div>
      <div><dt class="text-slate-500">Produksi biogas</dt><dd class="font-semibold">{n(result.biogasM3)} m&sup3;</dd></div>
    </dl>
  {/if}
</section>
