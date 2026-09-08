<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { Notification } from '$lib/types';
  import { date } from '$lib/domain';
  import Icon from '$lib/components/Icon.svelte';
  import Empty from '$lib/components/Empty.svelte';
  let unreadOnly = $state(false);
  const notices = $derived([...(app.data?.notifications || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const unread = $derived(notices.filter(n => !n.readAt).length);
  const visible = $derived(notices.filter(n => !unreadOnly || !n.readAt));
  async function open(notice: Notification) {
    if (notice.readAt || await app.mutate(() => dataService.readNotifications(app.session!, [notice.id]), 'Notifikasi ditandai dibaca.')) goto(notice.href);
  }
</script>

<div class="page-heading"><div><span class="eyebrow">KABAR RUANG KERJA</span><h1>Notifikasi</h1><p>Ikuti feedback, pembaruan data, proposal, dan percakapan yang memerlukan perhatian Anda.</p></div><button class="button secondary" disabled={!unread || app.busy} onclick={() => app.mutate(() => dataService.readNotifications(app.session!), 'Semua notifikasi ditandai dibaca.')}><Icon name="check" size={16}/>Tandai semua dibaca</button></div>
<section class="panel notification-panel"><div class="notification-top"><div><strong>{unread} belum dibaca</strong><p>Notifikasi tersimpan di browser ini. Muat ulang untuk mengambil pembaruan lokal.</p></div><button class="button secondary small" disabled={app.loading || app.busy} onclick={() => app.reload()}><Icon name="reset" size={15}/>Muat ulang</button></div><div class="tabs"><button class:active={!unreadOnly} onclick={() => unreadOnly = false}>Semua <span class="count">{notices.length}</span></button><button class:active={unreadOnly} onclick={() => unreadOnly = true}>Belum dibaca <span class="count">{unread}</span></button></div>
  {#if visible.length}<div class="notification-list">{#each visible as notice}<article class:unread={!notice.readAt}><span class="notification-icon"><Icon name="notifications" size={21}/></span><div class="notification-copy"><div class="notification-heading"><h2>{notice.title}</h2>{#if notice.simulated}<span class="simulation-label">Simulasi</span>{/if}{#if !notice.readAt}<span class="unread-label">Belum dibaca</span>{/if}</div><p>{notice.body}</p><small>{app.session?.role === 'admin' ? `${app.data?.campuses.find(c => c.id === notice.campusId)?.name || 'Kampus'} · ` : ''}{date(notice.createdAt)}</small><div class="notification-actions"><a href={notice.href} class="text-link" aria-disabled={app.busy} onclick={(event) => { event.preventDefault(); if (!app.busy) open(notice); }}>Lihat detail<Icon name="arrow" size={14}/></a>{#if !notice.readAt}<button class="text-link" disabled={app.busy} onclick={() => app.mutate(() => dataService.readNotifications(app.session!, [notice.id]), 'Notifikasi ditandai dibaca.')}>Tandai dibaca</button>{/if}</div></div></article>{/each}</div>{:else}<Empty title={unreadOnly ? 'Semua sudah dibaca' : 'Belum ada notifikasi'} description={unreadOnly ? 'Anda sudah mengikuti seluruh pembaruan.' : 'Pemberitahuan akan muncul saat ada aktivitas yang terkait dengan Anda.'} icon="notifications"/>{/if}
</section>

<style>
  .notification-top{padding:22px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}.notification-top strong{font-size:15px}.notification-top p{font-size:11px;color:#718176;margin-top:7px}.notification-list article{display:flex;gap:16px;padding:24px;border-bottom:1px solid #e4ebe5}.notification-list article:last-child{border-bottom:0}.notification-list article.unread{background:#f3f9f2;border-left:3px solid #298247;padding-left:21px}.notification-icon{display:grid;place-items:center;width:42px;height:42px;flex-shrink:0;background:#e8f0e7;color:#39704a;border-radius:12px}.notification-copy{min-width:0;flex:1}.notification-heading{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.notification-heading h2{font-size:14px}.simulation-label{font-size:10px;color:#736748;background:#f4eedf;padding:3px 7px;border-radius:5px}.unread-label{font-size:10px;font-weight:600;background:#d9efda;color:#245f32;border-radius:5px;padding:3px 7px}.notification-copy p{font-size:12px;margin:9px 0;color:#586c5e;white-space:pre-wrap;overflow-wrap:anywhere}.notification-copy small{font-size:10px;color:#77847b}.notification-actions{display:flex;gap:20px;margin-top:14px;flex-wrap:wrap}.notification-actions .text-link{font-size:11px}@media(max-width:700px){.notification-top{padding:18px;align-items:flex-start;flex-wrap:wrap}.notification-list article{padding:18px;gap:12px}.notification-list article.unread{padding-left:15px}.notification-heading h2{font-size:13px}.notification-icon{width:33px;height:33px}.notification-copy p{font-size:11px}}
</style>
