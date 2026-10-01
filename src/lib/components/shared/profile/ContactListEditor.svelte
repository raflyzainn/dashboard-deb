<script lang="ts">
  // Name and phone rows of one contact group, with add and delete.
  import { tick } from 'svelte';
  import { contactError, type Contact } from '$lib/contacts';
  import Button from '$lib/components/ui/Button.svelte';

  const MAX_ROWS = 20;
  const INPUT =
    'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[#17365f] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const INPUT_OK = 'border-[#cfe0f5] focus:border-[#075fc7] focus:ring-[#075fc7]/20';
  const INPUT_BAD = 'border-[#e0897b] focus:border-[#b3402e] focus:ring-[#b3402e]/20';
  const LABEL = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';

  let {
    contacts = $bindable<Contact[]>(),
    disabled = false,
    showErrors = false
  }: {
    contacts: Contact[];
    disabled?: boolean;
    /** Reveals the errors of every row, for a save attempt. */
    showErrors?: boolean;
  } = $props();

  const uid = $props.id();
  let touched = $state<boolean[]>([]);
  const full = $derived(contacts.length >= MAX_ROWS);

  // The form always offers one row to type into.
  $effect(() => {
    if (contacts.length === 0) contacts = [{ name: '', phone: '' }];
  });

  const isBlank = (contact: Contact) => !contact.name.trim() && !contact.phone.trim();
  const rowLabel = (contact: Contact, index: number) => contact.name.trim() || `kontak ${index + 1}`;

  async function focusName(index: number) {
    await tick();
    document.getElementById(`${uid}-name-${index}`)?.focus();
  }

  function add() {
    if (full) return;
    contacts = [...contacts, { name: '', phone: '' }];
    void focusName(contacts.length - 1);
  }

  function remove(index: number) {
    contacts = contacts.filter((_, i) => i !== index);
    touched = touched.filter((_, i) => i !== index);
    void focusName(Math.min(index, Math.max(contacts.length - 1, 0)));
  }

  function leaveRow(event: FocusEvent, index: number) {
    const row = event.currentTarget as HTMLElement;
    if (!row.contains(event.relatedTarget as Node | null)) touched[index] = true;
  }
</script>

<div class="@container">
  <ol class="m-0 list-none space-y-3 p-0">
    {#each contacts as contact, index}
      {@const error = touched[index] || showErrors ? contactError(contact) : ''}
      {@const phoneError = error.startsWith('Nomor')}
      <li class="rounded-lg border border-[#eaf1fb] bg-[#f8fbff] px-3 pt-3 pb-1.5" onfocusout={(event) => leaveRow(event, index)}>
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-[12px] font-semibold tracking-[0.06em] text-[#64748b] uppercase">Kontak {index + 1}</span>
          <Button
            variant="danger"
            size="sm"
            icon="trash"
            label={`Hapus ${rowLabel(contact, index)}`}
            disabled={disabled || (contacts.length === 1 && isBlank(contact))}
            onclick={() => remove(index)}
          />
        </div>
        <div class="grid gap-3 @[440px]:grid-cols-2">
          <div class="min-w-0">
            <label class={LABEL} for={`${uid}-name-${index}`}>Nama{#if contact.phone.trim()} <span class="text-red-600" aria-hidden="true">*</span>{/if}</label>
            <input
              id={`${uid}-name-${index}`}
              class={[INPUT, error && !phoneError ? INPUT_BAD : INPUT_OK]}
              type="text"
              autocomplete="off"
              maxlength="120"
              placeholder="Nama lengkap"
              aria-invalid={error && !phoneError ? 'true' : undefined}
              aria-describedby={error ? `${uid}-error-${index}` : undefined}
              required={Boolean(contact.phone.trim())} bind:value={contact.name}
              {disabled}
            />
          </div>
          <div class="min-w-0">
            <label class={LABEL} for={`${uid}-phone-${index}`}>Nomor telepon</label>
            <input
              id={`${uid}-phone-${index}`}
              class={[INPUT, phoneError ? INPUT_BAD : INPUT_OK]}
              type="tel"
              inputmode="tel"
              autocomplete="off"
              maxlength="24"
              placeholder="0812 3456 7890"
              aria-invalid={phoneError ? 'true' : undefined}
              aria-describedby={error ? `${uid}-error-${index}` : undefined}
              bind:value={contact.phone}
              {disabled}
            />
          </div>
        </div>
        <!-- The line keeps its height, so a message never moves the buttons under the pointer. -->
        <p id={`${uid}-error-${index}`} class="m-0 mt-1.5 min-h-[18px] text-[12px] leading-[18px] font-medium text-[#b3402e]" role="alert">
          {error}
        </p>
      </li>
    {/each}
  </ol>
  <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
    <Button variant="secondary" size="sm" icon="plus" disabled={disabled || full} onclick={add}>Tambah kontak</Button>
    {#if full}<span class="text-[12px] text-[#64748b]">Maksimal {MAX_ROWS} kontak.</span>{/if}
  </div>
</div>
