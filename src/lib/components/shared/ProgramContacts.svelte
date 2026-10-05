<script lang="ts">
  // Program profile: every part is shown read only first and switches to a form through its own "Ubah" button.
  import type { ProgramProfile } from '$lib/types';
  import { app } from '$lib/state.svelte';
  import ContactSection from './profile/ContactSection.svelte';
  import LocationSection from './profile/LocationSection.svelte';
  import ProgramInfoSection from './profile/ProgramInfoSection.svelte';
  import DescriptionSection from './profile/DescriptionSection.svelte';

  let {
    program,
    campusId,
    readOnly = false
  }: {
    program?: ProgramProfile;
    campusId: string;
    readOnly?: boolean;
  } = $props();

  const GROUPS = [
    ['mentor', 'Mentor'],
    ['coordinator', 'Koordinator PFS 12'],
    ['localHero', 'Local hero']
  ] as const;
  const canEdit = $derived(!readOnly && !app.readOnly);
</script>

<!-- Another campus starts from fresh sections, so no draft carries over. -->
{#key campusId}
  <div class="space-y-5">
    <section class="@container" aria-label="Pendamping dan kontak program">
      <h3 class="m-0 text-[16px] font-bold text-[#0d234c]">Pendamping dan kontak program</h3>
      <p class="m-0 mt-1 text-[13px] leading-[1.55] text-[#475569]">Orang yang dapat dihubungi untuk program ini.</p>
      <!-- Three columns once every card is wide enough to keep its title and button on one row. -->
      <div class="mt-3 grid items-start gap-4 @[940px]:grid-cols-3">
        {#each GROUPS as [field, title]}
          <ContactSection {field} {title} value={program?.[field]} {campusId} {canEdit} />
        {/each}
      </div>
    </section>
    <LocationSection {program} {campusId} {canEdit} />
    <ProgramInfoSection {program} {campusId} {canEdit} />
    <DescriptionSection value={program?.description} {campusId} {canEdit} />
  </div>
{/key}
