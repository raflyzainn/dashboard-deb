<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  let accountMenu = $state(false);
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let mobile = $state(false);
  let drawer: HTMLDialogElement;
  const labels = {
    guide: 'Panduan aplikasi',
    profile: 'Profil Program',
    settings: 'Pengaturan',
    'master-indicators': 'Master indikator',
    dashboard: 'Beranda',
    campuses: 'Kampus mitra',
    sebaran: 'Peta Persebaran',
    verifikasi: 'Review Kampus',
    indicators: 'Indikator DEB',
    proposal: 'Proposal',
    payments: 'Pencairan',
    questions: 'Forum Q&A',
    faq: 'Pusat bantuan',
    notifications: 'Notifikasi'
  };
  const menus = $derived(
    app.session?.role === 'finance'
      ? ['dashboard', 'payments', 'notifications']
      : app.session?.role === 'admin'
        ? [
            'dashboard',
            'verifikasi',
            'campuses',
            'master-indicators',
            'sebaran',
            'proposal',
            'payments',
            'questions',
            'faq',
            'notifications'
          ]
        : [
            'dashboard',
            'profile',
            'indicators',
            'proposal',
            'payments',
            'questions',
            'faq',
            'notifications'
          ]
  );
  const pendingCount = $derived(app.navigation.pendingCount);
  const prefix = $derived(`/${app.session?.role}`);
  const section = $derived(page.url.pathname.split('/')[2] as keyof typeof labels);
  const revisionCount = $derived(app.navigation.revisionCount);
  const campusProfile = $derived(app.navigation.campus);
  const unreadCount = $derived(app.navigation.unreadCount);
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
    accountMenu = false;
    if (await app.logout()) goto('/login');
  }
</script>

{#snippet navigation()}
  <a
    class="[-webkit-tap-highlight-color:transparent] text-[color:var(--dark)] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] flex items-center gap-y-[10px] gap-x-[10px] mt-[0px] mb-[30px] text-[30px] tracking-[-1.3px] font-[800] leading-[1] mx-[10px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] max-[900.01px]:text-[27px] brand"
    href={`${prefix}/dashboard`}
    onclick={closeDrawer}
    ><span
      class="flex items-center justify-center w-[42px] h-[45px] [background-image:initial] [background-color:var(--dark)] text-[#cce8b3] [border-top-left-radius:13px] [border-top-right-radius:13px] [border-bottom-right-radius:13px] [border-bottom-left-radius:4px] brand-mark"
      ><Icon name="leaf" size={27} /></span
    ><span
      >DEB<span
        class="block text-[7px] tracking-[1.5px] font-[650] mt-[8px] text-[#788975] max-[900.01px]:text-[6px] brand-sub"
        >{app.session?.role === 'admin'
          ? 'ADMIN PROGRAM'
          : app.session?.role === 'finance'
            ? 'KEUANGAN'
            : 'KAMPUS MITRA'}</span
      ></span
    ></a
  >
  <p
    class="mt-[0px] mb-[12px] leading-[1.8] text-[9px] tracking-[1.35px] font-[700] text-[#778c69] mx-[12px] nav-caption"
  >
    RUANG KERJA
  </p>
  <nav aria-label="Navigasi utama">
    {#each menus as key}
      {#if key === 'questions'}<p
          class="mt-[0px] mb-[12px] leading-[1.8] text-[9px] tracking-[1.35px] font-[700] text-[#778c69] mx-[12px] nav-caption nav-group"
        >
          DUKUNGAN
        </p>{/if}
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[inherit] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
        href={`${prefix}/${key}`}
        class:active={section === key}
        aria-current={section === key ? 'page' : undefined}
        onclick={closeDrawer}
        ><Icon
          name={key === 'profile' ? 'campus' : key === 'master-indicators' ? 'indicators' : key}
        /><span>{labels[key as keyof typeof labels]}</span
        >{#if key === 'verifikasi' && pendingCount}<span
            class="ml-[auto] flex items-center justify-center [background-image:initial] [background-color:rgb(244,_219,_168)] text-[#795716] text-[9px] min-w-[20px] h-[20px] rounded-[5px] nav-count"
            >{pendingCount}</span
          >{/if}{#if key === 'indicators' && revisionCount}<span
            class="ml-[auto] flex items-center justify-center [background-image:initial] [background-color:rgb(244,_219,_168)] text-[#795716] text-[9px] min-w-[20px] h-[20px] rounded-[5px] nav-count"
            >{revisionCount}</span
          >{/if}{#if key === 'notifications' && unreadCount}<span
            class="ml-[auto] flex items-center justify-center [background-image:initial] [background-color:rgb(244,_219,_168)] text-[#795716] text-[9px] min-w-[20px] h-[20px] rounded-[5px] nav-count"
            >{unreadCount}</span
          >{/if}</a
      >
    {/each}
  </nav>
  <div class="mt-[auto] pt-[25px] sidebar-bottom">
    <img
      class="[&&]:block [&&]:w-[160px] [&&]:max-w-[100%] [&&]:h-[auto] [&&]:mt-[0px] [&&]:mb-[18px] [&&]:object-contain [&&]:mx-[0px] sidebar-pf-logo"
      src="/logo-pf.png"
      alt="Pertamina Foundation"
      width="160"
      height="43"
    />
    <button
      class="sidebar-action flex w-full items-center border-0 text-left"
      type="button"
      onclick={logout}
      disabled={app.busy}><Icon name="logout" size={18} /><span>Keluar</span></button
    >
  </div>
{/snippet}

<aside
  class="fixed top-[0px] right-[auto] bottom-[0px] left-[0px] [&&]:w-[224px] [&&]:[background-image:linear-gradient(rgb(20,_94,_232)_0%,_rgb(22,_54,_181)_100%)] [&&]:[background-color:initial] [&&]:pt-[20px] [&&]:pb-[12px] flex flex-col z-[40] overflow-x-auto overflow-y-auto [overscroll-behavior-x:contain] [overscroll-behavior-y:contain] [&&]:[box-shadow:none] [&&]:[--nav-text:#d6e8ff] [&&]:[--nav-muted:#bcd9ff] [&&]:[--nav-active:#0b59cb] [&&]:[--nav-selected:#fff] [&&]:[--nav-hover:#ffffff13] [&&]:[--nav-button:#ffffff10] [&&]:[--brand-color:#fff] [&&]:[--brand-background:#ffffff1c] [&&]:text-[white] [&&]:h-[100dvh] [&&]:px-[12px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&_nav>a]:flex [&_nav>a]:items-center [&&_nav>a]:gap-y-[10px] [&&_nav>a]:gap-x-[10px] [&&_nav>a]:mb-[2px] [&&_nav>a]:text-[color:var(--nav-text)] [&&_nav>a]:text-[13px] [&&_nav>a]:font-[550] [&_nav>a]:[transition-behavior:normal] [&_nav>a]:[transition-duration:0.15s] [&_nav>a]:[transition-timing-function:ease] [&_nav>a]:[transition-delay:0s] [&_nav>a]:[transition-property:background] [&&_nav>a]:min-h-[38px] [&&_nav>a]:px-[10px] [&&_nav>a]:py-[8px] [&&_nav>a]:rounded-[10px] [&&_nav>a:hover]:[background-image:initial] [&&_nav>a:hover]:[background-color:var(--nav-hover)] [&_nav>a:hover]:text-[#fff] [&&_nav>a.active]:[background-image:initial] [&&_nav>a.active]:[background-color:var(--nav-selected)] [&&_nav>a.active]:text-[color:var(--nav-active)] [&&_nav>a.active]:font-[650] [&&_nav>a.active]:[box-shadow:none] max-[1200.01px]:[&&]:w-[224px] max-[1200.01px]:[&&]:px-[12px] max-[900.01px]:[&&]:w-[196px] max-[700.01px]:hidden max-[700.01px]:[&&_nav>a]:text-[13px] [&&_.sidebar-bottom]:pt-[24px] [&&_.sidebar-bottom]:mt-[auto] [&&_.sidebar-bottom]:shrink-0 [&_.sidebar-note]:mb-[12px] [&_.sidebar-note]:[background-image:initial] [&_.sidebar-note]:[background-color:rgba(255,_255,_255,_0.063)] [&_.sidebar-note]:p-[13px] [&_.sidebar-note]:border-[color:rgba(255,_255,_255,_0.125)] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:pt-[20px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&_.sidebar-note]:hidden [@media(min-width:_701px)_and_(max-height:_800px)]:[&&_.sidebar-bottom]:pt-[24px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&_nav>a]:py-[8px] [&&_.brand]:text-[color:var(--brand-color)] [&&_.brand]:text-[23px] [&&_.brand]:mt-[0px] [&&_.brand]:mb-[28px] [&&_.brand]:gap-y-[10px] [&&_.brand]:gap-x-[10px] [&&_.brand]:shrink-0 [&&_.brand]:mx-[6px] [&&_.brand-mark]:[background-image:initial] [&&_.brand-mark]:[background-color:var(--brand-background)] [&&_.brand-mark]:text-[#fff] [&&_.brand-mark]:w-[38px] [&&_.brand-mark]:h-[40px] [&&_.brand-mark]:shrink-0 [&&_.brand-mark]:border-[0px] [&&_.brand-mark]:border-none [&&_.brand-mark]:border-[color:currentcolor] [&&_.brand-mark]:rounded-[11px] [&&_.brand-sub]:text-[color:var(--nav-muted)] [&&_.brand-sub]:text-[8px] [&&_.brand-sub]:tracking-[1.2px] [&&_.brand-sub]:mt-[5px] [&_.workspace]:[background-image:initial] [&_.workspace]:[background-color:rgba(255,_255,_255,_0.07)] [&_.workspace]:text-[#fff] [&_.workspace]:border-[color:rgba(255,_255,_255,_0.125)] [&_.workspace-icon]:text-[#bcd9ff] [&_.workspace_small]:text-[#bcd9ff] [&&_.nav-caption]:text-[color:var(--nav-muted)] [&&_.nav-caption]:shrink-0 [&&_.nav-caption]:mt-[0px] [&&_.nav-caption]:mb-[8px] [&&_.nav-caption]:text-[9px] [&&_.nav-caption]:font-[500] [&&_.nav-caption]:tracking-[1.4px] [&&_.nav-caption]:mx-[10px] [&_.nav-divider]:[background-image:initial] [&_.nav-divider]:[background-color:rgba(255,_255,_255,_0.094)] [&&_.nav-count]:[background-image:initial] [&&_.nav-count]:[background-color:white] [&&_.nav-count]:text-[color:var(--nav-active)] [&&_.nav-count]:text-[10px] [&&_.nav-count]:px-[4px] [&&_.nav-count]:rounded-[999px] [&_.sidebar-note>svg]:text-[#fff] [&_.sidebar-note_strong]:text-[#fff] [&_.sidebar-note_p]:text-[#bcd9ff] [&&_.sidebar-action]:text-[color:var(--nav-text)] [&&_.sidebar-action]:min-h-[38px] [&&_.sidebar-action]:mt-[4px] [&&_.sidebar-action]:[background-image:initial] [&&_.sidebar-action]:[background-color:var(--nav-button)] [&&_.sidebar-action]:text-[12px] [&&_.sidebar-action]:gap-y-[8px] [&&_.sidebar-action]:gap-x-[8px] [&&_.sidebar-action]:px-[10px] [&&_.sidebar-action]:py-[9px] [&&_.sidebar-action]:rounded-[10px] [&_.sidebar-action:hover]:text-[#fff] [&&_.sidebar-action:hover]:[background-image:initial] [&&_.sidebar-action:hover]:[background-color:var(--nav-hover)] [&&_nav]:min-h-[0] [&&_nav]:overflow-y-auto [&&_nav>a>svg]:w-[18px] [&&_nav>a>svg]:h-[18px] [&&_nav>a>svg]:shrink-0 [&&_.nav-group]:mt-[26px] [&&_.sidebar-pf-logo]:w-[112px] [&&_.sidebar-pf-logo]:mt-[0px] [&&_.sidebar-pf-logo]:mb-[16px] [&&_.sidebar-pf-logo]:mx-[10px] [&&_.drawer-close]:text-[color:var(--brand-color)] sidebar navigation-panel"
>
  {@render navigation()}
</aside>
<dialog
  bind:this={drawer!}
  class="[&_nav>a]:flex [&_nav>a]:items-center [&&_nav>a]:gap-y-[10px] [&&_nav>a]:gap-x-[10px] [&&_nav>a]:mb-[2px] [&&_nav>a]:text-[color:var(--nav-text)] [&&_nav>a]:text-[13px] [&&_nav>a]:font-[550] [&_nav>a]:[transition-behavior:normal] [&_nav>a]:[transition-duration:0.15s] [&_nav>a]:[transition-timing-function:ease] [&_nav>a]:[transition-delay:0s] [&_nav>a]:[transition-property:background] [&&_nav>a]:min-h-[38px] [&&_nav>a]:px-[10px] [&&_nav>a]:py-[8px] [&&_nav>a]:rounded-[10px] [&&_nav>a:hover]:[background-image:initial] [&&_nav>a:hover]:[background-color:var(--nav-hover)] [&_nav>a:hover]:text-[#254d2e] [&&_nav>a.active]:[background-image:initial] [&&_nav>a.active]:[background-color:var(--nav-selected)] [&&_nav>a.active]:text-[color:var(--nav-active)] [&&_nav>a.active]:font-[650] [&&_nav>a.active]:[box-shadow:none] [&&]:[box-shadow:none] [&&]:pt-[20px] [&&]:pb-[12px] w-[290px] max-h-[100dvh] [&&]:text-[#0b2b6f] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] max-w-[290px] h-[100dvh] [overscroll-behavior-x:contain] [overscroll-behavior-y:contain] [&&]:[--nav-text:#45618a] [&&]:[--nav-muted:#56769e] [&&]:[--nav-active:#075fc7] [&&]:[--nav-selected:#e9f3ff] [&&]:[--nav-hover:#eff6ff] [&&]:[--nav-button:#eff6ff] [&&]:[--brand-color:#0b2b6f] [&&]:[--brand-background:#145ee8] [&&]:px-[12px] m-[0px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] rounded-[0px] [&&_.sidebar-bottom]:mt-[auto] [&&_.sidebar-bottom]:pt-[24px] [&&_.sidebar-bottom]:shrink-0 [&::backdrop]:[background-image:initial] [&::backdrop]:[background-color:rgb(255,_255,_255)] [&::backdrop]:[backdrop-filter:blur(3px)] max-[700.01px]:[&&_nav>a]:text-[13px] [&&_.brand]:text-[color:var(--brand-color)] [&&_.brand]:text-[23px] [&&_.brand]:mt-[0px] [&&_.brand]:mb-[28px] [&&_.brand]:gap-y-[10px] [&&_.brand]:gap-x-[10px] [&&_.brand]:shrink-0 [&&_.brand]:mx-[6px] [&&_.brand-mark]:[background-image:initial] [&&_.brand-mark]:[background-color:var(--brand-background)] [&&_.brand-mark]:text-[#fff] [&&_.brand-mark]:w-[38px] [&&_.brand-mark]:h-[40px] [&&_.brand-mark]:shrink-0 [&&_.brand-mark]:border-[0px] [&&_.brand-mark]:border-none [&&_.brand-mark]:border-[color:currentcolor] [&&_.brand-mark]:rounded-[11px] [&_.sidebar-note]:[background-image:initial] [&_.sidebar-note]:[background-color:rgb(239,_246,_255)] [&_.sidebar-note]:border-[color:rgb(216,_233,_251)] max-[700.01px]:[&&_.sidebar-action]:text-[color:var(--nav-text)] [&&_.brand-sub]:text-[8px] [&&_.brand-sub]:tracking-[1.2px] [&&_.brand-sub]:mt-[5px] [&&_.brand-sub]:text-[color:var(--nav-muted)] [&&_nav]:min-h-[0] [&&_nav]:overflow-y-auto [&&_nav>a>svg]:w-[18px] [&&_nav>a>svg]:h-[18px] [&&_nav>a>svg]:shrink-0 [&&_.nav-count]:[background-image:initial] [&&_.nav-count]:[background-color:white] [&&_.nav-count]:text-[color:var(--nav-active)] [&&_.nav-count]:text-[10px] [&&_.nav-count]:px-[4px] [&&_.nav-count]:rounded-[999px] [&&_.nav-caption]:shrink-0 [&&_.nav-caption]:mt-[0px] [&&_.nav-caption]:mb-[8px] [&&_.nav-caption]:text-[9px] [&&_.nav-caption]:font-[500] [&&_.nav-caption]:tracking-[1.4px] [&&_.nav-caption]:text-[color:var(--nav-muted)] [&&_.nav-caption]:mx-[10px] [&&_.nav-group]:mt-[26px] [&&_.sidebar-action]:min-h-[38px] [&&_.sidebar-action]:mt-[4px] [&&_.sidebar-action]:[background-image:initial] [&&_.sidebar-action]:[background-color:var(--nav-button)] [&&_.sidebar-action]:text-[color:var(--nav-text)] [&&_.sidebar-action]:text-[12px] [&&_.sidebar-action]:gap-y-[8px] [&&_.sidebar-action]:gap-x-[8px] [&&_.sidebar-action]:px-[10px] [&&_.sidebar-action]:py-[9px] [&&_.sidebar-action]:rounded-[10px] [&&_.sidebar-action:hover]:[background-image:initial] [&&_.sidebar-action:hover]:[background-color:var(--nav-hover)] [&&_.sidebar-pf-logo]:w-[112px] [&&_.sidebar-pf-logo]:mt-[0px] [&&_.sidebar-pf-logo]:mb-[16px] [&&_.sidebar-pf-logo]:mx-[10px] [&&_.drawer-close]:text-[color:var(--brand-color)] mobile-drawer navigation-panel"
  oncancel={() => {
    mobile = false;
  }}
>
  <button
    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] absolute top-[3px] right-[5px] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] drawer-close icon-button"
    aria-label="Tutup navigasi"
    onclick={closeDrawer}><Icon name="close" /></button
  >{@render navigation()}
</dialog>
<div
  class="[&&]:ml-[224px] min-h-[100vh] flex flex-col max-[1200.01px]:[&&]:ml-[224px] max-[900.01px]:[&&]:ml-[196px] max-[700.01px]:[&&]:ml-[0] app-main"
>
  <header
    class="h-[77px] sticky top-[0] [background-image:initial] [background-color:rgba(255,_255,_255,_0.92)] [backdrop-filter:blur(12px)] [border-bottom-width:1px] [border-bottom-style:solid] flex items-center justify-between gap-y-[15px] gap-x-[15px] z-[25] [box-shadow:0_5px_20px_#24549208] px-[36px] py-[0px] border-[color:rgb(220,_232,_247)] max-[1200.01px]:px-[24px] max-[900.01px]:[&_.demo-label]:hidden max-[700.01px]:h-[65px] max-[700.01px]:[box-shadow:0_5px_18px_#1646790d] max-[700.01px]:px-[16px] max-[700.01px]:py-[0px] topbar"
  >
    <div
      class="flex items-center gap-y-[13px] gap-x-[13px] max-[700.01px]:gap-y-[7px] max-[700.01px]:gap-x-[7px] topbar-left"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#53739c] hidden items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] max-[700.01px]:flex icon-button mobile-menu"
        aria-label="Buka navigasi"
        aria-expanded={mobile}
        onclick={openDrawer}><Icon name="menu" /></button
      ><span
        class="text-[11px] text-[#8090aa] [&_span]:text-[#b6c0ad] [&_span]:mx-[10px] [&_span]:my-[0px] [&_strong]:font-[550] [&_strong]:text-[#1e477f] max-[700.01px]:text-[10px] max-[700.01px]:[&_span]:mx-[5px] max-[700.01px]:[&_span]:my-[0px] breadcrumb"
        >Ruang kerja <span>/</span>
        <strong class="font-[650]">{labels[section] || 'Detail'}</strong></span
      >
    </div>
    <div
      class="flex items-center gap-y-[13px] gap-x-[13px] max-[700.01px]:gap-y-[8px] max-[700.01px]:gap-x-[8px] topbar-right"
    >
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[#53739c] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center w-[34px] h-[34px] [background-image:initial] [background-color:transparent] [&&&]:relative border-[0px] border-none border-[color:currentcolor] rounded-[7px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:text-[#075fc7] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(233,_243,_255)] icon-button"
        href={`${prefix}/notifications`}
        aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
        ><Icon name="notifications" />{#if unreadCount}<span
            class="[&&]:absolute [&&]:top-[5px] [&&]:right-[5px] [&&]:w-[8px] [&&]:h-[8px] [&&]:[background-image:initial] [&&]:[background-color:rgb(213,_72,_62)] [&&]:border-[2px] [&&]:border-solid [&&]:border-[color:white] [&&]:rounded-[50%] notification-dot"
            aria-hidden="true"
          ></span>{/if}</a
      ><span
        class="inline-flex items-center gap-y-[7px] gap-x-[7px] text-[9px] text-[#4274ad] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&>span]:w-[5px] [&>span]:h-[5px] [&>span]:[background-image:initial] [&>span]:[background-color:rgb(21,_130,_232)] [&>span]:rounded-[100%] demo-label"
        ><span></span>Demo mandiri · Data simulasi</span
      >
      <div
        class="w-[1px] h-[26px] [background-image:initial] [background-color:var(--line)] mx-[3px] my-[0px] max-[700.01px]:hidden header-divider"
      ></div>
      <details class="relative z-50" bind:open={accountMenu}>
        <summary
          class="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1 text-[#17365f] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-400 [&::-webkit-details-marker]:hidden"
          aria-label="Buka menu akun"
        >
          <span
            class="flex size-[34px] items-center justify-center rounded-full border-2 border-white bg-[#e6f1ff] text-[11px] font-bold text-[#075fc7] shadow-[0_0_0_1px_#c6ddf5]"
          >
            {app.session?.role === 'admin'
              ? 'PF'
              : app.session?.role === 'finance'
                ? 'KEU'
                : campusProfile?.initials}
          </span>
          <span class="max-[700px]:hidden">
            <strong class="block text-[10px] leading-4">{app.session?.name}</strong>
            <small class="block text-[9px] text-[#617a9a]"
              >{app.session?.role === 'admin'
                ? 'Administrator'
                : app.session?.role === 'finance'
                  ? 'Keuangan'
                  : app.session?.campusRole === 'mentor'
                    ? 'Mentor kampus'
                    : 'SoBI kampus'}</small
            >
          </span>
          <Icon name={accountMenu ? 'up' : 'down'} size={14} />
        </summary>
        <div
          class="absolute right-0 top-[calc(100%+12px)] w-[280px] overflow-hidden rounded-2xl border border-[#dce7f7] bg-white text-[#405575] shadow-[0_18px_45px_#17365f24] max-[390px]:w-[260px]"
          role="menu"
        >
          <div class="border-b border-[#edf2f8] px-5 py-4">
            <strong class="block text-sm text-[#17365f]">{app.session?.name}</strong>
            <span class="mt-1 block text-xs text-[#71829b]"
              >{app.session?.role === 'admin'
                ? 'Tim DEB Pertamina Foundation'
                : campusProfile?.name}</span
            >
          </div>
          {#if app.session?.role !== 'finance'}<nav class="p-2" aria-label="Menu akun">
              <a
                class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-blue-50"
                href={app.session?.role === 'admin'
                  ? '/admin/campuses?tab=accounts'
                  : '/campus/profile'}
                onclick={() => (accountMenu = false)}
                role="menuitem"
                ><span
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
                  ><Icon name="campus" size={18} /></span
                ><span>{app.session?.role === 'admin' ? 'Kelola akun kampus' : 'Lihat Profil'}</span
                ></a
              >
              <a
                class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-blue-50"
                href={`${prefix}/settings`}
                onclick={() => (accountMenu = false)}
                role="menuitem"
                ><span
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
                  ><Icon name="settings" size={18} /></span
                ><span>Pengaturan</span></a
              >
              <a
                class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-blue-50"
                href={app.session?.role === 'admin' ? '/admin/faq' : '/campus/guide'}
                onclick={() => (accountMenu = false)}
                role="menuitem"
                ><span
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
                  ><Icon name="faq" size={18} /></span
                ><span>Panduan Aplikasi</span></a
              >
            </nav>{/if}
          <div class="border-t border-[#edf2f8] p-2">
            <button
              class="flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
              type="button"
              onclick={logout}
              disabled={app.busy}
              role="menuitem"
              ><span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-50"
                ><Icon name="logout" size={18} /></span
              ><span>Keluar</span></button
            >
          </div>
        </div>
      </details>
    </div>
  </header>
  <main
    id="main-content"
    class="pt-[32px] pb-[36px] max-w-[1640px] w-[100%] grow shrink [flex-basis:0%] [background-image:initial] [background-color:transparent] px-[36px] mx-[auto] my-[0px] max-[1200.01px]:px-[24px] max-[1200.01px]:py-[27px] max-[900.01px]:px-[20px] max-[900.01px]:py-[24px] max-[700.01px]:px-[16px] max-[700.01px]:py-[25px] content"
  >
    {#if false}
      <div
        class="[&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:flex-wrap [&&]:mb-[20px] [&&]:text-[12px] period-switcher"
      >
        <label
          class="[&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:w-[300px] [&&]:max-w-[100%] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:[box-shadow:0_2px_6px_#16458205] [&&]:cursor-pointer [&&]:px-[14px] [&&]:py-[10px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(216,_230,_248)] [&&]:rounded-[14px] [&:focus-within]:[box-shadow:0_0_0_3px_#2563eb18] [&:focus-within]:border-[color:rgb(37,_99,_235)] period-control"
        >
          <span
            class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[36px] [&&]:h-[36px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:text-[#1460d9] [&&]:rounded-[10px] period-icon"
            ><Icon name="calendar" size={19} /></span
          >
          <span
            class="[&&]:flex [&&]:flex-col [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:min-w-[0] [&&]:gap-y-[3px] [&&]:gap-x-[3px] period-field"
          >
            <span class="[&&]:text-[#647a98] [&&]:text-[10px] [&&]:leading-[1.4] period-label"
              >Periode penilaian</span
            >
            <select
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[13px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [&&]:[background-position-x:right] [&&]:[background-position-y:center] [&&]:[background-color:transparent] [&&]:text-[#123466] [&&]:pr-[24px] [&&]:pl-[0px] max-w-[290px] [&&]:min-h-[24px] [&&]:w-[100%] [&&]:h-[auto] [&&]:[box-shadow:none] [&&]:cursor-pointer [&&]:py-[0px] [&&]:m-[0px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[0px] [&:focus]:[outline-color:initial] [&:focus]:[outline-style:none] [&:focus]:[outline-width:initial] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:currentcolor]"
              aria-label="Periode penilaian"
              value={app.data?.period?.id ?? ''}
              disabled={app.busy || app.loading}
            >
              {#each app.data?.periods ?? [] as period}<option value={period.id}
                  >{period.name} · {period.state === 'active' ? 'Aktif' : 'Arsip'}</option
                >{/each}
            </select>
          </span>
        </label>
        {#if app.data?.period?.state === 'archived'}<span
            class="[&&]:[background-image:initial] [&&]:[background-color:rgb(255,_246,_223)] [&&]:text-[#9a6700] [&&]:text-[11px] [&&]:px-[9px] [&&]:py-[5px] [&&]:rounded-[6px] period-archive"
            >Arsip · hanya baca</span
          >{/if}
      </div>
    {/if}
    {@render children()}
  </main>
  <footer
    class="[border-top-width:1px] [border-top-style:solid] flex justify-between gap-y-[15px] gap-x-[15px] text-[#7285a2] text-[9px] px-[36px] py-[18px] border-[color:rgb(220,_231,_247)] max-[700.01px]:text-[8px] max-[700.01px]:flex-wrap max-[700.01px]:p-[17px] max-[700.01px]:[&>span:last-child]:hidden app-footer"
  >
    <span
      >Digitalisasi DEB <span class="mx-[7px] my-[0px] footer-dot">•</span> Pertamina Foundation</span
    ><span>Bersama membangun dampak yang berarti.</span>
  </footer>
</div>
