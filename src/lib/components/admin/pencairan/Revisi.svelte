<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { KINDS, KIND_LABEL, KIND_SHORT, ITEM_STATE_LABEL, type Kind, type ItemState } from '$lib/pencairan';
  import type { KartuData, Doc, Version, Review, Check } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import { parseContacts, formatPhone, whatsappLink } from '$lib/contacts';

  /**
   * Ringkasan revisi: every item of one campus that needs revision, with its decision note, the automatic findings
   * and the whole conversation, on one page. For the admin who clarifies the revisions with the campus by phone or chat.
   * Read only; decisions and notes stay on the campus screen.
   */
  let { campusId }: { campusId: string } = $props();

  let data = $state<KartuData | null>(null);
  let error = $state('');
  let copied = $state(false);
  const full = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const day = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const dot: Record<ItemState, string> = { sesuai: 'bg-green-600', tidak_perlu: 'bg-green-200', perlu_konfirmasi: 'bg-[#0066B2]', menunggu_review: 'bg-sky-400', perlu_revisi: 'bg-amber-500', belum_ada: 'bg-white ring-1 ring-slate-300' };

  interface Item { kind: Kind; state: ItemState; doc: Doc | null; version: Version | null; decision: (Review & { version: number }) | null; checks: Check[] }
  const items = $derived.by<Item[]>(() => {
    if (!data) return [];
    const d = data;
    return KINDS.map(kind => {
      const doc = d.documents.find(x => x.kind === kind) || null;
      const version = doc ? doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1] || null : null;
      const reviews = doc ? [...doc.versions.flatMap(v => v.reviews.map(r => ({ ...r, version: v.number }))), ...(doc.reviews || []).map(r => ({ ...r, version: 0 }))].sort((a, b) => b.created.localeCompare(a.created)) : [];
      const decision = reviews.find(r => r.decision === 'perlu_revisi') || reviews[0] || null;
      return { kind, state: d.readiness.items[kind], doc, version, decision, checks: d.checks.filter(c => c.kind === kind && (c.level === 'bad' || c.level === 'warn')) };
    });
  });
  const revisi = $derived(items.filter(i => i.state === 'perlu_revisi'));
  const others = $derived(items.filter(i => i.state !== 'perlu_revisi'));
  const notesOf = (doc: Doc | null) => (doc ? [...doc.notes].sort((a, b) => a.created.localeCompare(b.created)) : []);
  /** Who to call about the revisions: the campus contacts from Profil DEB, in the order people usually ring them. */
  const GROUPS = [['coordinator', 'Koordinator PFS 12'], ['mentor', 'Mentor'], ['localHero', 'Local hero']] as const;
  const contacts = $derived(data ? GROUPS.map(([key, label]) => ({ key, label, people: parseContacts(data.campus.contacts[key]) })) : []);
  const anyContact = $derived(contacts.some(g => g.people.length));
  /** The checklist: the campus has been contacted about these revisions (when, by whom, and how it went). */
  const prop = (key: string) => (data && typeof data.disbursement.properties[key] === 'string' ? (data.disbursement.properties[key] as string) : '');
  const contactedAt = $derived(prop('kampusDihubungiPada'));
  const contactedBy = $derived(prop('kampusDihubungiOleh'));
  let contactNote = $state('');
  let savingContact = $state(false);
  $effect(() => { const n = prop('kampusDihubungiCatatan'); untrack(() => { contactNote = n; }); });
  async function saveContact(values: Record<string, string>) {
    savingContact = true;
    try { data = await dataService.api.patch<KartuData>(`/api/pencairan/${campusId}`, { properties: values }); error = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'Belum tersimpan.'; }
    finally { savingContact = false; }
  }
  const toggleContacted = () => saveContact({ kampusDihubungiPada: contactedAt ? '' : new Date().toISOString() });
  const saveContactNote = () => { if (contactNote.trim() !== prop('kampusDihubungiCatatan')) void saveContact({ kampusDihubungiCatatan: contactNote.trim().slice(0, 300) }); };

  /** Plain text for chat or email: the decision notes only, never the internal notes. */
  const summary = $derived.by(() => {
    if (!data) return '';
    const lines = [`Revisi dokumen Pencairan Tahap 1 · ${data.campus.name}`, ''];
    revisi.forEach((i, n) => { lines.push(`${n + 1}. ${KIND_LABEL[i.kind]}${i.version ? ` (versi ${i.version.number})` : ''}`); lines.push(`   ${i.decision?.note?.trim() || 'Perlu revisi, catatan menyusul.'}`); });
    if (!revisi.length) lines.push('Tidak ada butir yang perlu revisi.');
    return lines.join('\n');
  });

  async function load() {
    try { data = await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`); error = ''; }
    catch (e) { error = e instanceof Error ? e.message : 'Halaman belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => onChange(() => void load(), { campus: campusId }));
  async function copy() {
    try { await navigator.clipboard.writeText(summary); copied = true; setTimeout(() => (copied = false), 3000); } catch { error = 'Salin tidak berhasil. Pilih teks lalu salin.'; }
  }
</script>

{#if error && !data}
  <p class="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{error}</p>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat…</p>
{:else}
  <div class="grid gap-3 [&>*]:min-w-0">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 print:hidden">
      <a href={`/admin/pencairan/${campusId}`} class="inline-flex items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Layar kampus</a>
      <a href="/admin/pencairan/tahap-1" class="text-sm font-semibold text-slate-500 hover:underline">Tahap 1</a>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <CampusLogo code={data.campus.code} initials={data.campus.initials} size={40} />
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-slate-900">{data.campus.name}</h1>
        <p class="text-[13px] text-slate-500">Ringkasan revisi Pencairan Tahap 1 · Tahun {data.summary.programYear === 'kedua' ? 'Kedua' : 'Ketiga'}</p>
      </div>
      <span class="rounded-full px-3 py-1 text-sm font-bold {revisi.length ? 'bg-amber-100 text-amber-900' : 'bg-green-50 text-green-800'}">{revisi.length ? `${revisi.length} butir perlu revisi` : 'Tidak ada revisi'}</span>
      <div class="ml-auto flex flex-wrap gap-2 print:hidden">
        <button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50" onclick={copy}>{copied ? '✓ Tersalin' : 'Salin ringkasan'}</button>
        <button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50" onclick={() => window.print()}>Cetak</button>
      </div>
      {#if error}<span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800" role="alert">{error}</span>{/if}
    </div>

    <section class="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_30px_#0b254508]" aria-label="Kontak kampus">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><h2 class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Kontak kampus</h2><a href={`/admin/campuses/${campusId}`} class="text-[12.5px] font-semibold text-[#0066B2] hover:underline print:hidden">Ubah di Profil DEB</a></div>
      {#if anyContact}
        <div class="mt-2 grid gap-3 sm:grid-cols-3">
          {#each contacts as g (g.key)}
            <div class="min-w-0">
              <p class="text-[12px] font-semibold text-slate-500">{g.label}</p>
              {#if g.people.length}
                <ul class="mt-1 grid gap-1.5">
                  {#each g.people as person}
                    {@const wa = whatsappLink(person.phone)}
                    <li class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-slate-900">
                      <span class="font-semibold [overflow-wrap:anywhere]">{person.name || 'Tanpa nama'}</span>
                      {#if person.phone}
                        <a href={`tel:${person.phone.startsWith('+') ? person.phone : person.phone.replace(/^0/, '+62')}`} class="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-semibold tabular-nums text-slate-800 hover:border-[#0066B2] hover:text-[#0066B2] print:border-0 print:px-0">{formatPhone(person.phone)}</a>
                        {#if wa}<a href={wa} target="_blank" rel="noopener" class="inline-flex min-h-[30px] items-center rounded-lg bg-green-700 px-2.5 text-[12.5px] font-semibold text-white hover:bg-green-800 print:hidden">WhatsApp</a>{/if}
                      {:else}<span class="text-[12.5px] text-slate-500">Nomor belum diisi</span>{/if}
                    </li>
                  {/each}
                </ul>
              {:else}<p class="mt-1 text-[13px] text-slate-500">Belum diisi.</p>{/if}
            </div>
          {/each}
        </div>
      {:else}
        <p class="mt-1 text-[13px] text-slate-500">Kontak kampus belum diisi. Lengkapi mentor, koordinator, dan local hero di Profil DEB.</p>
      {/if}
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        <label class="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-[14px] font-semibold {contactedAt ? 'border-green-200 bg-green-50 text-green-900' : 'border-slate-300 bg-white text-slate-800'}">
          <input type="checkbox" class="h-4 w-4 accent-green-700" checked={Boolean(contactedAt)} disabled={savingContact} onchange={toggleContacted} />
          Kampus sudah dihubungi
        </label>
        {#if contactedAt}<span class="text-[12.5px] text-slate-600">{contactedBy || 'Sistem'} · {full.format(new Date(contactedAt))}</span>{/if}
        <input class="min-h-[38px] min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 text-[13.5px] text-slate-900 print:border-0 print:px-0" bind:value={contactNote} maxlength="300" placeholder="Lewat apa dan hasilnya, misalnya WhatsApp ke koordinator, revisi dikirim Senin" aria-label="Catatan hubungan dengan kampus" onblur={saveContactNote} onkeydown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }} />
      </div>
    </section>

    {#if revisi.length}
      <ol class="grid gap-3">
        {#each revisi as i, n (i.kind)}
          <li class="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-[0_10px_30px_#0b254508]">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-100 bg-amber-50/60 px-4 py-2.5">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-amber-500 text-[13px] font-bold text-white">{n + 1}</span>
              <h2 class="text-[16px] font-bold text-slate-900">{KIND_LABEL[i.kind]}</h2>
              {#if i.version}<span class="text-[12.5px] text-slate-600">Versi {i.version.number} · {day.format(new Date(i.version.created))} · <span class="[overflow-wrap:anywhere]">{i.version.originalName}</span></span>{/if}
              <a href={`/admin/pencairan/${campusId}?butir=${i.kind}`} class="ml-auto text-[13px] font-semibold text-[#0066B2] hover:underline print:hidden">Buka butir</a>
            </div>
            <div class="grid gap-3 px-4 py-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.06em] text-amber-800">Catatan keputusan{#if i.decision}<span class="ml-2 font-medium normal-case tracking-normal text-slate-500">{i.decision.imported ? 'Lembar review' : i.decision.actorName} · {full.format(new Date(i.decision.created))}</span>{/if}</p>
                <p class="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{i.decision?.note?.trim() || 'Belum ada catatan keputusan. Tulis di butirnya.'}</p>
              </div>
              {#if i.checks.length}
                <div class="flex flex-wrap gap-1.5">
                  {#each i.checks as c}<span class="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold {c.level === 'bad' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}">! {c.text.replace(/\.$/, '')}</span>{/each}
                </div>
              {/if}
              {#if notesOf(i.doc).length}
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Catatan</p>
                  <div class="mt-1.5 grid gap-1.5">
                    {#each notesOf(i.doc) as m (m.id)}
                      <div class="rounded-lg px-3 py-2 {m.internal ? 'bg-amber-50 ring-1 ring-amber-200' : m.authorRole === 'campus' ? 'bg-blue-50' : 'bg-slate-50'}">
                        <span class="text-[12px] font-semibold text-slate-500">{m.authorName}{m.authorRole === 'campus' ? ' (kampus)' : ''} · {full.format(new Date(m.created))}{m.internal ? ' · internal, tidak tampil ke kampus' : ''}</span>
                        <p class="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{m.body}</p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="rounded-2xl border border-green-200 bg-green-50/60 px-4 py-3 text-[14px] text-green-900">Tidak ada butir yang perlu revisi untuk kampus ini. Butir yang belum selesai tampil di bawah.</p>
    {/if}

    <div class="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-[0_10px_30px_#0b254508]">
      <p class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Butir lain</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        {#each others as i (i.kind)}
          <a href={`/admin/pencairan/${campusId}?butir=${i.kind}`} class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-800 hover:border-[#0066B2] hover:text-[#0066B2]" title={ITEM_STATE_LABEL[i.state]}><span class="h-2 w-2 rounded-full {dot[i.state]}"></span>{KIND_SHORT[i.kind]}<span class="font-medium text-slate-500">· {ITEM_STATE_LABEL[i.state]}</span></a>
        {/each}
      </div>
    </div>

    <details class="print:hidden">
      <summary class="cursor-pointer text-[12.5px] font-semibold text-slate-500">Teks ringkasan yang disalin</summary>
      <pre class="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-700">{summary}</pre>
    </details>
  </div>
{/if}
