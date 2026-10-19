<script lang="ts">
  import type { ProgramProfile } from '$lib/types';
  import { PROGRAM_READINESS_FIELDS } from '$lib/program-readiness';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import { changedValues, saveProgram, text } from './program-form';

  type Key = (typeof PROGRAM_READINESS_FIELDS)[number][0];
  type Draft = Record<Key, string>;
  let { program, campusId, canEdit = true, alwaysEdit = false }: { program?: ProgramProfile; campusId: string; canEdit?: boolean; alwaysEdit?: boolean } = $props();
  const uid = $props.id();
  const baseline = $derived(Object.fromEntries(PROGRAM_READINESS_FIELDS.map(([key]) => [key, text(program?.[key])])) as Draft);
  let draft = $state<Draft>(Object.fromEntries(PROGRAM_READINESS_FIELDS.map(([key]) => [key, ''])) as Draft);
  let editing = $state(false);
  let saving = $state(false);
  const changes = $derived(changedValues(draft, baseline));
  const dirty = $derived(Object.keys(changes).length > 0);

  async function save() {
    saving = true;
    const saved = await saveProgram(campusId, changes);
    saving = false;
    return saved;
  }
</script>

<EditableSection
  title="Indikator kesiapan rencana aksi"
  description="Jelaskan kondisi terkini dan kebutuhan program. Data tersimpan dapat dilihat oleh admin PF."
  icon="target"
  bind:editing
    {alwaysEdit}
  {canEdit}
  {saving}
  {dirty}
  onEdit={() => (draft = { ...baseline })}
  onSave={save}
  onCancel={() => { draft = { ...baseline }; }}
>
  {#snippet view()}
    <dl class="m-0 grid gap-x-8 gap-y-5 min-[700px]:grid-cols-2">
      {#each PROGRAM_READINESS_FIELDS as [key, label]}
        <ReadField {label} value={text(program?.[key])} multiline />
      {/each}
    </dl>
  {/snippet}
  {#snippet edit()}
    <div class="grid gap-5 min-[700px]:grid-cols-2">
      {#each PROGRAM_READINESS_FIELDS as [key, label]}
        <div class="min-w-0">
          <label class="mb-1.5 block text-[13px] font-semibold text-[#17365f]" for={`${uid}-${key}`}>{label}</label>
          <textarea id={`${uid}-${key}`} class="block w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm leading-6 text-[#17365f] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-[#f5f9ff]" rows="4" maxlength="2000" bind:value={draft[key]} disabled={saving}></textarea>
        </div>
      {/each}
    </div>
  {/snippet}
</EditableSection>
