<script lang="ts">
  // A card that shows its content read only first. "Ubah" switches it to a form;
  // "Simpan" and "Batal" return it to the read only view.
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import Button from './Button.svelte';
  let {
    title,
    description = '',
    icon = '',
    editing = $bindable(false),
    canEdit = true,
    lockedReason = '',
    saving = false,
    dirty = true,
    editLabel = 'Ubah',
    saveLabel = 'Simpan perubahan',
    onEdit,
    onSave,
    onCancel,
    badge,
    view,
    edit
  }: {
    title: string;
    description?: string;
    icon?: string;
    editing?: boolean;
    /** False hides the edit button (for roles or states that may only read). */
    canEdit?: boolean;
    /** Shown instead of the edit button when editing is not possible right now. */
    lockedReason?: string;
    saving?: boolean;
    /** Save stays disabled until something changed. */
    dirty?: boolean;
    editLabel?: string;
    saveLabel?: string;
    onEdit?: () => void;
    /** Return true (or nothing) to close the form; false keeps it open. */
    onSave?: () => Promise<boolean | void> | boolean | void;
    /** Return false to keep the form open (for example while asking to discard changes). */
    onCancel?: () => boolean | void;
    badge?: Snippet;
    view: Snippet;
    edit: Snippet;
  } = $props();

  const uid = $props.id();
  function start() {
    onEdit?.();
    editing = true;
  }
  function cancel() {
    if (onCancel?.() === false) return;
    editing = false;
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (saving) return;
    const result = await onSave?.();
    if (result !== false) editing = false;
  }
</script>

<section
  aria-labelledby={`${uid}-title`}
  class={[
    'rounded-xl border bg-white shadow-[0_10px_30px_#1a4d8f08] transition-colors',
    editing ? 'border-[#9cc3ef] ring-4 ring-[#e9f3ff]' : 'border-[#dce7f7]'
  ]}
>
  <header class="flex items-start justify-between gap-3 border-b border-[#eaf1fb] px-5 py-4 max-[700px]:px-4">
    <div class="flex min-w-0 flex-1 items-start gap-3">
      {#if icon}<span
          class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f3ff] text-[#075fc7]"
          aria-hidden="true"><Icon name={icon} size={18} /></span
        >{/if}
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 id={`${uid}-title`} class="m-0 text-[16px] font-bold leading-snug text-[#0d234c]">{title}</h3>
          {#if editing}<span
              class="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]"
              >Sedang diubah</span
            >{/if}
          {#if badge}{@render badge()}{/if}
        </div>
        {#if description}<p class="m-0 mt-1 text-[13px] leading-[1.55] text-[#475569]">{description}</p>{/if}
      </div>
    </div>
    {#if !editing}
      {#if canEdit}
        <span class="shrink-0"><Button variant="secondary" size="sm" icon="edit" onclick={start}>{editLabel}</Button></span>
      {:else if lockedReason}
        <span class="max-w-[260px] text-right text-[12px] leading-[1.5] text-[#64748b]">{lockedReason}</span>
      {/if}
    {/if}
  </header>

  {#if editing}
    <form onsubmit={submit} novalidate>
      <div class="px-5 py-5 max-[700px]:px-4">{@render edit()}</div>
      <footer
        class="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-[#eaf1fb] bg-[#f8fbff] px-5 py-3 max-[700px]:px-4"
      >
        <span class="mr-auto text-[12px] text-[#64748b]"
          >{saving ? 'Menyimpan perubahan...' : dirty ? 'Ada perubahan yang belum disimpan.' : 'Belum ada perubahan.'}</span
        >
        <Button variant="ghost" size="sm" onclick={cancel} disabled={saving}>Batal</Button>
        <Button type="submit" size="sm" icon="save" loading={saving} disabled={!dirty}>{saveLabel}</Button>
      </footer>
    </form>
  {:else}
    <div class="px-5 py-5 max-[700px]:px-4">{@render view()}</div>
  {/if}
</section>
