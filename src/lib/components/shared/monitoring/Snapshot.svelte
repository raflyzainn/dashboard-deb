<script lang="ts">
  import { EVIDENCE, type MonitoringVersion } from '$lib/monitoring';
  import Button from '$lib/components/ui/Button.svelte';
  import FormulaPanel from './FormulaPanel.svelte';
  import { PROGRAM_READINESS_FIELDS } from '$lib/program-readiness';
  let { version, showFormula = true }: { version: MonitoringVersion; showFormula?: boolean } = $props();
  const snap = $derived(version.snapshot);
  const url = (id: string) => `/api/monitoring/${version.campus}/files/${id}`;
</script>
<div class="space-y-3 text-sm">
  <p>Kiriman {version.month}, versi {version.version}. {version.reviewerName ? `Diperiksa ${version.reviewerName}: ${version.note || 'Sesuai'}` : 'Menunggu pemeriksaan.'}</p>
  <p class="whitespace-pre-wrap">Catatan kampus: {snap.month.note || '—'}</p>
  <p>PLTS: {snap.program.solarKwp ?? 'Belum diisi'} kWp · EBT lainnya: {snap.program.otherKw ?? 'Belum diisi'} kW · Digester: {snap.program.digesterM3 ?? 'Belum diisi'} m³</p>
  <details class="rounded-lg border border-slate-200 p-3"><summary class="cursor-pointer font-semibold">Profil dan kesiapan pada saat dikirim</summary>
    <p class="mt-2">{String(snap.profile.programTitle || 'Judul belum diisi')} · {String(snap.profile.theme || '')}</p>
    <p>{['address', 'village', 'district', 'regency', 'province'].map(key => snap.profile[key]).filter(Boolean).join(', ')}</p>
    <p class="mt-2 whitespace-pre-wrap">{String(snap.profile.description || '')}</p>
    <dl class="mt-2 grid gap-2">{#each PROGRAM_READINESS_FIELDS as [key, label]}<div><dt class="font-semibold">{label}</dt><dd class="whitespace-pre-wrap">{String(snap.profile[key] || 'Belum diisi')}</dd></div>{/each}</dl>
  </details>
  <FormulaPanel {showFormula} rows={[snap.month]} beneficiaries={snap.program.beneficiaries || 0} formula={snap.formula} savedResult={snap.result} title="Perhitungan pada saat dikirim" />
  <div class="grid gap-3 sm:grid-cols-2">{#each EVIDENCE as [key, label]}
    <div class="min-w-0 rounded-lg border border-slate-200 p-3"><h4 class="font-semibold">{label}</h4>
      {#if snap.program.evidence[key].fileId}
        <Button size="sm" variant="secondary" icon="file" target="_blank" href={url(snap.program.evidence[key].fileId)}>Buka bukti</Button>
        {#if ['solar', 'reactor'].includes(key)}<img class="mt-2 max-h-48 max-w-full rounded-lg object-contain" src={url(snap.program.evidence[key].fileId)} alt={label} />{/if}
      {:else}<p class="text-amber-800">Belum tersedia / tidak berlaku: {snap.program.evidence[key].reason}</p>{/if}
    </div>
  {/each}</div>
  <div class="grid gap-3 sm:grid-cols-2">{#each snap.heroes as hero}<div class="rounded-lg border border-slate-200 p-3"><h4 class="font-semibold">{hero.name}</h4><p>{hero.phone}</p><p class="whitespace-pre-wrap">{hero.story}</p>{#if hero.photo}<img class="mt-2 max-h-40 max-w-full rounded-lg object-contain" src={url(hero.photo)} alt={`Foto ${hero.name}`} />{/if}</div>{/each}</div>
</div>
