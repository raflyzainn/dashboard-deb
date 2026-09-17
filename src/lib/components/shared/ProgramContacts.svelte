<script lang="ts">
  import type { ProgramProfile } from '$lib/types';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  let {
    program,
    campusId,
    readOnly = false
  }: { program?: ProgramProfile; campusId: string; readOnly?: boolean } = $props();
  const contacts = [
    ['mentor', 'Mentor'],
    ['coordinator', 'Koordinator PFS 12'],
    ['localHero', 'Local hero']
  ] as const;
  const details = [
    ['subholding', 'Subholding'],
    ['operatingUnit', 'Unit operasi Pertamina terdekat'],
    ['currentClass', 'Kategori kelas saat ini'],
    ['targetClass', 'Target kategori kelas'],
    ['actionPlanTemplate', 'Template rencana aksi'],
    ['replicationVillage', 'Desa replikasi'],
    ['sourceStatus', 'Status pada sumber'],
    ['description', 'Deskripsi program'],
    ['budget', 'Estimasi RAB'],
    ['address', 'Alamat program'],
    ['mapUrl', 'Tautan Google Maps'],
    ['coordinates', 'Koordinat lokasi'],
    ['province', 'Provinsi']
  ] as const;
  type Field = (typeof contacts)[number][0] | (typeof details)[number][0];
  let drafts = $state<Partial<Record<Field, string>>>({});
  let saving = $state(false);
  let message = $state('');
  let identity = $state('');
  $effect(() => {
    if (identity !== campusId) {
      identity = campusId;
      drafts = {};
      message = '';
    }
  });
  const value = (key: Field) => drafts[key] ?? String(program?.[key] ?? '');
  const dirty = $derived(Object.keys(drafts).length > 0);
  function edit(key: Field, input: string) {
    drafts[key] = input;
    message = '';
  }
  async function save() {
    if (saving || readOnly || !dirty) return;
    const values = { ...drafts },
      selected = campusId;
    saving = true;
    const saved = await app.mutate(
      () => dataService.updateProgram(selected, values),
      'Data program tersimpan.'
    );
    if (selected === campusId && saved && !app.stale) {
      for (const key of Object.keys(values) as Field[])
        if (drafts[key] === values[key]) delete drafts[key];
      drafts = { ...drafts };
      message = 'Perubahan tersimpan.';
    }
    saving = false;
  }
</script>

<section class="mt-[18px]" aria-label="Pendamping dan kontak program">
  <h3 class="m-0 mb-[10px] text-[13px] font-[650] text-[color:var(--navy)]">
    Pendamping dan kontak program
  </h3>
  <p class="mb-[12px] text-[11px] leading-[1.7] text-[#617a9a]">
    Data awal mengikuti Excel. Lengkapi atau perbarui isian, lalu simpan perubahan.
  </p>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void save();
    }}
  >
    <div class="grid grid-cols-3 gap-[12px] max-[900px]:grid-cols-1">
      {#each contacts as [key, label]}
        <label class="block min-w-0 rounded-[9px] border border-[#b9d9f5] bg-white p-[14px]">
          <span class="text-[11px] font-[650] text-[color:var(--navy)]">{label}</span>
          <textarea
            aria-label={label}
            class="mt-[8px] block min-h-[150px] w-full resize-y rounded-[7px] border border-[#9ecbf1] bg-white p-[10px] text-[12px] leading-[1.8] text-[#244568] focus:border-[#1681df] focus:outline-2 focus:outline-[#b9d9f5] disabled:bg-[#f7fbff]"
            rows="6"
            maxlength="10000"
            value={value(key)}
            oninput={(event) => edit(key, event.currentTarget.value)}
            disabled={readOnly || saving}></textarea>
        </label>
      {/each}
    </div>
    <section
      class="mt-[12px] rounded-[9px] border border-[#dce9f7] p-[14px] text-[11px] text-[#244568]"
    >
      <h3 class="m-0 text-[12px] font-[650]">Informasi rencana aksi lainnya</h3>
      <div class="mt-[12px] grid grid-cols-2 gap-[12px] max-[700px]:grid-cols-1">
        {#each details as [key, label]}
          <label class="block min-w-0">
            <span class="font-[650]">{label}</span>
            <textarea
              aria-label={label}
              class="mt-[6px] block w-full resize-y rounded-[7px] border border-[#9ecbf1] bg-white p-[10px] text-[12px] leading-[1.8] text-[#244568] focus:border-[#1681df] focus:outline-2 focus:outline-[#b9d9f5] disabled:bg-[#f7fbff]"
              rows={key === 'description' ? 6 : 2}
              maxlength="10000"
              value={value(key)}
              oninput={(event) => edit(key, event.currentTarget.value)}
              disabled={readOnly || saving}></textarea>
          </label>
        {/each}
      </div>
    </section>
    <div class="mt-[14px] flex flex-wrap items-center gap-[12px]">
      {#if !readOnly}<button
          class="rounded-[8px] bg-[#086bd6] px-[18px] py-[11px] text-[12px] font-[650] text-white hover:bg-[#0758b2] disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={!dirty || saving || app.busy}
          >{saving ? 'Menyimpan...' : 'Simpan data program'}</button
        >{/if}
      {#if dirty}<span class="text-[11px] text-[#986611]">Ada perubahan belum disimpan.</span>{/if}
      {#if message}<span class="text-[11px] text-[#17753c]" role="status">{message}</span>{/if}
    </div>
  </form>
</section>
