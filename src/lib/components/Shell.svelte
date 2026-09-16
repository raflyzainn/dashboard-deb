<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import Icon from './Icon.svelte';
  import ChangePassword from './ChangePassword.svelte';
  let changingPassword = $state(false);
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let mobile = $state(false);
  let drawer: HTMLDialogElement;
  const labels = {
    guide: 'Panduan aplikasi',
    'master-indicators': 'Master indikator',
    dashboard: 'Beranda',
    campuses: 'Kampus mitra',
    sebaran: 'Peta Persebaran',
    verifikasi: 'Review Kampus',
    indicators: 'Indikator DEB',
    proposal: 'Proposal',
    questions: 'Forum Q&A',
    faq: 'Pusat bantuan',
    notifications: 'Notifikasi'
  };
  const menus = $derived(
    app.session?.role === 'admin'
      ? [
          'dashboard',
          'verifikasi',
          'campuses',
          'master-indicators',
          'sebaran',
          'proposal',
          'questions',
          'faq',
          'notifications'
        ]
      : ['dashboard', 'indicators', 'proposal', 'questions', 'faq', 'notifications']
  );
  const pendingCount = $derived(app.navigation.pendingCount);
  const prefix = $derived(`/${app.session?.role}`);
  const section = $derived(page.url.pathname.split('/')[2] as keyof typeof labels);
  const revisionCount = $derived(app.navigation.revisionCount);
  const campusProfile = $derived(app.navigation.campus);
  const unreadCount = $derived(app.navigation.unreadCount);
  async function selectPeriod(event: Event) {
    const select = event.currentTarget as HTMLSelectElement;
    const url = new URL(page.url);
    url.searchParams.set('period', select.value);
    try {
      await goto(url, { noScroll: true });
    } catch {
      select.value = app.data?.period?.id ?? '';
    }
  }
  function closeDrawer() {
    mobile = false;
    drawer?.close();
  }
  function openDrawer() {
    mobile = true;
    drawer.showModal();
  }
  async function logout() {
    closeDrawer();
    if (await app.logout()) goto('/login');
  }
</script>

{#snippet navigation()}
  <a class="brand" href={`${prefix}/dashboard`} onclick={closeDrawer}
    ><span class="brand-mark"><Icon name="leaf" size={27} /></span><span
      >DEB<span class="brand-sub">{app.session?.role === 'admin' ? 'ADMIN PROGRAM' : 'KAMPUS MITRA'}</span></span
    ></a
  >
  <p class="nav-caption">RUANG KERJA</p>
  <nav aria-label="Navigasi utama">
    {#each menus as key}
      {#if key === 'questions'}<p class="nav-caption nav-group">DUKUNGAN</p>{/if}
      <a
        href={`${prefix}/${key}`}
        class:active={section === key}
        aria-current={section === key ? 'page' : undefined}
        onclick={closeDrawer}
        ><Icon name={key === 'master-indicators' ? 'indicators' : key} /><span
          >{labels[key as keyof typeof labels]}</span
        >{#if key === 'verifikasi' && pendingCount}<span class="nav-count">{pendingCount}</span
          >{/if}{#if key === 'indicators' && revisionCount}<span class="nav-count"
            >{revisionCount}</span
          >{/if}{#if key === 'notifications' && unreadCount}<span class="nav-count"
            >{unreadCount}</span
          >{/if}</a
      >
    {/each}
  </nav>
  <div class="sidebar-bottom">
    <img
      class="sidebar-pf-logo"
      src="/logo-pf.png"
      alt="Pertamina Foundation"
      width="160"
      height="43"
    />
    <button
      class="sidebar-action"
      onclick={() => {
        closeDrawer();
        changingPassword = true;
      }}><Icon name="reset" size={17} />Ganti password</button
    ><button class="sidebar-action" onclick={logout} disabled={app.busy}
      ><Icon name="logout" size={17} />Keluar / ganti akun</button
    >
  </div>
{/snippet}

{#if changingPassword}<ChangePassword onclose={() => (changingPassword = false)} />{/if}
<aside class="sidebar navigation-panel">{@render navigation()}</aside>
<dialog
  bind:this={drawer!}
  class="mobile-drawer navigation-panel"
  oncancel={() => {
    mobile = false;
  }}
>
  <button class="drawer-close icon-button" aria-label="Tutup navigasi" onclick={closeDrawer}
    ><Icon name="close" /></button
  >{@render navigation()}
</dialog>
<div class="app-main">
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="icon-button mobile-menu"
        aria-label="Buka navigasi"
        aria-expanded={mobile}
        onclick={openDrawer}><Icon name="menu" /></button
      ><span class="breadcrumb"
        >Ruang kerja <span>/</span> <strong>{labels[section] || 'Detail'}</strong></span
      >
    </div>
    <div class="topbar-right">
      {#if app.session?.role === 'campus'}<a
          class="icon-button guide-button"
          class:guide-active={section === 'guide'}
          href="/campus/guide"
          aria-label="Panduan aplikasi"
          title="Panduan aplikasi"
          aria-current={section === 'guide' ? 'page' : undefined}><Icon name="faq" /></a
        >{/if}<a
        class="icon-button"
        href={`${prefix}/notifications`}
        aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
        ><Icon name="notifications" />{#if unreadCount}<span
            class="notification-dot"
            aria-hidden="true"
          ></span>{/if}</a
      ><span class="demo-label"><span></span>Prototype · Data simulasi</span>
      <div class="header-divider"></div>
      <div class="user-avatar">
        {app.session?.role === 'admin' ? 'PF' : campusProfile?.initials}
      </div>
      <div class="user-info">
        <strong>{app.session?.name}</strong><small
          >{app.session?.role === 'admin' ? 'Administrator' : 'Kampus mitra'}</small
        >
      </div>
    </div>
  </header>
  <main id="main-content" class="content">
    {#if app.data?.periods?.length}
      <div class="period-switcher">
        <label class="period-control">
          <span class="period-icon"><Icon name="calendar" size={19} /></span>
          <span class="period-field">
            <span class="period-label">Periode penilaian</span>
            <select
            aria-label="Periode penilaian"
            value={app.data.period?.id ?? ''}
            onchange={selectPeriod}
            disabled={app.busy || app.loading}
          >
            {#each app.data.periods as period}<option value={period.id}
                >{period.name} · {period.state === 'active' ? 'Aktif' : 'Arsip'}</option
              >{/each}
            </select>
          </span>
        </label>
        {#if app.data.period?.state === 'archived'}<span class="period-archive">Arsip · hanya baca</span>{/if}
      </div>
    {/if}
    {@render children()}
  </main>
  <footer class="app-footer">
    <span>Digitalisasi DEB <span class="footer-dot">•</span> Pertamina Foundation</span><span
      >Bersama membangun dampak yang berarti.</span
    >
  </footer>
</div>

<style>
  .navigation-panel {
    --nav-text: #d6e8ff;
    --nav-muted: #bcd9ff;
    --nav-active: #0b59cb;
    --nav-selected: #fff;
    --nav-hover: #ffffff13;
    --nav-button: #ffffff10;
    --brand-color: #fff;
    --brand-background: #ffffff1c;
    background: linear-gradient(180deg, #145ee8 0%, #1636b5 100%);
    color: white;
    padding: 20px 12px 12px;
    border: 0;
    box-shadow: none;
  }
  .sidebar {
    width: 224px;
    height: 100dvh;
  }
  .mobile-drawer {
    --nav-text: #45618a;
    --nav-muted: #56769e;
    --nav-active: #075fc7;
    --nav-selected: #e9f3ff;
    --nav-hover: #eff6ff;
    --nav-button: #eff6ff;
    --brand-color: #0b2b6f;
    --brand-background: #145ee8;
    background: #fff;
    color: #0b2b6f;
  }
  .mobile-drawer[open] {
    display: flex;
    flex-direction: column;
    padding-top: 38px;
    width: 260px;
    max-width: calc(100vw - 32px);
  }
  .app-main {
    margin-left: 224px;
  }
  .navigation-panel :global(.brand) {
    color: var(--brand-color);
    font-size: 23px;
    margin: 0 6px 28px;
    gap: 10px;
    flex-shrink: 0;
  }
  .navigation-panel :global(.brand-mark) {
    width: 38px;
    height: 40px;
    border-radius: 11px;
    background: var(--brand-background);
    color: #fff;
    border: 0;
    flex-shrink: 0;
  }
  .navigation-panel :global(.brand-sub) {
    font-size: 8px;
    letter-spacing: 1.2px;
    margin-top: 5px;
    color: var(--nav-muted);
  }
  .navigation-panel :global(nav) {
    min-height: 0;
    overflow-y: auto;
  }
  .navigation-panel :global(nav > a) {
    min-height: 38px;
    padding: 8px 10px;
    gap: 10px;
    margin-bottom: 2px;
    font-size: 13px;
    font-weight: 550;
    border-radius: 10px;
    color: var(--nav-text);
  }
  .navigation-panel :global(nav > a > svg) {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  .navigation-panel :global(nav > a:hover) {
    background: var(--nav-hover);
  }
  .navigation-panel :global(nav > a.active) {
    color: var(--nav-active);
    background: var(--nav-selected);
    box-shadow: none;
    font-weight: 650;
  }
  .navigation-panel :global(.nav-count) {
    background: white;
    color: var(--nav-active);
    border-radius: 999px;
    font-size: 10px;
    padding-inline: 4px;
  }
  .navigation-panel :global(.nav-caption) {
    flex-shrink: 0;
    margin: 0 10px 8px;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 1.4px;
    color: var(--nav-muted);
  }
  .navigation-panel :global(.nav-group) {
    margin-top: 26px;
  }
  .navigation-panel :global(.sidebar-bottom) {
    margin-top: auto;
    padding-top: 24px;
    flex-shrink: 0;
  }
  .navigation-panel :global(.sidebar-action) {
    min-height: 38px;
    padding: 9px 10px;
    margin-top: 4px;
    border-radius: 10px;
    background: var(--nav-button);
    color: var(--nav-text);
    font-size: 12px;
    gap: 8px;
  }
  .navigation-panel :global(.sidebar-action:hover) {
    background: var(--nav-hover);
  }
  .navigation-panel :global(.sidebar-pf-logo) {
    width: 112px;
    margin: 0 10px 16px;
  }
  .navigation-panel :global(.drawer-close) {
    color: var(--brand-color);
  }
  .period-switcher {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
    font-size: 12px;
  }
  .period-control {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 300px;
    max-width: 100%;
    padding: 10px 14px;
    border: 1px solid #d8e6f8;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 6px #16458205;
    cursor: pointer;
  }
  .period-control:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px #2563eb18;
  }
  .period-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    background: #edf5ff;
    color: #1460d9;
  }
  .period-field {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 3px;
  }
  .period-label {
    color: #647a98;
    font-size: 10px;
    line-height: 1.4;
  }
  .period-switcher select {
    margin: 0;
    padding: 0 24px 0 0;
    width: 100%;
    min-height: 24px;
    height: auto;
    border: 0;
    border-radius: 0;
    background-color: transparent;
    background-position: right center;
    color: #123466;
    font-size: 13px;
    font-weight: 650;
    box-shadow: none;
    cursor: pointer;
  }
  .period-switcher select:focus {
    outline: none;
  }
  .period-archive {
    padding: 5px 9px;
    border-radius: 6px;
    background: #fff6df;
    color: #9a6700;
    font-size: 11px;
  }
  @media (max-width: 900px) {
    .sidebar {
      width: 196px;
    }
    .app-main {
      margin-left: 196px;
    }
  }
  @media (max-width: 700px) {
    .app-main {
      margin-left: 0;
    }
  }
  .sidebar-pf-logo {
    display: block;
    width: 160px;
    max-width: 100%;
    height: auto;
    margin: 0 0 18px;
    object-fit: contain;
  }
  .topbar-right .icon-button {
    position: relative;
  }
  .notification-dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 8px;
    height: 8px;
    background: #d5483e;
    border: 2px solid white;
    border-radius: 50%;
  }
</style>
