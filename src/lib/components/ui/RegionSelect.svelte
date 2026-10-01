<script module lang="ts">
  import { asset } from '$app/paths';

  type RegionItem = { id: string; name: string; zip?: string };

  // Shared by every instance, so a list is downloaded once per visit.
  const requests = new Map<string, Promise<unknown>>();

  function getJson(path: string): Promise<unknown> {
    const url = asset(`/data/regions/${path}.json`);
    let request = requests.get(url);
    if (!request) {
      request = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
        return response.json();
      });
      // A failed request must not stay cached, otherwise "Coba lagi" could never succeed.
      request.catch(() => requests.delete(url));
      requests.set(url, request);
    }
    return request;
  }

  const expandName = (name: string) => (name.startsWith('Kab ') ? `Kabupaten ${name.slice(4)}` : name);

  function toItems(data: unknown): RegionItem[] {
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => ({ id: String(item.id), name: expandName(String(item.name)), zip: item.zip ? String(item.zip) : '' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }
</script>

<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { untrack } from 'svelte';
  import { emptyRegion, type RegionValue } from '$lib/location';

  type Level = 'province' | 'regency' | 'district' | 'village';

  let {
    value = $bindable<RegionValue>(),
    disabled = false,
    onchange
  }: { value: RegionValue; disabled?: boolean; onchange?: () => void } = $props();

  const uid = $props.id();
  const region = $derived<RegionValue>({ ...emptyRegion(), ...(value ?? {}) });

  let lists = $state<Record<Level, RegionItem[]>>({ province: [], regency: [], district: [], village: [] });
  let loading = $state<Record<Level, boolean>>({ province: false, regency: false, district: false, village: false });
  let failed = $state<Record<Level, boolean>>({ province: false, regency: false, district: false, village: false });

  // Plain bookkeeping: which parent each list belongs to, and a counter that drops stale responses.
  const loadedFor: Record<Level, string | null> = { province: null, regency: null, district: null, village: null };
  const tokens: Record<Level, number> = { province: 0, regency: 0, district: 0, village: 0 };

  async function fetchItems(level: Level, parentId: string): Promise<RegionItem[]> {
    if (level === 'province') return toItems(await getJson('provinces'));
    if (level === 'regency') return toItems(await getJson(`regencies/${parentId}`));
    if (level === 'district') return toItems(await getJson(`districts/${parentId}`));
    // Village files are stored per regency and keyed by district id.
    const regencyId = parentId.split('.').slice(0, 2).join('.');
    const byDistrict = (await getJson(`villages/${regencyId}`)) as Record<string, unknown>;
    return toItems(byDistrict?.[parentId]);
  }

  async function load(level: Level, parentId: string) {
    const token = ++tokens[level];
    lists[level] = [];
    failed[level] = false;
    loading[level] = Boolean(parentId);
    if (!parentId) return;
    try {
      const items = await fetchItems(level, parentId);
      if (token !== tokens[level]) return;
      lists[level] = items;
    } catch (error) {
      if (token !== tokens[level]) return;
      console.warn(`RegionSelect: ${level} list failed to load`, error);
      failed[level] = true;
      reportError('Daftar wilayah belum dapat dimuat. Periksa koneksi dan tekan Coba lagi pada pilihan wilayah.');
    }
    loading[level] = false;
  }

  function ensure(level: Level, parentId: string, force = false) {
    if (!force && loadedFor[level] === parentId) return;
    loadedFor[level] = parentId;
    void load(level, parentId);
  }

  // Runs on mount and whenever the parent swaps in another address.
  $effect(() => {
    const { provinceId, regencyId, districtId } = region;
    untrack(() => {
      ensure('province', 'all');
      ensure('regency', provinceId);
      ensure('district', regencyId);
      ensure('village', districtId);
    });
  });

  function commit(next: RegionValue) {
    value = next;
    onchange?.();
  }

  function pick(level: Level, id: string) {
    const item = lists[level].find((entry) => entry.id === id);
    const name = item?.name ?? '';
    const blank = emptyRegion();
    if (level === 'province') return commit({ ...blank, provinceId: id, province: name });
    if (level === 'regency') {
      return commit({ ...blank, provinceId: region.provinceId, province: region.province, regencyId: id, regency: name });
    }
    if (level === 'district') {
      return commit({ ...region, districtId: id, district: name, villageId: '', village: '', postalCode: '' });
    }
    commit({ ...region, villageId: id, village: name, postalCode: item?.zip ?? '' });
  }

  function typePostalCode(event: Event & { currentTarget: HTMLInputElement }) {
    const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 5);
    event.currentTarget.value = digits;
    if (digits !== region.postalCode) commit({ ...region, postalCode: digits });
  }

  const fields = $derived([
    {
      level: 'province' as Level,
      label: 'Provinsi',
      placeholder: 'Pilih provinsi',
      waiting: '',
      parentId: 'all',
      id: region.provinceId,
      name: region.province
    },
    {
      level: 'regency' as Level,
      label: 'Kabupaten/Kota',
      placeholder: 'Pilih kabupaten/kota',
      waiting: 'Pilih provinsi dahulu',
      parentId: region.provinceId,
      id: region.regencyId,
      name: region.regency
    },
    {
      level: 'district' as Level,
      label: 'Kecamatan',
      placeholder: 'Pilih kecamatan',
      waiting: 'Pilih kabupaten/kota dahulu',
      parentId: region.regencyId,
      id: region.districtId,
      name: region.district
    },
    {
      level: 'village' as Level,
      label: 'Desa/Kelurahan',
      placeholder: 'Pilih desa/kelurahan',
      waiting: 'Pilih kecamatan dahulu',
      parentId: region.districtId,
      id: region.villageId,
      name: region.village
    }
  ]);

  const controlClass =
    'w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm text-[#17365f] focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-[#f5f9ff] disabled:text-[#64748b]';
  const labelClass = 'mb-1.5 block text-[13px] font-semibold text-[#17365f]';
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {#each fields as field (field.level)}
    {@const items = lists[field.level]}
    {@const busy = loading[field.level]}
    <div class="min-w-0">
      <label class={labelClass} for="{uid}-{field.level}">
        {field.label}
        {#if busy}
          <span
            class="ml-1 inline-block size-3 animate-spin rounded-full border-2 border-[#9cc3ef] border-t-transparent align-[-1px]"
            aria-hidden="true"
          ></span>
        {/if}
      </label>
      <select
        id="{uid}-{field.level}"
        class={controlClass}
        value={field.id}
        disabled={disabled || !field.parentId || busy || failed[field.level]}
        aria-busy={busy}
        aria-describedby={failed[field.level] ? `${uid}-${field.level}-error` : undefined}
        onchange={(event) => pick(field.level, event.currentTarget.value)}
      >
        <option value="">{!field.parentId ? field.waiting : busy ? 'Memuat daftar…' : field.placeholder}</option>
        <!-- Keeps the saved name visible until its list arrives. -->
        {#if field.id && !items.some((item) => item.id === field.id)}
          <option value={field.id}>{field.name || 'Memuat daftar…'}</option>
        {/if}
        {#each items as item (item.id)}
          <option value={item.id}>{item.name}</option>
        {/each}
      </select>
      {#if failed[field.level]}
        <p id="{uid}-{field.level}-error" class="mt-1.5 text-[13px] leading-snug text-[#b3402e]" role="alert">
          Daftar belum dapat dimuat.
          <button
            type="button"
            class="cursor-pointer rounded font-semibold text-[#075fc7] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#55a9f2]"
            onclick={() => ensure(field.level, field.parentId, true)}>Coba lagi</button
          >
        </p>
      {/if}
    </div>
  {/each}

  <div class="min-w-0">
    <label class={labelClass} for="{uid}-postal">Kode pos</label>
    <input
      id="{uid}-postal"
      class={controlClass}
      type="text"
      inputmode="numeric"
      autocomplete="postal-code"
      maxlength="5"
      pattern={'[0-9]{5}'}
      placeholder="5 angka"
      value={region.postalCode}
      {disabled}
      aria-describedby="{uid}-postal-hint"
      oninput={typePostalCode}
    />
    <p id="{uid}-postal-hint" class="mt-1.5 text-[13px] leading-snug text-[#64748b]">
      Terisi saat desa/kelurahan dipilih. Ubah bila kode pos berbeda.
    </p>
  </div>
</div>
