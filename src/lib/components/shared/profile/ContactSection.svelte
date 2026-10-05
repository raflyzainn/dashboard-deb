<script lang="ts">
  import { reportError } from '$lib/feedback';
  // One contact group (mentor, koordinator or local hero): a read only list first, name and phone rows on "Ubah".
  import { tick } from 'svelte';
  import {
    contactError,
    formatPhone,
    parseContacts,
    serializeContacts,
    whatsappLink,
    type Contact
  } from '$lib/contacts';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import ContactListEditor from './ContactListEditor.svelte';
  import NewTabLink from './NewTabLink.svelte';
  import { saveProgram, type ProgramValues } from './program-form';

  let {
    title,
    field,
    value = '',
    icon = '',
    campusId,
    canEdit = true
  }: {
    title: string;
    field: 'mentor' | 'coordinator' | 'localHero';
    /** The stored text of the group, one string for all people. */
    value?: string | null;
    icon?: string;
    campusId: string;
    canEdit?: boolean;
  } = $props();

  const people = $derived(parseContacts(value));
  const stored = $derived(serializeContacts(people));

  let editing = $state(false);
  let saving = $state(false);
  let showErrors = $state(false);
  let draft = $state<Contact[]>([]);
  let form = $state<HTMLElement>();
  const dirty = $derived(serializeContacts(draft) !== stored);

  function start() {
    draft = people.map((person) => ({ ...person }));
    showErrors = false;
  }

  async function save() {
    if (draft.some((contact) => contactError(contact))) {
      showErrors = true;
      reportError(`${title}: ${draft.map(contactError).find(Boolean)}`);
      await tick();
      form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return false;
    }
    saving = true;
    const values: ProgramValues = {};
    values[field] = serializeContacts(draft);
    const saved = await saveProgram(campusId, values);
    saving = false;
    return saved;
  }
</script>

<div role="group" aria-label={title}>
  <EditableSection {title} {icon} bind:editing {canEdit} {saving} {dirty} onEdit={start} onSave={save} onCancel={() => { draft = []; }}>
    {#snippet badge()}
      {#if !editing && people.length}
        <span
          class="min-w-6 rounded-full bg-[#e9f3ff] px-2 py-0.5 text-center text-[12px] font-semibold text-[#075fc7]"
          aria-label={`${people.length} kontak`}>{people.length}</span
        >
      {/if}
    {/snippet}
    {#snippet view()}
      {#if people.length}
        <ul class="m-0 list-none space-y-4 p-0">
          {#each people as person}
            {@const phone = formatPhone(person.phone)}
            {@const link = whatsappLink(person.phone)}
            <li class="flex gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f9ff] text-[#075fc7] ring-1 ring-[#dce7f7]"
                aria-hidden="true"><Icon name="user" size={15} /></span
              >
              <div class="min-w-0 flex-1">
                <p class="m-0 text-sm leading-[1.5] font-semibold text-[#17365f] [overflow-wrap:anywhere]">
                  {person.name || 'Nama belum diisi'}
                </p>
                <div class="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <span class={['text-[13px]', phone ? 'text-[#475569]' : 'text-[#64748b]']}>{phone || 'Nomor belum diisi'}</span>
                  {#if link}
                    <NewTabLink href={link} icon="phone" label={`WhatsApp ${person.name || phone}`}>WhatsApp</NewTabLink>
                  {/if}
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="rounded-lg border border-dashed border-[#cfe0f5] bg-[#f8fbff] px-4 py-5 text-center">
          <p class="m-0 text-sm font-semibold text-[#17365f]">Belum ada kontak</p>
          {#if canEdit}<p class="m-0 mt-1 text-[13px] text-[#64748b]">Pilih Ubah untuk menambahkan.</p>{/if}
        </div>
      {/if}
    {/snippet}
    {#snippet edit()}
      <div bind:this={form}>
        <ContactListEditor bind:contacts={draft} disabled={saving} {showErrors} />
      </div>
    {/snippet}
  </EditableSection>
</div>
