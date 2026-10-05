<script lang="ts">
  import RegionSelect from '$lib/components/ui/RegionSelect.svelte';
  import { regionLine } from '$lib/location';
  import { programRegion, pickProgramRegion } from '$lib/pengajuan/location';

  let { fields = $bindable(), disabled = false }: { fields: Record<string, string>; disabled?: boolean } = $props();
  const uid = $props.id();
  const region = $derived(programRegion(fields));
  const generated = $derived(region.villageId ? regionLine(region) : '');
</script>

<fieldset class="min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 p-4" {disabled}>
  <legend class="px-1 text-sm font-bold text-slate-900">Lokasi program</legend>
  <p class="mb-4 text-sm text-slate-600">Pilih wilayah tempat kegiatan dilaksanakan.</p>
  {#if !region.provinceId && regionLine(region)}
    <p class="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
      Lokasi sebelumnya: {regionLine(region)}. Pilih wilayah untuk melengkapi alamat program.
    </p>
  {/if}
  <RegionSelect bind:value={() => region, next => fields = pickProgramRegion(fields, next)} {disabled} required />
  <div class="mt-4">
    <label for={`${uid}-address`} class="mb-1.5 block text-[13px] font-semibold text-[#17365f]">
      Alamat lengkap lokasi program <span class="text-red-600" aria-hidden="true">*</span>
    </label>
    <textarea
      id={`${uid}-address`}
      class="w-full rounded-lg border border-[#cfe0f5] bg-white px-3 py-2.5 text-sm focus:border-[#075fc7] focus:outline-none focus:ring-2 focus:ring-[#075fc7]/20 disabled:bg-slate-50 disabled:text-slate-500"
      rows="3" maxlength="2000" required
      disabled={disabled || !region.villageId && !fields.lokasiAlamatLengkap}
      bind:value={fields.lokasiAlamatLengkap}
      aria-describedby={`${uid}-hint`}
      placeholder="Pilih desa/kelurahan terlebih dahulu"
    ></textarea>
    <p id={`${uid}-hint`} class="mt-1.5 text-xs text-slate-500">
      Terisi otomatis setelah desa/kelurahan dipilih. Tambahkan nama jalan, nomor, RT/RW, atau patokan.
    </p>
    {#if generated && fields.lokasiAlamatLengkap !== generated}
      <p class="mt-2 text-xs text-slate-600">Alamat yang Anda edit tetap dipertahankan. Pastikan sesuai dengan wilayah yang dipilih.</p>
      <button type="button" class="mt-2 min-h-11 text-sm font-semibold text-[#0066B2] underline underline-offset-2 disabled:opacity-50"
        {disabled} onclick={() => fields.lokasiAlamatLengkap = generated}>Susun ulang dari wilayah</button>
    {/if}
  </div>
</fieldset>
