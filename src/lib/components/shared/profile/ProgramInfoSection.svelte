<script lang="ts">
  // Program facts from the action plan, read only first.
  import type { ProgramProfile } from '$lib/types';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import { budgetDigits, changedValues, formatRupiah, groupDigits, onlyDigits, saveProgram, text } from './program-form';

  const TITLE = 'Informasi program';
  const FIELDS = [
    ['pfTeam', 'Tim pendamping'],
    ['subholding', 'Subholding'],
    ['operatingUnit', 'Unit operasi Pertamina terdekat'],
    ['currentClass', 'Kategori kelas saat ini'],
    ['targetClass', 'Target kategori kelas'],
    ['actionPlanTemplate', 'Template rencana aksi'],
    ['replicationVillage', 'Desa replikasi'],
    ['sourceStatus', 'Status pada sumber']
  ] as const;
  type InfoKey = (typeof FIELDS)[number][0] | 'budget';
  type Draft = Record<InfoKey, string>;

  const INPUT =
    'w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm text-[#17365f] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const LABEL = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';

  let { program, campusId, canEdit = true }: { program?: ProgramProfile; campusId: string; canEdit?: boolean } = $props();

  const uid = $props.id();
  // Budget is kept as plain digits while editing and stored as "Rp 75.000.000".
  const baseline = $derived.by(() => {
    const values = { budget: budgetDigits(program?.budget) } as Draft;
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
    return Object.fromEntries([...FIELDS.map(([key]) => [key, '']), ['budget', '']]) as Draft;
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
    {canEdit}
    {saving}
    {dirty}
    onEdit={() => (draft = { ...baseline })}
    onSave={save}
    onCancel={() => (draft = emptyDraft())}
  >
    {#snippet view()}
      <dl class="m-0 grid gap-x-8 gap-y-5 min-[700px]:grid-cols-2">
        {#each FIELDS as [key, label]}
          <ReadField {label} value={text(program?.[key])} multiline />
        {/each}
        <ReadField label="Estimasi RAB" value={budgetView} />
      </dl>
    {/snippet}
    {#snippet edit()}
      <div class="grid gap-x-5 gap-y-4 min-[700px]:grid-cols-2">
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
