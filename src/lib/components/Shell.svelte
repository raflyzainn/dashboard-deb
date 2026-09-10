<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import Icon from './Icon.svelte';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let mobile = $state(false);
  let drawer: HTMLDialogElement;
  const labels = { 'master-indicators': 'Master indikator', dashboard: 'Ringkasan', campuses: 'Kampus mitra', sebaran: 'Peta Persebaran', verifikasi: 'Review Kampus', indicators: 'Indikator DEB', proposal: 'Proposal', questions: 'Forum Q&A', faq: 'Pusat bantuan', notifications: 'Notifikasi' };
  const menus = $derived(app.session?.role === 'admin' ? ['dashboard', 'verifikasi', 'campuses', 'master-indicators', 'sebaran', 'proposal', 'questions', 'faq', 'notifications'] : ['dashboard', 'indicators', 'proposal', 'questions', 'faq', 'notifications']);
  const pendingCount = $derived(app.data?.submissions?.filter(s => s.status === 'pending').length || 0);
  const prefix = $derived(`/${app.session?.role}`);
  const section = $derived(page.url.pathname.split('/')[2] as keyof typeof labels);
  const revisionCount = $derived(app.data?.feedback.filter(f => f.requiresRevision && f.state !== 'closed').length || 0);
  const campusProfile = $derived(app.data?.campuses.find(c => c.id === app.session?.campusId));
  const unreadCount = $derived(app.data?.notifications?.filter(n => !n.readAt).length || 0);
  function closeDrawer() { mobile = false; drawer?.close(); }
  function openDrawer() { mobile = true; drawer.showModal(); }
  function logout() { closeDrawer(); if (app.logout()) goto('/login'); }
</script>

{#snippet navigation()}
  <a class="brand" href={`${prefix}/dashboard`} onclick={closeDrawer}><span class="brand-mark"><Icon name="leaf" size={27}/></span><span>DEB<span class="brand-sub">RUANG TUMBUH BERSAMA</span></span></a>
  <div class="workspace"><span class="workspace-icon"><Icon name={app.session?.role === 'admin' ? 'globe' : 'campus'}/></span><div><strong>{app.session?.role === 'admin' ? 'Pertamina Foundation' : campusProfile?.name}</strong><small>{app.session?.role === 'admin' ? 'Ruang kerja Admin PF' : 'Ruang kerja kampus'}</small></div></div>
  <p class="nav-caption">RUANG KERJA</p>
  <nav aria-label="Navigasi utama">
    {#each menus as key}
      {#if key === 'questions'}<div class="nav-divider"></div><p class="nav-caption">BELAJAR BERSAMA</p>{/if}
      <a href={`${prefix}/${key}`} class:active={section === key} aria-current={section === key ? 'page' : undefined} onclick={closeDrawer}><Icon name={key === 'master-indicators' ? 'indicators' : key}/><span>{labels[key as keyof typeof labels]}</span>{#if key === 'verifikasi' && pendingCount}<span class="nav-count">{pendingCount}</span>{/if}{#if key === 'indicators' && revisionCount}<span class="nav-count">{revisionCount}</span>{/if}{#if key === 'notifications' && unreadCount}<span class="nav-count">{unreadCount}</span>{/if}</a>
    {/each}
  </nav>
  <div class="sidebar-bottom"><div class="sidebar-note"><Icon name="leaf"/><strong>Langkah kecil.<br/>Dampak berkelanjutan.</strong><p>Tumbuh bersama kampus dan masyarakat.</p></div><button class="sidebar-action" onclick={logout} disabled={app.busy}><Icon name="logout" size={17}/>Keluar / ganti akun</button></div>
{/snippet}

<aside class="sidebar">{@render navigation()}</aside>
<dialog bind:this={drawer!} class="mobile-drawer" oncancel={() => { mobile = false; }}><button class="drawer-close icon-button" aria-label="Tutup navigasi" onclick={closeDrawer}><Icon name="close"/></button>{@render navigation()}</dialog>
<div class="app-main">
  <header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" aria-label="Buka navigasi" aria-expanded={mobile} onclick={openDrawer}><Icon name="menu"/></button><span class="breadcrumb">Ruang kerja <span>/</span> <strong>{labels[section] || 'Detail'}</strong></span></div><div class="topbar-right"><a class="icon-button" href={`${prefix}/notifications`} aria-label={`Notifikasi, ${unreadCount} belum dibaca`}><Icon name="notifications"/>{#if unreadCount}<span class="notification-dot" aria-hidden="true"></span>{/if}</a><span class="demo-label"><span></span>Prototype · Data simulasi</span><div class="header-divider"></div><div class="user-avatar">{app.session?.role === 'admin' ? 'PF' : campusProfile?.initials}</div><div class="user-info"><strong>{app.session?.name}</strong><small>{app.session?.role === 'admin' ? 'Administrator' : 'Kampus mitra'}</small></div></div></header>
  <main id="main-content" class="content"><section class="backend-notice" aria-label="Status sumber data"><div><strong>PocketBase lokal - Akun QA</strong><small>{app.session?.name} · {app.loadedAt ? 'Diperbarui ' + new Date(app.loadedAt).toLocaleTimeString('id-ID') : 'Belum dimuat'}{app.stale ? ' · Pembaruan gagal; data terakhir ditampilkan' : ''}</small><small>Perubahan tersimpan di PocketBase lokal.</small></div><button class="button secondary small" disabled={app.loading} onclick={() => app.reload()}>{app.loading ? 'Memuat…' : 'Muat ulang data'}</button></section>{@render children()}</main>
  <footer class="app-footer"><span>Digitalisasi DEB <span class="footer-dot">•</span> Pertamina Foundation</span><span>Bersama membangun dampak yang berarti.</span></footer>
</div>

<style>.topbar-right .icon-button{position:relative}.notification-dot{position:absolute;top:5px;right:5px;width:8px;height:8px;background:#d5483e;border:2px solid white;border-radius:50%}.backend-notice{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#edf5ff;border:1px solid #c5daf5;border-radius:12px;padding:14px 18px;margin-bottom:24px;color:#163f76}.backend-notice small{display:block;margin-top:5px}.backend-notice button{flex-shrink:0}@media(max-width:600px){.backend-notice{align-items:start;flex-direction:column}}</style>
