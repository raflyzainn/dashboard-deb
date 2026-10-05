<script lang="ts">
  // Program description, shown as points and edited as one point per line.
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ProgramDescription from '$lib/components/shared/ProgramDescription.svelte';
  import { saveProgram, text } from './program-form';

  const TITLE = 'Deskripsi program';
  let { value = '', campusId, canEdit = true }: { value?: string | null; campusId: string; canEdit?: boolean } = $props();

  const uid = $props.id();
  const stored = $derived(text(value).trim());
  let editing = $state(false);
  let saving = $state(false);
  let draft = $state('');
  const dirty = $derived(draft.trim() !== stored);

  async function save() {
    saving = true;
    const saved = await saveProgram(campusId, { description: draft.trim() });
    saving = false;
    return saved;
  }
</script>

<div role="group" aria-label={TITLE}>
  <EditableSection
    title={TITLE}
    description="Ringkasan program per poin."
    icon="proposal"
    bind:editing
    {canEdit}
    {saving}
    {dirty}
    onEdit={() => (draft = text(value))}
    onSave={save}
    onCancel={() => { draft = ''; }}
  >
    {#snippet view()}
      <div class="[&_p]:m-0 [&_p]:text-sm [&_ul]:m-0 [&_ul]:text-sm [&_ul]:leading-[1.65]"><ProgramDescription {value} /></div>
    {/snippet}
    {#snippet edit()}
      <label class="mb-1.5 block text-[13px] font-semibold text-[#17365f]" for={`${uid}-description`}>{TITLE}</label>
      <textarea
        id={`${uid}-description`}
        class="block w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm leading-[1.6] text-[#17365f] focus:border-[#075fc7] focus:ring-2 focus:ring-[#075fc7]/20 focus:outline-none disabled:bg-[#f5f9ff] disabled:text-[#64748b]"
        rows="8"
        maxlength="10000"
        aria-describedby={`${uid}-description-hint`}
        bind:value={draft}
        disabled={saving}
      ></textarea>
      <p id={`${uid}-description-hint`} class="m-0 mt-1 text-[12px] text-[#64748b]">Tulis satu poin per baris.</p>
    {/snippet}
  </EditableSection>
</div>
