<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { pollVisible } from '$lib/polling';
  import { campusUploadBlockedReason, CAMPUS_STATE_LABEL } from '$lib/pencairan';
  import { KINDS, STAGES, KIND_LABEL, KIND_SHORT, KIND_FILE, LOOK_AT, FIELDS, DECISION_LABEL, RAIL_WORD, ITEM_STATE_LABEL, RAB_SHARE, isRabKind, formatSen, parseSen, type Kind, type ItemState } from '$lib/pencairan';
  import type { KartuData, Version, Check } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import FileViewer from './FileViewer.svelte';
  import RabTable from './RabTable.svelte';
  import TandaTanganView from './TandaTanganView.svelte';
  import LampiranView from './LampiranView.svelte';
  import PembayaranView from './PembayaranView.svelte';
  import RiwayatSheet from './RiwayatSheet.svelte';

  /**
   * The campus screen: the items on the left, the document in the middle, one action bar at the bottom.
   * Nine items (SK first, then the eight columns of the review sheet) and three closing rows. Every decision is one click.
   * mode campus: the same screen read only, with an upload button where a file is needed.
   */
  type Row = Kind | 'ttd' | 'lampiran' | 'bayar';
  const CLOSING: { key: Row; label: string }[] = [{ key: 'ttd', label: 'Tanda tangan' }, { key: 'lampiran', label: 'Lampiran' }, { key: 'bayar', label: 'Pembayaran' }];
  let { campusId, mode = 'admin' }: { campusId: string; mode?: 'admin' | 'campus' } = $props();

  let data = $state<KartuData | null>(null);
  let error = $state('');
  let notice = $state('');
  let busy = $state(false);
  let refresh = $state(0);
  let selectedVersionId = $state('');
  let draft = $state<Record<string, string | boolean>>({});
  let saved = $state('');
  let noteInput = $state<HTMLTextAreaElement | null>(null);
  let noteBody = $state('');
  let noteInternal = $state(false);
  let threadEl = $state<HTMLDivElement | null>(null);
  let reviewNote = $state('');
  let bankNameSeen = $state('');
  /** True while the admin reopens the buttons on an item that already has a decision. */
  let editing = $state(false);
  let showLook = $state(false);
  let showRiwayat = $state(false);
  let rabTab = $state<'digital' | 'asli'>('digital');
  let docHeight = $state(560);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let fileInput = $state<HTMLInputElement | null>(null);
  let uploadFile = $state<File | null>(null);
  let uploadNote = $state('');
  let loadGeneration = 0;
  let railThumb = $state({ width: 100, left: 0 });
  function trackRail(node: HTMLElement) {
    const update = () => {
      railThumb = { width: node.clientWidth / node.scrollWidth * 100, left: node.scrollLeft / node.scrollWidth * 100 };
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener('scroll', update, { passive: true });
    update();
    return { destroy() { observer.disconnect(); node.removeEventListener('scroll', update); } };
  }

  const admin = $derived(mode === 'admin');
  const base = $derived(admin ? `/admin/pencairan/${campusId}` : '/campus/pencairan');
  const belumAda = $derived(data ? KINDS.filter(k => data!.readiness.items[k] === 'belum_ada') : []);
  const perluRevisi = $derived(data ? KINDS.filter(k => data!.readiness.items[k] === 'perlu_revisi') : []);
  const menungguPf = $derived(data ? KINDS.filter(k => ['menunggu_review', 'perlu_konfirmasi'].includes(data!.readiness.items[k])) : []);
  const campusStages = $derived(data?.disbursement.paidAt ? [...STAGES, 'Dana dibayar'] : [...STAGES]);
  const campusStage = $derived(data?.disbursement.paidAt ? campusStages.length : Math.max(1, Math.min(STAGES.length, data?.disbursement.stage || 1)));
  const nextCampusUpload = $derived.by(() => {
    if (!data) return null;
    const kind = [...perluRevisi, ...belumAda].find(k => {
      const doc = data!.documents.find(d => d.kind === k);
      const version = doc?.versions.find(v => v.id === doc.currentVersionId);
      return !version?.signed && !campusUploadBlockedReason(k, data!.readiness.items[k], doc || null, Boolean(data!.disbursement.paidAt));
    });
    return kind ? { kind, state: data.readiness.items[kind] } : null;
  });
  const nextRevision = $derived.by(() => {
    const kind = nextCampusUpload?.state === 'perlu_revisi' ? nextCampusUpload.kind : null;
    if (!kind) return null;
    const doc = data?.documents.find(d => d.kind === kind);
    const version = doc?.versions.find(v => v.id === doc.currentVersionId);
    const review = [...(doc?.reviews || []), ...(version?.reviews || [])]
      .filter(r => r.decision === 'perlu_revisi' && r.note)
      .sort((a, b) => b.created.localeCompare(a.created))[0];
    return review ? { kind, note: review.note } : null;
  });
  const uploadBlocked = $derived(campusUploadBlockedReason(kind, state, doc, Boolean(data?.disbursement.paidAt)) || (doc?.versions.find(v => v.id === doc.currentVersionId)?.signed ? 'Berkas bertanda tangan tidak dapat diganti lewat unggah revisi.' : ''));
  const canUpload = $derived(admin || (Boolean(data) && !uploadBlocked));
  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const full = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const dot: Record<ItemState, string> = { sesuai: 'bg-green-600', tidak_perlu: 'bg-green-200', perlu_konfirmasi: 'bg-[#0066B2]', menunggu_review: 'bg-sky-400', perlu_revisi: 'bg-amber-500', belum_ada: 'bg-white ring-1 ring-slate-300' };
  const chipClass: Record<Check['level'], string> = { ok: 'bg-green-50 text-green-800', warn: 'bg-amber-50 text-amber-900', bad: 'bg-red-50 text-red-800', info: 'bg-blue-50 text-[#015a9a]' };
  const campusStatusClass: Record<ItemState, string> = {
    perlu_revisi: 'border-amber-300 bg-amber-50 text-amber-900',
    sesuai: 'border-green-200 bg-green-50 text-green-800',
    menunggu_review: 'border-blue-200 bg-blue-50 text-blue-900',
    perlu_konfirmasi: 'border-blue-200 bg-blue-50 text-blue-900',
    tidak_perlu: 'border-slate-200 bg-slate-50 text-slate-700',
    belum_ada: 'border-slate-200 bg-slate-50 text-slate-700'
  };

  const requested = $derived.by<Row>(() => { const k = page.url.searchParams.get('butir'); return k && (admin ? [...KINDS, 'ttd', 'lampiran', 'bayar'] : [...KINDS] as string[]).includes(k) ? (k as Row) : firstOpen(); });
  function firstOpen(): Row {
    if (!data) return 'sk';
    const k = KINDS.find(k => !['sesuai', 'tidak_perlu'].includes(data!.readiness.items[k]));
    return k || (admin && data.readiness.lengkap ? 'ttd' : 'sk');
  }
  const selected = $derived<Row>(requested);
  const isItem = $derived((KINDS as readonly string[]).includes(selected));
  const kind = $derived<Kind>(isItem ? (selected as Kind) : 'sk');
  const doc = $derived(data?.documents.find(d => d.kind === kind) || null);
  /** The three RAB items share one workbook and one typed total, kept on the RAB 70% slot. */
  const isRab = $derived(isRabKind(kind));
  const fileKind = $derived<Kind>(isRab ? 'rab' : kind);
  const fileDoc = $derived(isRab ? data?.documents.find(d => d.kind === 'rab') || null : doc);
  const state = $derived<ItemState>(data ? data.readiness.items[kind] : 'belum_ada');
  const version = $derived<Version | null>(fileDoc ? fileDoc.versions.find(v => v.id === selectedVersionId) || fileDoc.versions.find(v => v.id === fileDoc.currentVersionId) || fileDoc.versions[fileDoc.versions.length - 1] || null : null);
  const isCurrent = $derived(Boolean(version && fileDoc && version.id === fileDoc.currentVersionId));
  const fileUrl = $derived(version ? `/api/pencairan/${campusId}/documents/${fileKind}/versions/${version.id}` : '');
  const spec = $derived(FIELDS[kind]);
  const chips = $derived.by(() => {
    if (!data) return [] as Check[];
    const mine = data.checks.filter(c => c.kind === kind);
    const bad = mine.filter(c => c.level === 'bad').slice(0, 2);
    if (bad.length) return bad;
    return [...mine.filter(c => c.level === 'warn').slice(0, 1), ...mine.filter(c => c.level === 'ok').slice(0, 1), ...(mine.some(c => c.level === 'warn' || c.level === 'ok') ? [] : mine.filter(c => c.level === 'info').slice(0, 1))];
  });
  const thread = $derived(doc ? [...doc.versions.flatMap(v => v.reviews.map(r => ({ ...r, version: v.number }))), ...(doc.reviews || []).map(r => ({ ...r, version: 0 }))].sort((a, b) => b.created.localeCompare(a.created)) : []);
  const campusRevision = $derived(state === 'perlu_revisi' ? thread.find(r => r.decision === 'perlu_revisi' && r.note) : null);
  /** The conversation on this item, oldest first. Decisions keep their own note in the bar and their history in Riwayat. */
  const conversation = $derived(doc ? [...doc.notes].sort((a, b) => a.created.localeCompare(b.created)) : []);
  $effect(() => { void conversation.length; const el = threadEl; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); });
  /** A revision that answers an earlier "Perlu revisi": the request and the new arrival, shown side by side while the item waits (decision 50). */
  const answered = $derived.by(() => {
    if (!admin || !doc || !version || (state !== 'menunggu_review' && state !== 'perlu_konfirmasi')) return null;
    const request = thread.find(r => r.decision === 'perlu_revisi' && r.created < version.created);
    return request ? { request, version } : null;
  });
  /** The review note is one editable text: it starts as the sheet's commentary and is saved again with every decision. */
  const latestNote = $derived(thread.find(r => r.note)?.note || '');
  $effect(() => { const n = latestNote; untrack(() => { reviewNote = n; }); });
  const closingDone = $derived.by(() => {
    if (!data) return { ttd: false, lampiran: false, bayar: false } as Record<string, boolean>;
    const letters = data.documents.filter(d => d.generated);
    return { ttd: letters.length > 0 && letters.every(d => d.originalReceived), lampiran: data.lampiranCount > 0, bayar: Boolean(data.disbursement.paidAt) };
  });
  const decided = $derived(state === 'sesuai' || state === 'tidak_perlu');
  /** The decision statement replaces the buttons once an item is decided, until the admin opens them again. */
  const showDecision = $derived(admin && (decided || state === 'perlu_revisi') && !editing);
  const decisionLabel = $derived(state === 'perlu_revisi' ? DECISION_LABEL[kind].bad : state === 'tidak_perlu' ? 'Tanpa surat kuasa' : DECISION_LABEL[kind].ok);
  /** A surat kuasa counted as not needed because the account holder signs the PKS has no decision to take back. */
  const computedOnly = $derived(state === 'tidak_perlu' && doc?.status !== 'tidak_perlu');
  const canDecide = $derived(admin && data !== null && (kind === 'sk' || isRab || Boolean(version)));
  /** What the campus file really contains, marked after checking the file itself (decision 47). */
  const bukti = $derived.by(() => {
    const p = data?.disbursement.properties || {};
    const mark = (k: string) => (p[k] === 'ada' ? 'ada' : p[k] === 'tidak' ? 'tidak' : '');
    return { r100: mark('buktiRab100'), r70: mark('buktiRab70'), r30: mark('buktiRab30'), note: typeof p.buktiRabCatatan === 'string' ? p.buktiRabCatatan : '' };
  });

  function say(message: string) { notice = message; if (noticeTimer) clearTimeout(noticeTimer); if (message) noticeTimer = setTimeout(() => (notice = ''), 4000); }
  function apply(next: KartuData, message = '') { data = next; error = ''; refresh++; if (message) say(message); }
  async function load() {
    if (busy) return;
    const generation = ++loadGeneration;
    try {
      const next = await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`);
      if (generation === loadGeneration) apply(next);
    }
    catch (e) { if (generation === loadGeneration) error = e instanceof Error ? e.message : 'Layar belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => onChange(() => void load(), { campus: campusId }));
  $effect(() => { if (!admin) return pollVisible(async () => { if (!busy) await load(); }, 15000); });
  $effect(() => {
    void selected;
    untrack(() => { selectedVersionId = ''; bankNameSeen = ''; editing = false; showLook = false; rabTab = 'digital'; uploadFile = null; uploadNote = ''; if (fileInput) fileInput.value = ''; });
  });
  $effect(() => {
    const v = version;
    const next: Record<string, string | boolean> = {};
    for (const f of spec) {
      const value = v?.fields?.[f.key];
      if (f.type === 'money') next[f.key] = typeof value === 'number' ? formatSen(value, false) : '';
      else if (f.type === 'bool') next[f.key] = Boolean(value);
      else if (f.type === 'names') next[f.key] = Array.isArray(value) ? value.join(', ') : '';
      else next[f.key] = typeof value === 'string' ? value : '';
    }
    draft = next; saved = JSON.stringify(next);
  });
  $effect(() => {
    const fit = () => (docHeight = Math.max(360, Math.min(820, Math.round(window.innerHeight * (window.innerWidth < 1024 ? 0.52 : 0.62)))));
    fit();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (e.key === 'Escape') { if (showRiwayat || showLook) { showRiwayat = false; showLook = false; } else if (admin) void goto('/admin/pencairan/tahap-1'); }
      if (e.key === 'Enter' && !typing && admin && isItem && canDecide && !decided && !showDecision) void decide('ok');
    };
    window.addEventListener('resize', fit); window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('keydown', onKey); };
  });

  const open = (row: Row) => { if (!busy) return goto(`${base}?butir=${row}`, { replaceState: true, noScroll: true, keepFocus: true }); };
  async function run(action: () => Promise<KartuData>, message: string) {
    if (busy) return false;
    // A read started before this mutation must not overwrite its newer result.
    loadGeneration++;
    busy = true; error = '';
    try { apply(await action(), message); return true; }
    catch (e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; return false; }
    finally { busy = false; }
  }
  function collect() {
    const out: Record<string, unknown> = {};
    for (const f of spec) {
      const raw = draft[f.key];
      if (f.type === 'money') { const sen = parseSen(String(raw || '')); if (String(raw || '').trim() && sen === null) throw new Error(`${f.label}: tulis angka rupiah, misalnya 52.499.300.`); out[f.key] = sen; }
      else if (f.type === 'bool') out[f.key] = Boolean(raw);
      else if (f.type === 'names') out[f.key] = String(raw || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      else out[f.key] = String(raw || '').trim();
    }
    return out;
  }
  /** Values save when the checker leaves a field; nothing to click. */
  async function saveIfChanged() {
    if (!admin || !version || !isCurrent) return;
    const now = JSON.stringify(draft);
    if (now === saved) return;
    saved = now;
    await run(() => dataService.api.patch<KartuData>(`/api/pencairan/${campusId}/documents/${kind}/versions/${version.id}`, { fields: collect() }), 'Tersimpan.');
  }
  function nextAfter(current: Kind): Row {
    const rest = KINDS.slice(KINDS.indexOf(current) + 1).find(k => data && !['sesuai', 'tidak_perlu'].includes(data.readiness.items[k]));
    return rest || firstOpen();
  }
  async function decide(which: 'ok' | 'bad' | 'none') {
    if (!data || !admin) return;
    if (which !== 'none' && !canDecide) return;
    await saveIfChanged();
    const note = reviewNote.trim();
    if (which === 'bad' && !note) { error = kind === 'sk' ? 'Tulis nilai yang tercetak di SK di kolom catatan.' : 'Tulis catatan untuk kampus dulu.'; noteInput?.focus(); return; }
    const decision = which === 'ok' ? 'sesuai' : which === 'none' ? 'tidak_perlu' : 'perlu_revisi';
    const body: Record<string, unknown> = { decision, note };
    if (kind === 'rekening') body.bank = { result: which === 'ok' ? 'sesuai' : 'berbeda', nameSeen: bankNameSeen.trim() || (which === 'bad' ? note : '') };
    const url = kind === 'rab' ? `/api/pencairan/${campusId}/rab/keputusan` : `/api/pencairan/${campusId}/documents/${kind}/review`;
    const ok = await run(() => dataService.api.post<KartuData>(url, body), which === 'ok' ? `${KIND_SHORT[kind]}: ${DECISION_LABEL[kind].ok}.` : which === 'none' ? 'Ditandai tanpa surat kuasa.' : `${KIND_SHORT[kind]}: catatan revisi tersimpan.`);
    if (ok) { bankNameSeen = ''; editing = false; if (which !== 'bad') void open(nextAfter(kind)); }
  }
  /** Takes the decision back: the item returns to Periksa, the history keeps both entries. */
  async function undo() {
    if (!data || !admin || !isItem) return;
    const url = kind === 'rab' ? `/api/pencairan/${campusId}/rab/keputusan` : `/api/pencairan/${campusId}/documents/${kind}/review`;
    const body = kind === 'rab' ? { decision: 'batal' } : { decision: 'perlu_konfirmasi', note: '' };
    const ok = await run(() => dataService.api.post<KartuData>(url, body), `${KIND_SHORT[kind]}: keputusan dibatalkan, butir kembali ke Periksa.`);
    if (ok) editing = false;
  }
  /** The latest managed RAB version in the same workbook layout as the template, built in the browser. */
  async function exportRab() {
    if (!data || busy) return;
    busy = true; error = '';
    try {
      const overview = await dataService.api.get<{ campus: { code: string; name: string }; version: { number: number; lines: { level: number; code: string; title: string; calculation: string; unit: string; volume: number; unitPriceSen: number; amountSen: number; term1Sen: number; term2Sen: number }[] } | null }>(`/api/pencairan/${campusId}/rab`);
      if (!overview.version) throw new Error('Belum ada RAB terkelola untuk diekspor.');
      const { downloadRabWorkbook, linesToRows } = await import('$lib/rab-excel');
      const lines = overview.version.lines;
      await downloadRabWorkbook(`RAB_${overview.campus.code.replace(/\s+/g, '')}_v${overview.version.number}.xlsx`, { university: overview.campus.name.toUpperCase(), penuh: linesToRows(lines, 'penuh'), tahap1: linesToRows(lines, 'tahap1'), tahap2: linesToRows(lines, 'tahap2') });
      say(`Versi ${overview.version.number} diekspor.`);
    } catch (e) { error = e instanceof Error ? e.message : 'Ekspor belum berhasil.'; }
    finally { busy = false; }
  }
  /** A filled template becomes the next managed RAB version; the table and the checks refresh at once. */
  /** One message on the conversation; staff may keep it internal. */
  async function sendNote() {
    const body = noteBody.trim();
    if (!body) return;
    const ok = await run(() => dataService.api.post<KartuData>(`/api/pencairan/${campusId}/documents/${kind}/catatan`, { body, internal: admin && noteInternal }), noteInternal && admin ? 'Catatan internal tersimpan.' : 'Catatan terkirim.');
    if (ok) { noteBody = ''; noteInternal = false; }
  }
  const grow = (e: Event) => { const t = e.currentTarget as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; };
  async function importRab(file: File | null) {
    if (!file || !admin) return;
    const body = new FormData();
    body.set('file', file);
    await run(async () => { await dataService.api.post(`/api/pencairan/${campusId}/rab/import`, body); return dataService.api.get<KartuData>(`/api/pencairan/${campusId}`); }, 'RAB diimpor sebagai versi baru.');
  }
  async function upload(file: File | null) {
    if (!file || !canUpload) return;
    if (!file.size || file.size > 40 * 1024 * 1024) { error = 'Pilih berkas tidak kosong dengan ukuran maksimal 40 MB.'; return; }
    const body = new FormData();
    body.set('file', file); body.set('note', admin ? '' : uploadNote.trim());
    const ok = await run(async () => { const next = await dataService.api.post<KartuData>(`/api/pencairan/${campusId}/documents/${fileKind}/versions`, body); selectedVersionId = ''; return next; }, admin ? `Versi baru tersimpan.` : 'Berkas terkirim. Menunggu pemeriksaan Pertamina Foundation.');
    if (ok) { uploadFile = null; uploadNote = ''; if (fileInput) fileInput.value = ''; }
  }
</script>

{#if !admin && !data && error === 'Kampus ini tidak termasuk penerima gelombang pertama.'}
  <section class="grid gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
    <h1 class="text-lg font-bold text-slate-900">Pencairan belum tersedia</h1>
    <p>Belum ada penetapan pencairan gelombang pertama untuk kampus Anda. Silakan hubungi tim Pertamina Foundation untuk informasi lebih lanjut.</p>
    <a class="font-semibold text-[#0066B2] hover:underline" href="/campus/dashboard">Kembali ke Beranda</a>
  </section>
{:else if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat…</p>
{:else}
  <div class="grid gap-2 [&>*]:min-w-0">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      {#if admin}<a href="/admin/pencairan/tahap-1" class="inline-flex items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Tahap 1</a>{/if}
      <CampusLogo code={data.campus.code} initials={data.campus.initials} size={36} /><h1 class="text-xl font-bold text-slate-900">{data.campus.name}</h1>
      <span class="text-xs text-slate-500">Tahun {data.summary.programYear === 'kedua' ? 'Kedua' : 'Ketiga'}</span>
      {#if admin && data.readiness.revisi > 0}<a href={`/admin/pencairan/${campusId}/revisi`} class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200">Ringkasan revisi · {data.readiness.revisi}</a>{/if}
      {#if notice}<span class="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800" role="status">{notice}</span>{/if}
      {#if error}<span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800" role="alert">{error}</span>{/if}
    </div>

    {#if !admin}
      <section aria-label="Progres pencairan" class="my-2 grid gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700">
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-bold text-slate-900">Progres Tahap 1 · {data.readiness.done} dari {data.readiness.total} selesai</h2><button type="button" class="font-semibold text-[#0066B2] disabled:opacity-50" disabled={busy} onclick={load}>Perbarui status</button></div>
        {#if belumAda.length}<p><strong class="text-slate-900">Belum ada ({belumAda.length}):</strong> {belumAda.map(k => KIND_SHORT[k]).join(', ')}.</p>{/if}
        {#if perluRevisi.length}<p><strong class="text-amber-900">Perlu revisi ({perluRevisi.length}):</strong> {perluRevisi.map(k => KIND_SHORT[k]).join(', ')}.</p>{/if}
        {#if menungguPf.length}<p><strong class="text-[#015a9a]">Menunggu PF ({menungguPf.length}):</strong> {menungguPf.map(k => KIND_SHORT[k]).join(', ')}.</p>{/if}
        {#if data.readiness.missing.length === 0}<p>{data.readiness.phrase}</p>{/if}
        <p class="text-xs text-slate-500">Pilih dokumen untuk melihat berkas dan catatan pemeriksa. SK dan RAB hanya dapat dilihat; unggah RAB belum dibuka.</p>
      </section>
      <section aria-labelledby="timeline-title" class="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Tahap saat ini</p>
          <h2 id="timeline-title" class="mt-1 font-bold text-slate-900">{campusStages[campusStage - 1]}</h2>
        </div>
        <div>
          <ol class="grid gap-0 sm:grid-cols-7" aria-label="Linimasa proses pencairan">
            {#each campusStages as stage, index}
              <li aria-current={index + 1 === campusStage ? 'step' : undefined} class="relative flex min-h-14 items-center gap-3 text-sm sm:min-h-24 sm:flex-col sm:items-center sm:gap-2">
                {#if index < campusStages.length - 1}<span aria-hidden="true" class="absolute left-4 top-7 h-14 w-0.5 {index + 1 < campusStage ? 'bg-green-300' : 'bg-slate-200'} sm:bottom-auto sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full"></span>{/if}
                <span class="z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 bg-white font-bold {index + 1 === campusStage ? 'border-[#0066B2] text-[#0066B2]' : index + 1 < campusStage ? 'border-green-600 text-green-700' : 'border-slate-300 text-slate-500'}">{index + 1 < campusStage ? '✓' : index + 1}</span>
                <span class="z-10 leading-5 {index + 1 === campusStage ? 'font-bold text-[#015a9a]' : index + 1 < campusStage ? 'font-medium text-green-800' : 'text-slate-600'} sm:px-1 sm:text-center sm:text-xs">{stage}</span>
              </li>
            {/each}
          </ol>
        </div>
        <div class="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <p><strong class="text-slate-900">Yang bertindak:</strong> {nextCampusUpload ? 'Kampus' : data.disbursement.paidAt ? 'Selesai' : 'Pertamina Foundation'}</p>
          <div>
            <p><strong class="text-slate-900">Langkah selanjutnya:</strong> {#if nextCampusUpload}{nextCampusUpload.state === 'perlu_revisi' ? 'Kirim revisi' : 'Lengkapi dokumen'} {KIND_SHORT[nextCampusUpload.kind]}{:else if data.disbursement.paidAt}Tidak ada tindakan lagi untuk Tahap 1.{:else if menungguPf.length}Tunggu pemeriksaan PF untuk {menungguPf.map(k => KIND_SHORT[k]).join(', ')}.{:else if data.readiness.lengkap}PF melanjutkan penyelesaian proses.{:else}PF melanjutkan pemeriksaan dokumen.{/if}</p>
            {#if nextCampusUpload}<a class="mt-1 inline-flex font-semibold text-[#0066B2] hover:underline" href={`/campus/pencairan?butir=${nextCampusUpload.kind}`}>Buka langkah ini <Icon name="arrow" size={14} /></a>{/if}
          </div>
        </div>
        {#if nextRevision}<p class="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-950"><strong>Catatan pemeriksa · {KIND_SHORT[nextRevision.kind]}:</strong> {nextRevision.note}</p>{/if}
      </section>
    {/if}
    <div class="document-frame grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_10px_30px_#0b254508] lg:grid-cols-[240px_minmax(0,1fr)]">
      <div class="document-navigation min-w-0 border-b border-slate-200/70 bg-slate-50/80 lg:border-b-0 lg:border-r">
      <aside use:trackRail class="flex gap-1 overflow-x-auto p-2 lg:grid lg:content-start lg:gap-0.5 lg:overflow-visible lg:p-2.5" aria-label="Butir">
        <span class="hidden px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:block">Butir</span>
        {#each KINDS as k}
          {@const s = data.readiness.items[k]}
          <button type="button" class="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition {selected === k ? 'bg-white font-bold text-slate-900 shadow-[0_4px_12px_#0b254514]' : 'text-slate-700 hover:bg-white/70'}" onclick={() => open(k)} aria-current={selected === k ? 'true' : undefined} title={ITEM_STATE_LABEL[s]}>
            <i class="size-2.5 shrink-0 rounded-full {dot[s]}"></i><span class="whitespace-nowrap">{KIND_SHORT[k]}</span><span class="ml-auto whitespace-nowrap pl-2 text-[11px] font-medium text-slate-500">{admin ? RAIL_WORD[s] : s === 'perlu_revisi' ? 'Perlu revisi' : s === 'belum_ada' ? 'Belum ada' : s === 'sesuai' ? 'Sesuai' : s === 'tidak_perlu' ? 'Tidak perlu' : 'Menunggu PF'}</span>
          </button>
        {/each}
        {#if admin}
          <span class="hidden lg:block lg:my-1.5 lg:border-t lg:border-slate-200/70"></span>
          <span class="hidden px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:block">Sebelum dibayar</span>
          {#each CLOSING as c}
            {@const on = data.readiness.lengkap || closingDone[c.key]}
            <button type="button" class="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition {selected === c.key ? 'bg-white font-bold text-slate-900 shadow-[0_4px_12px_#0b254514]' : on ? 'text-slate-700 hover:bg-white/70' : 'text-slate-400'}" onclick={() => open(c.key)} title={on ? '' : 'Terbuka setelah sembilan butir selesai'}>
              <i class="size-2.5 shrink-0 rounded-full {closingDone[c.key] ? 'bg-green-600' : 'bg-white ring-1 ring-slate-300'}"></i><span class="whitespace-nowrap">{c.label}</span>
            </button>
          {/each}
        {/if}
      </aside>
      <div class="px-4 pb-3 lg:hidden">
        <div class="relative h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div class="absolute h-full rounded-full bg-[#0066B2]" style:width={`${railThumb.width}%`} style:left={`${railThumb.left}%`}></div>
        </div>
        <p class="mt-2 text-center text-xs text-slate-600">↔ Geser untuk melihat dokumen lainnya</p>
      </div>
      </div>

      <div class="document-content grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] [&>*]:min-w-0">
        <div class="document-toolbar flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-3 py-2 text-xs text-slate-500">
          <b class="text-[15px] text-slate-900">{isItem ? KIND_LABEL[kind] : CLOSING.find(c => c.key === selected)?.label}</b>
          {#if isItem && kind === 'sk'}
            <span class="rounded-full bg-[#0066B2] px-2.5 py-0.5 text-[11.5px] font-semibold text-white">{data.summary.skNumber}{data.summary.skDate ? ` · ${time.format(new Date(data.summary.skDate))} ${new Date(data.summary.skDate).getFullYear()}` : ''}</span>
            {#if data.summary.skFile}<a class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" href="/api/pencairan/sk" target="_blank" rel="noopener">Buka SK lengkap</a>{/if}
          {:else if isItem && isRab}
            <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {rabTab === 'digital' ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600'}" onclick={() => (rabTab = 'digital')}>RAB terkelola</button>
            <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {rabTab === 'asli' ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600'}" onclick={() => (rabTab = 'asli')}>Berkas asli{fileDoc?.versions.length ? '' : ' (belum ada)'}</button>
            {#if admin}
              <label class="cursor-pointer rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0066B2] hover:border-[#0066B2]" title="Excel tiga lembar dari templat: RAB 100%, RAB 70%, RAB 30%. Menjadi versi RAB berikutnya.">Impor Excel<input type="file" class="sr-only" accept=".xlsx,.xlsm,.xls" onchange={(e) => importRab((e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
              <button type="button" class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50" disabled={busy} onclick={exportRab}>Ekspor Excel</button>
              <a class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" href="/templat/RAB_DEB.xlsx" download>Templat</a>
            {/if}
          {:else if isItem && doc}
            {#each doc.versions as v}
              <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {version?.id === v.id ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}" onclick={() => (selectedVersionId = v.id)}>Versi {v.number} · {time.format(new Date(v.created))}{v.signed ? ' · ttd' : v.origin === 'generated' ? ' · sistem' : ''}</button>
            {/each}
          {/if}
          {#if admin && isItem && kind !== 'sk' && (!isRab || rabTab === 'asli')}
            <label class="cursor-pointer rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0066B2] hover:border-[#0066B2]">+ versi baru<input type="file" class="sr-only" bind:this={fileInput} accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls" onchange={(e) => upload((e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
          {/if}
          <span class="ml-auto hidden xl:inline">Nilai SK <b class="tabular-nums text-slate-800">{formatSen(data.summary.amountSen)}</b> · Batas <b class="tabular-nums text-slate-800">{formatSen(data.summary.limitSen)}</b> · Diajukan <b class="tabular-nums text-slate-800">{data.summary.requestedSen ? formatSen(data.summary.requestedSen) : 'belum'}</b></span>
          <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#015a9a] {'xl:ml-0 ml-auto'}">{data.readiness.done} dari {data.readiness.total}</span>
          {#if admin && isItem}<button type="button" class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11.5px] font-bold text-slate-500 hover:border-slate-300" onclick={() => (showLook = !showLook)} aria-label="Yang dilihat" title="Yang dilihat">?</button>{/if}
          {#if admin}<button type="button" class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" onclick={() => (showRiwayat = true)}>Riwayat</button>{/if}
        </div>

        {#if !admin && isItem}
          <section aria-label="Status dokumen" class="grid gap-3 border-b border-slate-200 p-3 text-sm">
            <div class="grid gap-1 rounded-lg border border-l-4 p-3 {campusStatusClass[state]}" role="status">
              <strong>{ITEM_STATE_LABEL[state]}</strong>
              {#if campusRevision}<p class="whitespace-pre-wrap break-words"><b>Catatan pemeriksa:</b> {campusRevision.note}</p>{/if}
              <p>{uploadBlocked || (state === 'perlu_revisi' ? 'Perbaiki sesuai catatan, lalu kirim sebagai versi baru. Berkas sebelumnya tetap tersimpan.' : 'Lengkapi dokumen dengan mengunggah berkas di bawah.')}</p>
            </div>
            {#if canUpload}
              <form class="grid min-w-0 gap-2" onsubmit={(e) => { e.preventDefault(); void upload(uploadFile); }}>
                <label class="grid min-w-0 gap-1 font-semibold">{state === 'perlu_revisi' ? 'Berkas revisi' : 'Berkas kelengkapan'}
                  <input type="file" class="min-w-0 max-w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" bind:this={fileInput} disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.doc,.xlsx,.xls,.csv" onchange={(e) => { uploadFile = e.currentTarget.files?.[0] || null; error = ''; }} />
                </label>
                <p class="text-xs text-slate-500">PDF, gambar, Word, atau Excel · maksimal 40 MB. Berkas dikirim setelah tombol di bawah ditekan.</p>
                <label class="grid gap-1">Catatan unggahan (opsional)<textarea rows="2" maxlength="2000" class="w-full rounded-lg border border-slate-300 p-2" bind:value={uploadNote} disabled={busy}></textarea></label>
                <button type="submit" class="justify-self-start rounded-lg bg-[#0066B2] px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !uploadFile}>{busy ? 'Mengirim…' : state === 'perlu_revisi' ? 'Kirim revisi' : 'Kirim dokumen'}</button>
              </form>
            {/if}
            {#if version && !isCurrent}<p class="text-amber-800">Anda melihat versi lama. Status di atas adalah status dokumen terbaru.</p>{/if}
          </section>
        {/if}
        {#if !isItem && admin}
          <div class="relative grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden" style={`height:${docHeight + 56}px`}>
            {#if selected === 'ttd'}<TandaTanganView {campusId} {data} onchange={apply} />
            {:else if selected === 'lampiran'}<LampiranView {campusId} {data} onchange={apply} />
            {:else}<PembayaranView {campusId} {data} onchange={apply} />{/if}
          </div>
        {:else}
          <div class="relative min-h-0 min-w-0 overflow-hidden bg-[#e5e9f0]" style={`height:${docHeight}px`}>
            {#if showLook}
              <div class="absolute right-3 top-3 z-10 w-[min(360px,90%)] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-[0_12px_32px_#0b254522]">
                <b class="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Yang dilihat</b>
                <ul class="mt-1.5 grid gap-1 pl-4 text-[13px] text-slate-700 [list-style:disc]">{#each LOOK_AT[kind] as item}<li>{item}</li>{/each}</ul>
              </div>
            {/if}
            {#if kind === 'sk'}
              {#if data.summary.skFile}
                <iframe title="SK" src={`/api/pencairan/sk#page=${data.summary.skLampiranPage || 1}`} class="h-full w-full border-0 bg-white"></iframe>
              {:else}
                <div class="flex h-full items-center justify-center text-sm text-slate-600">Berkas SK belum dimuat.</div>
              {/if}
            {:else if isRab && rabTab === 'digital'}
              <div class="h-full overflow-auto p-3">
                {#if bukti.r100 || bukti.r70 || bukti.r30}
                  <div class="mb-3 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2">
                    <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]"><span class="font-bold uppercase tracking-[0.05em] text-slate-500">Bukti di berkas kampus</span>
                      {#each [['RAB 100%', bukti.r100], ['RAB 70%', bukti.r70], ['RAB 30%', bukti.r30]] as [label, mark]}
                        <span class="rounded-full px-2 py-0.5 font-semibold {mark === 'ada' ? 'bg-green-100 text-green-900' : mark === 'tidak' ? 'bg-slate-200 text-slate-600' : 'bg-white text-slate-400'}">{label} {mark === 'ada' ? 'ada' : mark === 'tidak' ? 'tidak ada' : 'belum diperiksa'}</span>
                      {/each}
                    </p>
                    {#if bukti.note}<p class="mt-1 text-[13px] leading-relaxed text-slate-700">{bukti.note}</p>{/if}
                  </div>
                {/if}
                <RabTable {campusId} compact {refresh} canEdit={admin} share={RAB_SHARE[kind as keyof typeof RAB_SHARE]} />
              </div>
            {:else if version}
              <FileViewer src={fileUrl} mime={version.mime} name={version.originalName} height={docHeight} />
            {:else}
              <div class="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-600"><Icon name="upload" size={26} /><span>Belum ada berkas.</span>{#if canUpload}<span class="text-xs text-slate-500">{admin ? 'Pilih "+ versi baru" di atas.' : 'Gunakan formulir unggah di atas.'}</span>{/if}</div>
            {/if}
          </div>

          {#if admin || kind === 'sk' || spec.some(f => version?.fields?.[f.key] !== null && version?.fields?.[f.key] !== undefined && version?.fields?.[f.key] !== '')}
          <div class="document-review grid gap-2.5 border-t border-slate-200/70 bg-white px-3 py-3">
            {#if kind === 'sk'}
              <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Nilai SK<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900">{formatSen(data.summary.amountSen)}</span></label>
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Batas Tahap 1 (70%)<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900">{formatSen(data.summary.limitSen)}</span></label>
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Lampiran I<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal {data.summary.skLampiranNo ? 'text-slate-900' : 'text-slate-500'}">{data.summary.skLampiranNo ? `No ${data.summary.skLampiranNo} · halaman ${data.summary.skLampiranPage}` : 'belum ditandai'}</span></label>
              </div>
            {:else if admin && spec.length && version}
              <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                {#each spec as f}
                  <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400 {f.type === 'names' || ['terbilang', 'penandatangan', 'pemberiKuasa', 'rekeningTujuan'].includes(f.key) ? 'sm:col-span-2' : ''}">{f.label}
                    {#if f.type === 'bool'}
                      <span class="flex min-h-[36px] items-center gap-1.5 text-[13px] font-medium normal-case tracking-normal text-slate-800"><input type="checkbox" bind:checked={draft[f.key] as boolean} disabled={!isCurrent} onchange={saveIfChanged} />Ya</span>
                    {:else if f.type === 'date'}
                      <input type="date" class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={draft[f.key] as string} disabled={!isCurrent} onblur={saveIfChanged} />
                    {:else if f.type === 'money'}
                      <input class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-right text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900" bind:value={draft[f.key] as string} placeholder="0" inputmode="numeric" disabled={!isCurrent} onblur={saveIfChanged} />
                    {:else}
                      <input class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={draft[f.key] as string} placeholder={f.type === 'names' ? 'Nama, pisahkan dengan koma' : ''} disabled={!isCurrent} onblur={saveIfChanged} />
                    {/if}
                  </label>
                {/each}
              </div>
            {:else if !admin && spec.length && version}
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                {#each spec as f}{@const v = version.fields?.[f.key]}{#if v !== null && v !== undefined && v !== ''}<span class="text-[12.5px] text-slate-600"><b class="font-semibold text-slate-500">{f.label}:</b> {f.type === 'money' ? formatSen(v as number) : Array.isArray(v) ? v.join(', ') : String(v)}</span>{/if}{/each}
              </div>
            {/if}
            {#if admin && chips.length}
              <div class="flex flex-wrap gap-1.5">
                {#each chips as c}<span class="rounded-lg px-2.5 py-1 text-[12px] font-semibold {chipClass[c.level]}" title={c.text}>{c.level === 'ok' ? '✓ ' : c.level === 'info' ? '' : '! '}{c.text.replace(/\.$/, '')}</span>{/each}
              </div>
            {/if}

            {#if answered}
              <div class="grid gap-1 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-[13.5px] text-amber-950" role="status">
                <p><span class="font-bold">Diminta sebelumnya</span> · {answered.request.imported ? 'Lembar review' : answered.request.actorName || 'Admin'} · {full.format(new Date(answered.request.created))}: {answered.request.note || 'tanpa catatan'}</p>
                <p><span class="font-bold">Jawaban kampus</span> · versi {answered.version.number} · {answered.version.uploadedByName || 'pengunggah tidak tercatat'} · {full.format(new Date(answered.version.created))}{answered.version.note ? `: ${answered.version.note}` : ''}</p>
              </div>
            {/if}
            <div class="review-actions flex flex-wrap items-end gap-2">
              {#if admin && showDecision}
                <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2.5 {state === 'perlu_revisi' ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}" role="status">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[17px] font-bold text-white {state === 'perlu_revisi' ? 'bg-amber-500' : 'bg-green-700'}" aria-hidden="true">{state === 'perlu_revisi' ? '!' : '✓'}</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-[15px] font-bold {state === 'perlu_revisi' ? 'text-amber-900' : 'text-green-900'}">{decisionLabel}</p>
                    <p class="text-[12.5px] text-slate-600">{computedOnly ? 'Pemilik rekening adalah penandatangan PKS, surat kuasa tidak diperlukan.' : `${doc?.decidedByName || (thread[0]?.imported ? 'Lembar review' : 'Sistem')}${doc?.decidedAt ? ` · ${full.format(new Date(doc.decidedAt))}` : ''}`}</p>
                    {#if latestNote && !computedOnly && latestNote.trim().toLowerCase() !== decisionLabel.toLowerCase()}<p class="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{latestNote}</p>{/if}
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40" disabled={busy} onclick={() => (editing = true)}>{computedOnly ? 'Periksa juga' : 'Ubah keputusan'}</button>
                    {#if !computedOnly}<button type="button" class="min-h-[38px] rounded-lg border border-red-200 bg-white px-3.5 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40" disabled={busy} title="Butir kembali ke Periksa; riwayat tetap tersimpan" onclick={() => void undo()}>Batalkan keputusan</button>{/if}
                  </div>
                </div>
              {:else if admin}
                {#if kind === 'rekening'}<label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Nama di bank<input class="min-h-[38px] w-[170px] max-w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={bankNameSeen} placeholder="Bila berbeda" /></label>{/if}
                <label class="grid basis-full gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400 sm:min-w-[220px] sm:flex-1 sm:basis-auto">
                  <span>Catatan keputusan{#if doc?.decidedByName}<span class="ml-2 font-medium normal-case tracking-normal text-slate-400">{state === 'perlu_revisi' ? DECISION_LABEL[kind].bad : decided ? DECISION_LABEL[kind].ok : ITEM_STATE_LABEL[state]} · {doc.decidedByName}{doc.decidedAt ? ` · ${time.format(new Date(doc.decidedAt))}` : ''}</span>{/if}</span>
                  <textarea bind:this={noteInput} rows="2" class="min-h-[46px] w-full rounded-lg border px-3 py-2 text-[14px] font-medium leading-relaxed normal-case tracking-normal text-slate-900 {state === 'perlu_revisi' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300'}" bind:value={reviewNote} oninput={grow} placeholder={kind === 'sk' ? 'Bila berbeda: nilai yang tercetak di SK' : 'Catatan keputusan: alasan revisi atau keterangan lolos, dikirim ke kampus'}></textarea>
                </label>
                {#if DECISION_LABEL[kind].none}<button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40" disabled={busy} onclick={() => decide('none')}>{DECISION_LABEL[kind].none}</button>{/if}
                <button type="button" class="min-h-[38px] rounded-lg border px-3.5 text-[13px] font-semibold transition disabled:opacity-40 {state === 'perlu_revisi' ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}" disabled={busy || !canDecide} title={canDecide ? '' : 'Unggah berkas dulu'} onclick={() => decide('bad')}>{DECISION_LABEL[kind].bad}</button>
                <button type="button" class="min-h-[38px] rounded-lg px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_#15803d33] transition active:scale-[0.98] disabled:opacity-40 {decided ? 'bg-green-800 ring-2 ring-green-300' : 'bg-green-700 hover:bg-green-800'}" disabled={busy || !canDecide} title={canDecide ? 'Enter' : 'Unggah berkas dulu'} onclick={() => decide('ok')}>{decided ? '✓ ' : ''}{DECISION_LABEL[kind].ok}</button>
                {#if editing}<button type="button" class="min-h-[38px] px-2 text-[13px] font-semibold text-slate-500 hover:underline" onclick={() => (editing = false)}>Tutup</button>{/if}
              {/if}
            </div>
          </div>
          {/if}
          <div class="document-notes border-t border-slate-200/70 bg-white px-3 py-2.5">
            <div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Catatan</h3><span class="text-[11.5px] text-slate-500">{admin ? 'Percakapan dengan kampus. Catatan internal hanya terlihat tim Pertamina Foundation.' : 'Percakapan dengan Pertamina Foundation.'}</span></div>
            <div class="mt-1.5 grid max-h-56 gap-1.5 overflow-y-auto" bind:this={threadEl} aria-live="polite">
              {#each conversation as m (m.id)}
                <div class="rounded-lg px-3 py-2 {m.internal ? 'bg-amber-50 ring-1 ring-amber-200' : m.authorRole === 'campus' ? 'bg-blue-50' : 'bg-slate-50'}">
                  <span class="text-[12px] font-semibold text-slate-500">{m.authorName}{m.authorRole === 'campus' ? ' (kampus)' : ''} · {full.format(new Date(m.created))}{m.internal ? ' · internal' : ''}</span>
                  <p class="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{m.body}</p>
                </div>
              {/each}
              {#if !conversation.length}<p class="text-[13px] text-slate-500">Belum ada catatan pada butir ini.</p>{/if}
            </div>
            <form class="mt-2 flex flex-wrap items-end gap-2" onsubmit={(e) => { e.preventDefault(); void sendNote(); }}>
              <textarea rows="2" class="min-h-[46px] min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[14px] leading-relaxed text-slate-900" bind:value={noteBody} oninput={grow} placeholder={admin ? 'Tulis catatan untuk kampus atau untuk tim' : 'Tulis catatan untuk Pertamina Foundation'} onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void sendNote(); } }}></textarea>
              {#if admin}<label class="flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold {noteInternal ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'}"><input type="checkbox" bind:checked={noteInternal} />Catatan internal</label>{/if}
              <button type="submit" class="min-h-[38px] rounded-lg bg-[#0066B2] px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_#0066b233] hover:bg-[#015a9a] disabled:opacity-40" disabled={busy || !noteBody.trim()}>Kirim</button>
            </form>
          </div>

        {/if}
      </div>
    </div>
    {#if isItem}<p class="text-[11.5px] text-slate-400">{KIND_FILE[kind]}{admin ? ' · Enter untuk tombol hijau, Esc kembali ke Tahap 1' : ''}</p>{/if}
  </div>
  {#if showRiwayat}<RiwayatSheet context={`kampus:${campusId}/pencairan/t1`} title="Riwayat perubahan kampus ini" onclose={() => (showRiwayat = false)} />{/if}
{/if}

<style>
  @media (max-width: 1023px) {
    .document-frame { gap: 20px; background: transparent; border: 0; box-shadow: none; }
    .document-navigation { border: 0; border-radius: 12px; overflow: hidden; }
    .document-content { row-gap: 20px; background: transparent; }
    .document-content > :global(section) { padding: 16px; background: white; border-radius: 12px; }
    .document-toolbar { padding: 16px; gap: 12px; background: white; border: 0; border-radius: 12px; }
    .document-toolbar :is(button, a, label) { min-height: 44px; display: inline-flex; align-items: center; }
    .document-review, .document-notes { padding: 20px 16px; gap: 16px; border-radius: 12px; border-top: 0; }
    .review-actions { gap: 12px; }
    .review-actions > label { flex-basis: 100%; gap: 8px; }
    .review-actions textarea { min-height: 88px; }
    .review-actions button { min-height: 44px; }
    .document-notes form { margin-top: 16px; gap: 12px; }
    .document-notes textarea { min-width: 0; flex-basis: 100%; min-height: 88px; }
    .document-notes button { min-height: 44px; margin-left: auto; }
  }
</style>
