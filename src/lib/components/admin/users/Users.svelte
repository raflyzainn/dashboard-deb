<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import Button from '$lib/components/ui/Button.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';
  import AccountWhatsApp from './AccountWhatsApp.svelte';

  let { campusId = '' }: { campusId?: string } = $props();
  const scope = $derived(campusId ? `?campus=${encodeURIComponent(campusId)}` : '');
  interface User { id: string; name: string; email: string; role: 'baru' | 'campus' | 'admin' | 'super_admin'; active: boolean; campusId: string; created: string; lastLoginAt: string; passwordChangeRequired: boolean }
  interface CampusOption { id: string; name: string; initials: string; contacts?: { mentor: string; coordinator: string; localHero: string } }

  let users = $state<User[]>([]);
  let campuses = $state<CampusOption[]>([]);
  let loading = $state(true);
  let error = $state('');
  let notice = $state('');
  let query = $state('');
  let filter = $state<'semua' | 'baru' | 'admin' | 'campus' | 'nonaktif'>('semua');
  let refresh = $state(0);

  let editing = $state<User | null>(null);
  let draft = $state({ name: '', email: '', role: 'baru', campus: '', active: true });
  let resetting = $state<User | null>(null);
  let preparingAccess = $state(false);
  let newPassword = $state('');
  let creating = $state(false);
  let created = $state({ name: '', email: '', password: '', role: 'campus', campus: '' });
  let busy = $state(false);
  let formError = $state('');
  let sharing = $state<{ user: User; password: string } | null>(null);

  const superAdmin = $derived(Boolean(app.session?.superAdmin));
  const roleOptions = $derived(campusId ? ['campus'] : superAdmin ? ['baru', 'campus', 'admin'] : ['baru', 'campus']);
  const roleLabel: Record<string, string> = { baru: 'Baru', campus: 'Kampus', admin: 'Admin', super_admin: 'Super admin' };
  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const campusName = (id: string) => campuses.find(c => c.id === id)?.name || '';

  const visible = $derived(users.filter(u => {
    const q = query.trim().toLowerCase();
    if (q && !(u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || campusName(u.campusId).toLowerCase().includes(q))) return false;
    if (filter === 'nonaktif') return !u.active;
    if (filter === 'admin') return u.role === 'admin' || u.role === 'super_admin';
    if (filter !== 'semua') return u.role === filter;
    return true;
  }));
  const waiting = $derived(users.filter(u => u.role === 'baru' && u.active).length);

  async function load() {
    loading = true; error = '';
    try {
      const result = await dataService.api.get<{ users: User[]; campuses: CampusOption[] }>('/api/users' + scope);
      users = result.users; campuses = result.campuses;
    } catch (e) { error = e instanceof Error ? e.message : 'Daftar pengguna belum dapat dimuat.'; }
    finally { loading = false; }
  }
  $effect(() => { untrack(() => { void load(); }); });

  function canEdit(u: User) {
    if (u.id === app.session?.id) return false;
    if (u.role === 'super_admin') return false;
    if (u.role === 'admin' && !superAdmin) return false;
    return true;
  }
  function openEdit(u: User) { editing = u; draft = { name: u.name, email: u.email, role: u.role, campus: u.campusId, active: u.active }; formError = ''; }
  function generatePassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(14));
    return 'A7' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
  }
  async function save() {
    if (!editing || busy) return;
    busy = true; formError = '';
    try {
      const body: Record<string, unknown> = { name: draft.name, role: draft.role, active: draft.active };
      if (draft.role === 'campus') body.campus = draft.campus;
      if (editing.role === 'campus') body.email = draft.email;
      const result = await dataService.api.patch<{ user: User }>(`/api/users/${editing.id}${scope}`, body);
      users = users.map(u => (u.id === result.user.id ? result.user : u));
      notice = 'Perubahan akun tersimpan.'; editing = null; refresh++;
    } catch (e) { formError = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; }
    finally { busy = false; }
  }
  function openReset(u: User, prepare = false) { resetting = u; preparingAccess = prepare; newPassword = generatePassword(); formError = ''; }
  function closeReset() { if (!busy) { resetting = null; newPassword = ''; preparingAccess = false; } }
  async function saveReset() {
    if (!resetting || busy) return;
    busy = true; formError = '';
    const password = newPassword;
    try {
      const result = await dataService.api.patch<{ user: User }>(`/api/users/${resetting.id}${scope}`, { password, ...(preparingAccess ? { active: true } : {}) });
      users = users.map(u => u.id === result.user.id ? result.user : u);
      if (result.user.role === 'campus' && result.user.active) sharing = { user: result.user, password };
      notice = 'Kata sandi sementara sudah berlaku. Pemilik akun wajib menggantinya setelah masuk.'; resetting = null; newPassword = ''; refresh++;
    } catch (e) { formError = e instanceof Error ? e.message : 'Kata sandi belum tersimpan.'; }
    finally { busy = false; }
  }
  function openCreate() { if (busy) return; creating = true; created = { name: '', email: '', password: generatePassword(), role: 'campus', campus: campusId }; formError = ''; }
  function closeCreate() { if (!busy) { creating = false; created.password = ''; } }
  async function saveCreate() {
    if (busy) return;
    busy = true; formError = '';
    const password = created.password;
    try {
      const body: Record<string, unknown> = { name: created.name, email: created.email, password, role: created.role };
      if (created.role === 'campus') body.campus = created.campus;
      const result = await dataService.api.post<{ user: User }>('/api/users' + scope, body);
      users = [result.user, ...users];
      if (result.user.role === 'campus' && result.user.active) sharing = { user: result.user, password };
      notice = 'Akun dibuat. Pemilik akun wajib mengganti kata sandi sementara setelah masuk.'; creating = false; created.password = ''; refresh++;
    } catch (e) { formError = e instanceof Error ? e.message : 'Akun belum dibuat.'; }
    finally { busy = false; }
  }
</script>

<div class="grid gap-5 [&>*]:min-w-0">
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">{campusId ? 'Akun kampus' : 'Pengguna'}</h1>
      <p class="mt-1 text-sm text-slate-600">{campusId ? 'Kelola email dan kata sandi akun kampus ini. Kata sandi sementara wajib diganti setelah masuk.' : 'Kelola peran dan akses akun. Akun Microsoft dibuat saat pertama kali masuk.'}</p>
    </div>
    <Button icon="plus" onclick={openCreate}>Tambah akun</Button>
  </header>

  {#if notice}<div class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{notice}</div>{/if}
  {#if error}<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>{/if}
  {#if waiting}
    <div class="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Icon name="alert" size={16} />{waiting} akun menunggu peran.</div>
  {/if}

  <div class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
    <label class="relative block">
      <span class="sr-only">Cari pengguna</span>
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={16} /></span>
      <input class="min-h-[42px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100" type="search" placeholder="Cari nama, email, atau kampus" bind:value={query} />
    </label>
    {#if !campusId}<div class="flex flex-wrap gap-1.5" role="group" aria-label="Saring menurut peran">
      {#each [['semua', 'Semua'], ['baru', 'Menunggu peran'], ['admin', 'Admin'], ['campus', 'Kampus'], ['nonaktif', 'Nonaktif']] as [key, label]}
        <button type="button" class="rounded-full border px-3 py-1.5 text-xs font-semibold transition {filter === key ? 'border-[#0066B2] bg-[#0066B2] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}" aria-pressed={filter === key} onclick={() => (filter = key as typeof filter)}>{label}</button>
      {/each}
    </div>{/if}
  </div>

  {#if loading}
    <p class="text-sm text-slate-500">Memuat daftar pengguna…</p>
  {:else if !visible.length}
    <Empty title="Tidak ada pengguna yang cocok" description="Ubah kata kunci atau saringan, atau tambah akun baru." />
  {:else}
    <div class="min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200/70 bg-white/90 shadow-[0_10px_30px_#0b254508]">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
          <tr><th class="px-4 py-3">Nama</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Peran</th><th class="px-4 py-3">Kampus</th><th class="px-4 py-3">Masuk terakhir</th><th class="px-4 py-3">Status</th><th class="px-4 py-3" aria-label="Tindakan"></th></tr>
        </thead>
        <tbody>
          {#each visible as u (u.id)}
            <tr class="border-t border-slate-100">
              <td class="px-4 py-3 font-semibold text-slate-800">{u.name || 'Tanpa nama'}</td>
              <td class="px-4 py-3 text-slate-600">{u.email}</td>
              <td class="px-4 py-3"><Badge tone={u.role === 'baru' ? 'amber' : u.role === 'campus' ? 'neutral' : 'blue'}>{roleLabel[u.role]}</Badge></td>
              <td class="px-4 py-3 text-slate-600">{campusName(u.campusId) || (u.role === 'campus' ? 'Belum dipilih' : '')}</td>
              <td class="px-4 py-3 text-slate-600">{u.lastLoginAt ? time.format(new Date(u.lastLoginAt)) : 'Belum pernah'}</td>
              <td class="px-4 py-3">{#if u.active}<Badge tone="green">Aktif</Badge>{:else}<Badge tone="neutral">Nonaktif</Badge>{/if}{#if u.passwordChangeRequired}<p class="mt-1 text-xs text-amber-800">Wajib ganti kata sandi</p>{/if}</td>
              <td class="px-4 py-3 text-right">
                {#if canEdit(u)}
                  <div class="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" onclick={() => openEdit(u)}>{u.role === 'baru' ? 'Beri peran' : 'Ubah'}</Button>
                    <Button size="sm" variant="ghost" onclick={() => openReset(u)}>Kata sandi</Button>
                    {#if u.role === 'campus' && (!u.active || !u.lastLoginAt || u.passwordChangeRequired)}<Button size="sm" variant="ghost" icon="phone" onclick={() => openReset(u, true)}>Siapkan &amp; kirim akses</Button>{/if}
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <RiwayatPerubahan context={campusId ? `pengguna:${campusId}` : 'pengguna'} {refresh} />
</div>

{#if sharing}
  <AccountWhatsApp email={sharing.user.email} campusName={campusName(sharing.user.campusId)} contacts={campuses.find(c => c.id === sharing?.user.campusId)?.contacts} temporaryPassword={sharing.password} onclose={() => (sharing = null)} />
{/if}

{#if editing}
  <Modal title={editing.role === 'baru' ? 'Beri peran' : 'Ubah akun'} onclose={() => (editing = null)}>
    <form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); void save(); }}>
      {#if editing.role === 'campus'}
        <label class="grid gap-1.5 text-sm font-medium text-slate-700">Email<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" type="email" bind:value={draft.email} maxlength="254" required /></label>
        <p class="text-xs text-slate-600">Perubahan email mengakhiri sesi login lama. Pastikan alamat milik penerima yang benar.</p>
      {:else}<p class="text-sm text-slate-600">{editing.email}</p>{/if}
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Nama<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={draft.name} required /></label>
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Peran
        <select class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={draft.role} disabled={!!campusId}>
          {#each roleOptions as role}<option value={role}>{roleLabel[role]}</option>{/each}
        </select>
      </label>
      {#if draft.role === 'campus'}
        <label class="grid gap-1.5 text-sm font-medium text-slate-700">Kampus
          <select class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={draft.campus} required disabled={!!campusId}>
            <option value="">Pilih kampus</option>
            {#each campuses as c}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" bind:checked={draft.active} />Akun aktif</label>
      {#if formError}<p class="text-sm text-red-700">{formError}</p>{/if}
      <div class="flex justify-end gap-2"><Button variant="secondary" onclick={() => (editing = null)}>Batal</Button><Button type="submit" loading={busy}>Simpan</Button></div>
    </form>
  </Modal>
{/if}

{#if resetting}
  <Modal title={preparingAccess ? 'Siapkan akses untuk WhatsApp' : 'Kata sandi baru'} onclose={closeReset}>
    <div class="grid gap-4">
      <p class="text-sm text-slate-600">Kata sandi untuk {resetting.email}. Password lama akan diganti dan sesi login sebelumnya diakhiri. Pemilik akun wajib mengganti password sementara setelah masuk.</p>
      {#if preparingAccess}
        {#if !resetting.active}<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Akun ini nonaktif. Dengan melanjutkan, Anda mengaktifkan kembali izin masuk akun ini.</p>{/if}
        <p class="text-sm text-slate-600">Setelah konfirmasi, pilih penerima WhatsApp. Pesan berisi email dan password sementara, bukan tautan aktivasi. Belum ada pesan yang dikirim otomatis.</p>
      {/if}
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Kata sandi<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 font-mono text-sm" bind:value={newPassword} minlength="8" disabled={busy} /></label>
      {#if formError}<p class="text-sm text-red-700">{formError}</p>{/if}
      <div class="flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onclick={closeReset}>Batal</Button><Button loading={busy} onclick={saveReset}>{preparingAccess ? 'Konfirmasi & siapkan pesan' : 'Berlakukan'}</Button></div>
    </div>
  </Modal>
{/if}

{#if creating}
  <Modal title="Tambah akun" onclose={closeCreate}>
    <form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); void saveCreate(); }}>
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Nama<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={created.name} required /></label>
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Email<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" type="email" bind:value={created.email} required /></label>
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Peran
        <select class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={created.role} disabled={!!campusId}>
          {#each roleOptions as role}<option value={role}>{roleLabel[role]}</option>{/each}
        </select>
      </label>
      {#if created.role === 'campus'}
        <label class="grid gap-1.5 text-sm font-medium text-slate-700">Kampus
          <select class="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm" bind:value={created.campus} required disabled={!!campusId}>
            <option value="">Pilih kampus</option>
            {#each campuses as c}<option value={c.id}>{c.name}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="grid gap-1.5 text-sm font-medium text-slate-700">Kata sandi awal<input class="min-h-[42px] rounded-xl border border-slate-300 px-3 font-mono text-sm" bind:value={created.password} minlength="8" required /></label>
      <p class="text-xs text-slate-500">Akun Microsoft tidak perlu dibuat di sini; akun itu terbentuk sendiri saat pertama kali masuk.</p>
      {#if formError}<p class="text-sm text-red-700">{formError}</p>{/if}
      <div class="flex justify-end gap-2"><Button variant="secondary" disabled={busy} onclick={closeCreate}>Batal</Button><Button type="submit" loading={busy}>Buat akun</Button></div>
    </form>
  </Modal>
{/if}
