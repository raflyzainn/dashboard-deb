<script lang="ts">
  import { untrack } from 'svelte';
  import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max';
  import { parseContactPhone } from '$lib/contacts';

  let { value = $bindable(''), id, disabled = false, invalid = false, describedBy }: {
    value: string; id: string; disabled?: boolean; invalid?: boolean; describedBy?: string;
  } = $props();
  const names = new Intl.DisplayNames(['id'], { type: 'region' });
  const countries = getCountries().map(code => ({ code, label: names.of(code) || code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'));
  let country = $state<CountryCode>('ID');
  let national = $state('');
  let lastValue = $state<string>();

  // Refresh saved/cancelled values without moving the caret while the user types.
  $effect(() => {
    const next = value;
    if (next === untrack(() => lastValue)) return;
    const phone = parseContactPhone(next);
    country = phone?.country || 'ID';
    national = phone?.nationalNumber || next;
    lastValue = next;
  });

  function update() {
    const phone = parseContactPhone(national, country);
    if (national.trim().startsWith('+') && phone?.country) country = phone.country;
    const next = !national.trim() ? '' : phone?.number || `+${getCountryCallingCode(country)}${national}`;
    lastValue = next;
    value = next;
  }

  function changeCountry() {
    if (national.trim().startsWith('+')) national = parseContactPhone(national)?.nationalNumber || national;
    update();
  }
</script>

<div class={['flex min-w-0 overflow-hidden rounded-lg border bg-white focus-within:border-[#075fc7] focus-within:ring-2 focus-within:ring-[#075fc7]/20', invalid ? 'border-[#e0897b]' : 'border-[#cfe0f5]', disabled ? 'bg-[#f5f9ff]' : '']}>
  <div class="relative flex w-12 shrink-0 items-center justify-center gap-1 border-r border-[#cfe0f5] bg-[#f8fbff]" title={`${names.of(country)} (+${getCountryCallingCode(country)})`}>
    <img src={`https://flagcdn.com/${country.toLowerCase()}.svg`} alt="" class="h-3.5 w-5 rounded-[2px] object-cover" />
    <span aria-hidden="true" class="text-[10px] text-[#64748b]">▾</span>
    <select aria-label="Negara nomor WhatsApp" class="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" bind:value={country} onchange={changeCountry} {disabled}>
    {#each countries as option}
      <option value={option.code}>{option.label} (+{option.dial})</option>
    {/each}
    </select>
  </div>
  <input {id} type="tel" inputmode="tel" autocomplete="tel-national" maxlength="30"
    class="min-h-9 w-full min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm text-[#17365f] outline-none disabled:text-[#64748b]"
    placeholder={country === 'ID' ? '812 3456 7890' : 'Nomor tanpa kode negara'}
    aria-invalid={invalid || undefined} aria-describedby={describedBy}
    bind:value={national} oninput={update} {disabled} />
</div>
