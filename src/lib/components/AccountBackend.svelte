<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import Modal from './Modal.svelte';
  import { normalizeEmail, validEmail } from '$lib/account-validation';
  type Account = { campusId: string; campus: string; name: string; email: string; revision: number; status: string; active: boolean; sentAt: string | null };
  let cache = $state<Record<string,Account>>({}), ids = $state<string[]>([]);
  const cached = $derived(Object.values(cache));
  let drafts = $state<Record<string,string>>({}), names = $state<Record<string,string>>({});
  let editing = $state<string[]>([]);
  let search = $state(''), filter = $state('all'), currentPage = $state(1), total = $state(0);
  let stats = $state({total:0,email:0,waiting:0,active:0});
  let busy = $state(false), notice = $state(''), error = $state('');
  let resetAccounts = $state<Account[] | null>(null);
  let generation = 0;
  const pageCount = $derived(Math.max(1,Math.ceil(total/10))), pageNumber = $derived(Math.min(currentPage,pageCount));
  const visible = $derived(ids.map(id => cache[id]).filter(Boolean)), paged = $derived(visible);
  const changed = $derived(cached.filter(a => normalizeEmail(drafts[a.campusId] ?? a.email) !== a.email || (names[a.campusId] ?? a.name).trim() !== a.name));
  const hasErrors = $derived(cached.some(a => !!emailError(a)));
  $effect(() => { search; filter; currentPage = 1; });
  $effect(() => { const query = search, state = filter, page = currentPage; untrack(() => { void load(query,state,page); }); });
  async function api(path: string, body?: object, key?: string) {
    const qa = sessionStorage.getItem('deb-pocketbase-preview-account');
    const r = await fetch('/api/admin/accounts' + path, { method: body ? 'POST' : 'GET', headers: { ...(qa ? {'X-DEB-Preview':'1','X-DEB-Preview-Account':qa} : {}), ...(body ? {'Content-Type':'application/json'} : {}), ...(key ? {'Idempotency-Key':key} : {}) }, body: body ? JSON.stringify(body) : undefined });
    const data = await r.json(); if(!r.ok) throw new Error(data.message || 'Data akun belum dapat dimuat.'); return data;
  }
  function remember(rows: Account[]) {
    for (const value of rows) {
      const old = cache[value.campusId];
      const dirty = old && (normalizeEmail(drafts[value.campusId] ?? old.email) !== old.email || (names[value.campusId] ?? old.name).trim() !== old.name);
      // Keep the original revision for unsaved edits so the server can report conflicts.
      if (!dirty) { cache[value.campusId] = {...value,active:value.status==='Aktif',sentAt:null}; drafts[value.campusId]=value.email; names[value.campusId]=value.name; }
    }
  }
  async function load(q=search,f=filter,p=currentPage) {
    const revision=++generation;
    try { const data=await api('?' + new URLSearchParams({q,status:f==='all'?'':f,page:String(p)})); if(revision!==generation)return; remember(data.items); ids=data.items.map((a:Account)=>a.campusId);total=data.total;stats=data.stats; currentPage=data.page; }
    catch(e){if(revision===generation)error=e instanceof Error?e.message:'Data tidak tersedia.';}
  }
  function emailError(a:Account){const email=normalizeEmail(drafts[a.campusId]??a.email);return email&&!validEmail(email)?'Format email belum valid.':email&&cached.some(b=>b.campusId!==a.campusId&&normalizeEmail(drafts[b.campusId]??b.email)===email)?'Email sudah digunakan kampus lain.':'';}
  function isEditing(a:Account){return (!a.name&&!a.email)||editing.includes(a.campusId);}
  function cancelEdit(a:Account){drafts[a.campusId]=a.email;names[a.campusId]=a.name;editing=editing.filter(id=>id!==a.campusId);error='';}
  function save(){const active=changed.filter(a=>a.active&&normalizeEmail(drafts[a.campusId])!==a.email);if(active.length){resetAccounts=active;return;}void commitEmails();}
  async function commitEmails(){busy=true;error='';try{await api('/save',{changes:changed.map(a=>({campusId:a.campusId,revision:a.revision,name:names[a.campusId],email:drafts[a.campusId]})),confirmReset:!!resetAccounts});cache={};drafts={};names={};editing=[];resetAccounts=null;await load();notice='Data PIC dan email tersimpan.';}catch(e){error=(e as Error).message;resetAccounts=null;}finally{busy=false;}}
</script>
<svelte:head><title>Akun kampus · DEB</title></svelte:head>
<div class="page-heading"><div><span class="eyebrow">ADMINISTRASI AKSES</span><h1>Akun kampus</h1><p>Simpan nama dan email PIC. Kampus meminta tautan aktivasi sendiri melalui halaman login.</p></div></div>
<p class="mock-note">Setelah data disimpan, PIC memilih Aktivasi akun di halaman login dan memasukkan email yang terdaftar. Menyimpan data tidak mengirim email. <button class="text-link" onclick={() => load()}>Muat ulang status</button></p>
<div class="access-stats"><article><span>Kampus mitra</span><strong>{stats.total}</strong></article><article><span>Email tersimpan</span><strong>{stats.email}</strong></article><article><span>Menunggu aktivasi</span><strong>{stats.waiting}</strong></article><article><span>Akun aktif</span><strong>{stats.active}</strong></article></div>
<section class="panel account-panel" aria-label="Daftar email kampus">
  <div class="roster-heading"><div><h2>Daftar akun kampus</h2><p>Satu alamat email untuk setiap kampus mitra.</p></div><button class="button secondary" disabled={busy || !changed.length || hasErrors} onclick={save}>Simpan perubahan{changed.length ? ` (${changed.length})` : ''}</button></div>
  <div class="filters"><div class="search-field"><Icon name="search" size={18}/><input aria-label="Cari kampus, PIC, atau email" placeholder="Cari kampus, PIC, atau email…" bind:value={search}/></div><select aria-label="Filter status akun" bind:value={filter}><option value="all">Semua status</option>{#each ['Email belum diisi', 'Belum aktivasi', 'Dalam antrean', 'Menunggu aktivasi', 'Gagal dikirim', 'Aktif'] as value}<option>{value}</option>{/each}</select></div>
  {#if changed.length}<p class="hint">Simpan perubahan nama dan email agar PIC dapat meminta tautan aktivasi menggunakan data terbaru.</p>{/if}
  {#if hasErrors}<p class="error" role="alert">Periksa format atau email duplikat pada baris yang ditandai.</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if notice}<p class="success-note" role="status">{notice}</p>{/if}
  <div class="roster-head"><span>Kampus mitra</span><span>Email kampus</span><span>Status & tindakan</span></div>
  <div class="roster">
    {#each paged as account (account.campusId)}
      {@const issue = emailError(account)}
      <article class="account-row" class:editing={isEditing(account)} aria-label={account.campus}>
        <div class="campus-cell"><span class="avatar"><Icon name="campus"/></span><div class="campus-details"><strong>{account.campus}</strong><div class="pic-field">{#if isEditing(account)}<label for={`pic-${account.campusId}`}>Nama PIC</label><input id={`pic-${account.campusId}`} aria-label={`Nama PIC ${account.campus}`} placeholder="Nama penanggung jawab" bind:value={names[account.campusId]} oninput={() => notice = ''}/>{:else}<p class="saved-pic">{account.name || 'Nama PIC belum diisi'}</p>{/if}</div></div></div>
        <div class="email-cell">{#if isEditing(account)}<label for={`email-${account.campusId}`}>Email kampus</label><input id={`email-${account.campusId}`} type="email" aria-label={`Email ${account.campus}`} aria-invalid={!!issue} aria-describedby={issue ? `email-error-${account.campusId}` : undefined} placeholder="pic@example.com" bind:value={drafts[account.campusId]} oninput={() => { notice = ''; error = ''; }}/>{#if issue}<small id={`email-error-${account.campusId}`} class="field-error">{issue}</small>{/if}{#if normalizeEmail(drafts[account.campusId] ?? account.email) !== account.email || (names[account.campusId] ?? account.name).trim() !== account.name}<small>Belum disimpan</small>{/if}{:else}{#if account.email}<a class="saved-email" href={`mailto:${account.email}`}>{account.email}</a>{:else}<p class="saved-pic">Email belum diisi</p>{/if}{/if}</div>
        <div class="row-actions"><span class="badge" class:green={account.active} class:amber={!!account.email && !account.active && account.status !== 'Gagal dikirim'} class:missing={!account.email || account.status === 'Gagal dikirim'}>{account.status}</span><div>{#if account.name || account.email}{#if isEditing(account)}<button class="edit-button" aria-label={`Batal ubah PIC ${account.campus}`} title="Batal ubah PIC" onclick={() => cancelEdit(account)}><Icon name="close" size={17}/></button>{:else}<button class="edit-button" aria-label={`Ubah PIC ${account.campus}`} title="Ubah nama dan email PIC" onclick={() => editing = [...editing, account.campusId]}><Icon name="edit" size={17}/></button>{/if}{/if}</div>{#if account.sentAt}<small>Terakhir: {new Date(account.sentAt).toLocaleString('id-ID')}</small>{/if}</div>
      </article>
    {:else}<p class="empty-result">Tidak ada kampus yang cocok dengan pencarian atau filter.</p>{/each}
  </div>
  <nav class="pagination" aria-label="Halaman daftar akun"><span>{total ? (pageNumber - 1) * 10 + 1 : 0}&ndash;{Math.min(pageNumber * 10, total)} dari {total} kampus</span><div><button class="button secondary" disabled={busy || pageNumber === 1} onclick={() => currentPage = pageNumber - 1}>Sebelumnya</button><span>Halaman {pageNumber} dari {pageCount}</span><button class="button secondary" disabled={busy || pageNumber === pageCount} onclick={() => currentPage = pageNumber + 1}>Berikutnya</button></div></nav>
</section>
{#if resetAccounts}<Modal title="Ubah email akun aktif?" onclose={() => resetAccounts = null}><p>Perubahan email akan membatalkan tautan lama, mencabut akses lama dan mengharuskan aktivasi ulang.</p><ul class="recipient-list">{#each resetAccounts as a}<li><strong>{a.campus}</strong><span>{a.email} → {normalizeEmail(drafts[a.campusId]) || 'Email dikosongkan'}</span></li>{/each}</ul><div class="dialog-actions"><button class="button secondary" onclick={() => resetAccounts = null}>Batal</button><button class="button" disabled={busy} onclick={commitEmails}>Simpan & reset aktivasi</button></div></Modal>{/if}


<style>
  .saved-pic{font-size:12px;line-height:1.7;color:#6b819c;margin-top:7px;overflow-wrap:anywhere}.saved-email{font-size:12px;line-height:1.8;color:#2368b5;overflow-wrap:anywhere}.saved-email:hover{text-decoration:underline}.edit-button{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;border:1px solid #c4d8f0;border-radius:8px;color:#2368b5;background:#f3f8ff;cursor:pointer}.edit-button:hover{background:#e3efff}.edit-button:focus-visible{outline:3px solid #91bfff;outline-offset:3px}

  .row-actions{text-align:right}.row-actions>div{justify-content:flex-end}.roster-head>span:last-child{text-align:right}.badge.missing{color:#b42318;background:#fff0ee}.row-actions .badge.amber{color:#956000;background:#fff4d6}.row-actions .badge.green{color:#187347;background:#e7f6ec}
  .campus-details{flex:1;min-width:0}.pic-field label{display:block;font-size:10px;color:#607b9d;margin:8px 0 6px}.pic-field input{width:100%;min-width:0;min-height:40px;font-size:11px}.campus-cell{align-items:flex-start}.campus-cell>.avatar{margin-top:5px}
  .email-cell label{display:block;font-size:10px;color:#607b9d;margin:7px 0}.pagination{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;border-bottom:1px solid #e5edf7;font-size:11px;color:#607b9d}.pagination>div{display:flex;align-items:center;gap:12px}.pagination .button{padding:9px 12px;font-size:11px}@media(max-width:750px){.pagination{flex-direction:column;padding:18px}.pagination>div{gap:8px}}
  .mock-note,.hint{font-size:11px;line-height:1.8;color:#607b9d}.mock-note{padding:13px 17px;border:1px dashed #bdd4f0;border-radius:9px;background:#f1f7ff;margin-bottom:22px}.access-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}.access-stats article{display:grid;gap:12px;background:white;border:1px solid #dce7f7;border-radius:11px;padding:22px}.access-stats span{font-size:12px;color:#6a809d}.access-stats strong{font-size:29px}.account-panel{overflow:hidden}.roster-heading{padding:24px;display:flex;gap:18px;align-items:center;justify-content:space-between}.roster-heading h2{font-size:16px}.roster-heading p{font-size:12px;color:#7185a0;margin-top:7px}.filters{display:flex;gap:12px;padding:0 24px 18px}.filters .search-field{flex:1}.filters select{min-width:180px}.text-link{font-size:11px}.text-link:disabled{opacity:.4;cursor:not-allowed}.hint,.error,.success-note{margin:12px 24px}.error,.success-note{font-size:11px;padding:12px;border-radius:7px;line-height:1.8}.error,.field-error{color:#a33b31}.error{background:#fff0ee}.success-note{color:#247555;background:#edf8f1}.roster-head,.account-row{display:grid;grid-template-columns:minmax(220px,1.1fr) minmax(200px,1fr) minmax(185px,.8fr);gap:22px;padding:19px 24px;align-items:center}.roster-head{background:#f9fbff;font-size:11px;color:#6e84a2;border-bottom:1px solid #e1ebf6}.campus-cell{display:flex;gap:13px;align-items:center}.account-row{border-bottom:1px solid #e5edf7}.account-row:hover{background:#fafcff}.avatar{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;color:#2c76c9;background:#edf5ff;flex-shrink:0}.campus-cell strong{font-size:12px;line-height:1.7}.email-cell{min-width:0}.email-cell input{width:100%;min-width:0;min-height:44px;font-size:12px}.email-cell input[aria-invalid=true]{border-color:#ce675c}.email-cell small,.row-actions small{display:block;font-size:10px;color:#7e91aa;margin-top:7px;overflow-wrap:anywhere}.email-cell .field-error{color:#a33b31}.row-actions{min-width:0}.row-actions .badge{display:inline-flex}.row-actions>div{display:flex;gap:15px;flex-wrap:wrap;margin-top:9px}.empty-result{padding:40px;text-align:center;font-size:12px;color:#6b829e}.recipient-list{list-style:none;margin:20px 0;padding:0;max-height:320px;overflow:auto}.recipient-list li{padding:12px 0;border-bottom:1px solid #e0eaf6;display:grid;gap:7px;font-size:12px;overflow-wrap:anywhere}.recipient-list span{color:#6b819c}
  @media(max-width:1100px){.avatar{display:none}.roster-head,.account-row{grid-template-columns:minmax(180px,1fr) minmax(170px,1fr) minmax(160px,.8fr);gap:14px}}
  @media(max-width:750px){.access-stats{grid-template-columns:repeat(2,1fr);gap:10px}.access-stats article{padding:16px}.roster-heading{padding:18px;align-items:flex-start;flex-wrap:wrap}.filters{padding:0 18px 18px;flex-direction:column}.roster-head{display:block;padding:15px 18px}.roster-head>span{display:none}.account-row{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:20px 18px}.campus-cell strong{font-size:13px}.email-cell,.row-actions{margin-left:0}.row-actions>div{justify-content:flex-end}.hint,.error,.success-note{margin-inline:18px}}
  .pic-field input,.email-cell input{height:44px;min-height:44px;font-size:12px}
  .pic-field label,.email-cell label{margin:0 0 7px}
  @media(min-width:751px){
    .account-row:not(.editing) .saved-pic{margin:0;line-height:1.7}
    .account-row:not(.editing) .saved-email{display:block;line-height:1.7}
    .account-row{grid-template-rows:auto auto;row-gap:8px}
    .account-row:not(.editing){row-gap:4px}
    .account-row:not(.editing) .campus-details>strong{align-self:end}
    .account-row:not(.editing) .campus-cell>.avatar{align-self:center;margin-top:0}
    .account-row .campus-cell{grid-column:1;grid-row:1 / span 2;display:grid;grid-template-columns:38px minmax(0,1fr);grid-template-rows:subgrid;row-gap:inherit;align-items:start}
    .account-row .campus-cell>.avatar{grid-column:1;grid-row:1 / span 2}
    .account-row .campus-details{grid-column:2;grid-row:1 / span 2;display:grid;grid-template-rows:subgrid}
    .account-row .email-cell{grid-column:2;grid-row:2;align-self:start}
    .account-row .row-actions{grid-column:3;grid-row:1 / span 2}
  }
  @media(min-width:751px) and (max-width:1100px){
    .account-row .campus-cell{grid-template-columns:minmax(0,1fr)}
    .account-row .campus-details{grid-column:1}
  }
</style>
