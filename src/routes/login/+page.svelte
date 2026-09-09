<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let account = $state('');
  let search = $state('');
  let role = $state<'campus' | 'admin'>('campus');
  const visibleAccounts = $derived(app.accounts.filter(a => a.role === role && a.name.toLocaleLowerCase('id').includes(search.trim().toLocaleLowerCase('id'))));
  const selected = $derived(app.accounts.find(a => a.key === account));
  $effect(() => { if (app.ready && app.session) goto(`/${app.session.role}/dashboard`, { replaceState: true }); });
  $effect(() => { if (!app.accounts.some(a => a.key === account)) account = app.accounts[0]?.key || ''; });
  async function enter() { if (account && await app.login(account) && app.session) goto(`/${app.session.role}/dashboard`); }
</script>
<svelte:head><title>Preview lokal · Digitalisasi DEB</title></svelte:head>
<main id="main-content" class="login-page">
  <section class="login-story"><a class="brand" href="/login"><span class="brand-mark"><Icon name="leaf" size={29}/></span><span>DEB<span class="brand-sub">RUANG TUMBUH BERSAMA</span></span></a><div class="login-copy"><span class="eyebrow light">DIGITALISASI DEB PUTIH</span><h1>Dari kolaborasi,<br/>tumbuh <em>perubahan.</em></h1><p>Satu ruang untuk merawat gagasan, memantau langkah, dan mewujudkan dampak bersama kampus mitra.</p><div class="login-metrics"><div><strong>{app.accounts.filter(a => a.role === 'campus').length || '—'}</strong><span>Kampus mitra</span></div><div><strong>PB</strong><span>Sumber data tunggal</span></div><div><strong>1</strong><span>Tujuan bersama</span></div></div></div><div class="landscape" aria-hidden="true"><span class="sun"></span><div class="hill back"></div><div class="hill front"></div><svg viewBox="0 0 460 220"><path d="M220 220V70m0 94c-75 0-95-60-95-90 60 0 95 25 95 90Zm0-43c75 0 100-65 100-110-72 0-100 42-100 110Z" fill="#c6e4a7"/><path d="m220 163-65-62m65 23 73-81" fill="none" stroke="#326747" stroke-width="3"/></svg></div><div class="login-footer">PERTAMINA FOUNDATION <span>Untuk masa depan yang berkelanjutan.</span></div></section>

<section class="login-panel"><div class="login-form">
<span class="demo-label"><span></span>PocketBase lokal · Hanya baca</span>
<h2>Selamat datang.</h2>
<p class="login-intro">Pilih akun seed untuk membaca data DEB dari PocketBase. Ini preview lokal, bukan autentikasi production.</p>
<form onsubmit={(event) => { event.preventDefault(); enter(); }}>
<div class="account-tabs" role="group" aria-label="Jenis akun">
{#each ['campus', 'admin'] as kind}<button type="button" class:active={role === kind} aria-pressed={role === kind} disabled={app.loading} onclick={() => { role = kind as 'campus' | 'admin'; search = ''; account = app.accounts.find(a => a.role === role)?.key || ''; }}>{kind === 'campus' ? 'Kampus mitra' : 'Administrator'}<span>{app.accounts.filter(a => a.role === kind).length}</span></button>{/each}
</div>
<label for="account-search">{role === 'campus' ? 'Cari kampus' : 'Cari administrator'}</label>
<input id="account-search" type="search" bind:value={search} placeholder={role === 'campus' ? 'Ketik nama kampus…' : 'Ketik nama administrator…'} disabled={app.accountsLoading || app.loading}/>
<div class="account-list" role="group" aria-label="Akun preview" aria-busy={app.accountsLoading}>
{#each visibleAccounts as a}
<label class="account-card" class:selected={account === a.key}>
<input type="radio" name="preview-account" value={a.key} bind:group={account} disabled={app.accountsLoading || app.loading}/>
<span class="account-avatar" aria-hidden="true">{a.name.split(' ').slice(0, 2).map(word => word[0]).join('')}</span>
<span class="account-detail"><strong>{a.name}</strong><small>{a.role === 'campus' ? 'Ruang kerja kampus' : 'Pemantauan seluruh kampus'}</small></span>
</label>
{:else}{#if !app.accountsLoading}<p class="no-results">{search ? 'Tidak ditemukan. Coba nama kampus atau kata kunci lain.' : 'Belum ada akun yang tersedia.'}</p>{/if}{/each}
</div>
<p class="selection-summary" role="status">{selected ? `Pilihan: ${selected.name}` : 'Pilih akun untuk melanjutkan.'}</p>
<button class="button" disabled={!account || app.accountsLoading || app.loading}>{app.loading ? 'Memuat PocketBase…' : 'Buka ruang kerja'}<Icon name="arrow"/></button>
</form>
{#if app.accountsLoading}<p role="status">Memuat akun dari PocketBase…</p>{:else if !app.accounts.length}<p>Daftar akun belum tersedia. Pastikan PocketBase aktif dan akun seed sudah diprovisioning.</p>{/if}
{#if app.error}<p role="alert" class="danger-text">{app.error}</p>{/if}
<button class="text-link" disabled={app.accountsLoading || app.loading} onclick={() => app.loadAccounts()}>Muat ulang daftar akun</button>
<div class="login-hint"><Icon name="faq" size={18}/><p>Data bisnis hanya berasal dari PocketBase. Password akun tetap di server lokal. Fitur penyimpanan menyusul P3.</p></div>
</div></section></main>
<style>
form{display:grid;gap:12px;margin:24px 0}label{font-weight:650;color:#12386b}form .button{justify-content:center}.login-form>p{line-height:1.7}
.account-tabs{display:flex;padding:4px;border-radius:12px;background:#edf4ff;gap:4px}.account-tabs button{flex:1;border:0;background:transparent;padding:11px 8px;border-radius:9px;color:#526887;font-weight:650}.account-tabs button.active{background:white;color:#075bc7;box-shadow:0 2px 6px #194b8a14}.account-tabs span{margin-left:7px;font-size:11px;opacity:.7}
#account-search{width:100%;padding:13px 15px;border:1px solid #bdd2eb;border-radius:10px;background:white;color:#12386b}.account-list{max-height:245px;overflow-y:auto;display:grid;gap:8px;padding:3px;overscroll-behavior:contain}.account-card{display:flex;align-items:center;gap:11px;padding:13px 11px;border:1px solid #e0e9f5;border-radius:12px;cursor:pointer;background:white}.account-card:hover{background:#f5f9ff}.account-card.selected{border-color:#1673de;background:#edf5ff}.account-card:focus-within{outline:2px solid #1673de;outline-offset:1px}.account-card input{accent-color:#0969d7;flex-shrink:0}.account-avatar{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border-radius:10px;background:#dfeeff;color:#1262bd;font-size:12px}.account-detail{display:grid;gap:5px;min-width:0}.account-detail strong{font-size:13px;line-height:1.5}.account-detail small{font-size:11px;color:#73839b;font-weight:400}.selection-summary,.no-results{font-size:12px;color:#61738f;line-height:1.6;margin:0}.selection-summary{padding:9px 12px;background:#f6f9fd;border-radius:8px}
form>label{margin-bottom:0}.account-card{flex-direction:row;margin:0;text-align:left}.account-card input{width:16px;height:16px;padding:0;margin:0}.account-list{align-content:start}
.login-panel{padding:24px 40px}.login-form>.demo-label{margin-bottom:12px}.login-form h2{font-size:30px}.login-intro{margin:8px 0 16px;max-width:none}.login-form>p{line-height:1.6}form{gap:8px;margin:16px 0}.account-list{max-height:clamp(110px,calc(100dvh - 560px),220px)}.account-card{padding:10px}.login-hint{margin-top:12px}.login-hint p{line-height:1.5}
@media(max-width:700px){.login-panel{padding:24px}.account-list{max-height:180px}}
@media(min-width:701px){.login-story{min-height:100dvh;padding-top:32px;padding-bottom:28px}.login-copy{margin-top:clamp(32px,7vh,75px)}.login-footer{padding-top:24px}.login-metrics{margin-top:28px}}
</style>
