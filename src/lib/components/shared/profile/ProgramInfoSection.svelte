<script lang="ts">
  // Program facts from the action plan, read only first.
  import type { ProgramProfile } from '$lib/types';
  import { PROGRAM_THEMATICS, THEMATIC_DESCRIPTION_LIMIT } from '$lib/program-thematics';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import { budgetDigits, changedValues, formatRupiah, groupDigits, onlyDigits, saveProgram, text } from './program-form';

  const TITLE = 'Informasi program';
  const FIELDS = [
    ['subholding', 'Subholding'],
    ['operatingUnit', 'Unit operasi Pertamina terdekat'],
    ['currentClass', 'Kategori kelas saat ini'],
    ['targetClass', 'Target kategori kelas'],
    ['actionPlanTemplate', 'Template rencana aksi'],
    ['replicationVillage', 'Desa replikasi'],
    ['sourceStatus', 'Status pada sumber']
  ] as const;
  type InfoKey = (typeof FIELDS)[number][0] | 'budget' | 'thematic' | 'thematicDescription';
  type Draft = Record<InfoKey, string>;

  const INPUT =
    'w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm text-[#17365f] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const LABEL = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';

  let { program, campusId, canEdit = true, alwaysEdit = false }: { program?: ProgramProfile; campusId: string; canEdit?: boolean; alwaysEdit?: boolean } = $props();

  const uid = $props.id();
  // Budget is kept as plain digits while editing and stored as "Rp 75.000.000".
  const baseline = $derived.by(() => {
    const values = { budget: budgetDigits(program?.budget), thematic: text(program?.thematic), thematicDescription: text(program?.thematicDescription) } as Draft;
    for (const [key] of FIELDS) values[key] = text(program?.[key]);
    return values;
  });
  const budgetView = $derived(formatRupiah(baseline.budget) || text(program?.budget).replace(/^-$/, ''));

  let editing = $state(false);
  let saving = $state(false);
  let draft = $state<Draft>({ ...emptyDraft() });
  const changes = $derived.by(() => {
    const { budget, ...rest } = changedValues(draft, baseline);
    return budget === undefined ? rest : { ...rest, budget: formatRupiah(budget) };
  });
  const dirty = $derived(Object.keys(changes).length > 0);

  function emptyDraft() {
    return Object.fromEntries([...FIELDS.map(([key]) => [key, '']), ['budget', ''], ['thematic', ''], ['thematicDescription', '']]) as Draft;
  }

  async function save() {
    saving = true;
    const saved = await saveProgram(campusId, changes);
    saving = false;
    return saved;
  }

  // Regroups the thousands while typing and keeps the caret after the same digit.
  function typeBudget(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const before = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, '').length;
    draft.budget = onlyDigits(input.value);
    const grouped = groupDigits(draft.budget);
    input.value = grouped;
    let caret = 0;
    for (let seen = 0; caret < grouped.length && seen < before; caret += 1) if (/\d/.test(grouped[caret])) seen += 1;
    input.setSelectionRange(caret, caret);
  }
</script>

<div role="group" aria-label={TITLE}>
  <EditableSection
    title={TITLE}
    description="Data rencana aksi program."
    icon="campus"
    bind:editing
    {alwaysEdit}
    {canEdit}
    {saving}
    {dirty}
    onEdit={() => (draft = { ...baseline })}
    onSave={save}
    onCancel={() => { draft = emptyDraft(); }}
  >
    {#snippet view()}
      <dl class="m-0 grid gap-x-8 gap-y-5 min-[700px]:grid-cols-2">
        <ReadField label="Tematik DEB" value={text(program?.thematic)} />
        <ReadField label="Penjelasan tematik" value={text(program?.thematicDescription)} multiline />
        {#each FIELDS as [key, label]}
          <ReadField {label} value={text(program?.[key])} multiline />
        {/each}
        <ReadField label="Estimasi RAB" value={budgetView} />
      </dl>
    {/snippet}
    {#snippet edit()}
      <div class="grid gap-x-5 gap-y-4 min-[700px]:grid-cols-2">
        <div class="min-w-0 min-[700px]:col-span-2">
          <label class={LABEL} for={`${uid}-thematic`}>Tematik DEB</label>
          <select id={`${uid}-thematic`} class={INPUT} bind:value={draft.thematic} disabled={saving} aria-describedby={`${uid}-thematic-hint`}>
            <option value="">Pilih tematik DEB</option>
            {#each PROGRAM_THEMATICS as thematic}<option value={thematic}>{thematic}</option>{/each}
          </select>
          <p id={`${uid}-thematic-hint`} class="m-0 mt-1 text-[12px] text-[#64748b]">Pilih satu tema utama program. Ekonomi dan ekonomi sirkular menjadi pendekatan pada ketiga tema.</p>
        </div>
        <div class="min-w-0 min-[700px]:col-span-2">
          <label class={LABEL} for={`${uid}-thematic-description`}>Penjelasan tematik</label>
          <textarea id={`${uid}-thematic-description`} class={INPUT} rows="3" maxlength={THEMATIC_DESCRIPTION_LIMIT} bind:value={draft.thematicDescription} disabled={saving} aria-describedby={`${uid}-thematic-description-hint`} placeholder="Jelaskan kegiatan program dan kaitannya dengan tema yang dipilih."></textarea>
          <p id={`${uid}-thematic-description-hint`} class="m-0 mt-1 text-[12px] text-[#64748b]">{draft.thematicDescription.length} / 1.000 karakter</p>
        </div>
        {#each FIELDS as [key, label]}
          <div class="min-w-0">
            <label class={LABEL} for={`${uid}-${key}`}>{label}</label>
            <input id={`${uid}-${key}`} class={INPUT} type="text" maxlength="300" autocomplete="off" bind:value={draft[key]} disabled={saving} />
          </div>
        {/each}
        <div class="min-w-0">
          <label class={LABEL} for={`${uid}-budget`}>Estimasi RAB</label>
          <div class="relative">
            <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-[#64748b]" aria-hidden="true">Rp</span>
            <input
              id={`${uid}-budget`}
              class={[INPUT, 'pl-10']}
              type="text"
              inputmode="numeric"
              autocomplete="off"
              placeholder="0"
              aria-describedby={`${uid}-budget-hint`}
              value={groupDigits(draft.budget)}
              oninput={typeBudget}
              disabled={saving}
            />
          </div>
          <p id={`${uid}-budget-hint`} class="m-0 mt-1 text-[12px] text-[#64748b]">Isi angka saja dalam Rupiah.</p>
        </div>
      </div>
    {/snippet}
  </EditableSection>
</div>
