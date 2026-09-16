<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { Notification } from '$lib/types';
  import { date } from '$lib/domain';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  let unreadOnly = $state(false);
  const notices = $derived(
    [...(app.data?.notifications || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
  const unread = $derived(notices.filter((n) => !n.readAt).length);
  const visible = $derived(notices.filter((n) => !unreadOnly || !n.readAt));
  async function open(notice: Notification) {
    if (
      notice.readAt ||
      (await app.mutate(
        () => dataService.readNotifications([notice.id]),
        'Notifikasi ditandai dibaca.'
      ))
    )
      goto(notice.href);
  }
</script>

<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >KABAR RUANG KERJA</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Notifikasi
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Ikuti feedback, pembaruan data, proposal, dan percakapan yang memerlukan perhatian Anda.
    </p>
  </div>
  <button
    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
    disabled={app.readOnly || !unread || app.busy}
    onclick={() =>
      app.mutate(() => dataService.readNotifications(), 'Semua notifikasi ditandai dibaca.')}
    ><Icon name="check" size={16} />Tandai semua dibaca</button
  >
</div>
<section
  class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel notification-panel"
>
  <div
    class="[&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:px-[24px] [&&]:py-[22px] max-[700.01px]:[&&]:items-start max-[700.01px]:[&&]:flex-wrap max-[700.01px]:[&&]:p-[18px] notification-top"
  >
    <div>
      <strong class="font-[650] [&&]:text-[15px]">{unread} belum dibaca</strong>
      <p class="[&&]:mt-[7px] mb-[0px] leading-[1.8] [&&]:text-[11px] [&&]:text-[#718176] mx-[0px]">
        Notifikasi simulasi tersimpan di browser ini. Membuka tautan detail menandai notifikasi
        sebagai dibaca.
      </p>
    </div>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] [&&]:min-h-[33px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&]:px-[12px] [&&]:py-[7px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:px-[12px] max-[700.01px]:[&&]:py-[7px] button secondary small"
      disabled={app.loading || app.busy}
      onclick={() => app.reload()}><Icon name="reset" size={15} />Muat ulang</button
    >
  </div>
  <div
    class="flex gap-y-[22px] gap-x-[22px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:var(--line)] overflow-x-auto px-[23px] py-[0px] [&_button]:[background-image:none] [&_button]:[background-color:initial] [&_button]:[border-top-width:0px] [&_button]:[border-right-width:0px] [&_button]:[border-bottom-width:2px] [&_button]:[border-left-width:0px] [&_button]:[border-top-style:none] [&_button]:[border-right-style:none] [&_button]:[border-bottom-style:solid] [&_button]:[border-left-style:none] [&_button]:[border-top-color:currentcolor] [&_button]:[border-right-color:currentcolor] [&_button]:[border-bottom-color:transparent] [&_button]:[border-left-color:currentcolor] [&_button]:pt-[16px] [&_button]:pb-[13px] [&_button]:[white-space-collapse:collapse] [&_button]:[text-wrap-mode:nowrap] [&_button]:text-[11px] [&_button]:text-[#96a087] [&_button]:flex [&_button]:gap-y-[8px] [&_button]:gap-x-[8px] [&_button]:items-center [&_button]:px-[0px] [&_button.active]:text-[#075fc7] [&_button.active]:[border-bottom-color:#1681df] [&_button.active]:font-[700] max-[700.01px]:gap-y-[19px] max-[700.01px]:gap-x-[19px] max-[700.01px]:px-[16px] max-[700.01px]:[&_button]:text-[10px] tabs"
  >
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
      class:active={!unreadOnly}
      onclick={() => (unreadOnly = false)}
      >Semua <span
        class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
        >{notices.length}</span
      ></button
    ><button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[inherit] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
      class:active={unreadOnly}
      onclick={() => (unreadOnly = true)}
      >Belum dibaca <span
        class="text-[11px] font-[600] [background-image:initial] [background-color:rgb(232,_242,_255)] text-[#346baf] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[3px] rounded-[5px] count"
        >{unread}</span
      ></button
    >
  </div>
  {#if visible.length}<div class="notification-list">
      {#each visible as notice}<article
          class="[&&]:flex [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(228,_235,_229)] [&&]:p-[24px] [&:last-child]:[border-bottom-width:0px] [&:last-child]:[border-bottom-style:none] [&:last-child]:[border-bottom-color:currentcolor] [&.unread]:pl-[21px] [&.unread]:[background-image:initial] [&.unread]:[background-color:rgb(243,_249,_242)] [&.unread]:[border-left-width:3px] [&.unread]:[border-left-style:solid] [&.unread]:[border-left-color:rgb(41,_130,_71)] max-[700.01px]:[&&]:gap-y-[12px] max-[700.01px]:[&&]:gap-x-[12px] max-[700.01px]:[&&]:p-[18px] max-[700.01px]:[&.unread]:pl-[15px]"
          class:unread={!notice.readAt}
        >
          <span
            class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[42px] [&&]:h-[42px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(232,_240,_231)] [&&]:text-[#39704a] [&&]:rounded-[12px] max-[700.01px]:[&&]:w-[33px] max-[700.01px]:[&&]:h-[33px] notification-icon"
            ><Icon name="notifications" size={21} /></span
          >
          <div class="[&&]:min-w-[0] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] notification-copy">
            <div
              class="[&&]:flex [&&]:items-center [&&]:flex-wrap [&&]:gap-y-[10px] [&&]:gap-x-[10px] notification-heading"
            >
              <h2
                class="font-[650] text-[color:var(--navy)] [&&]:text-[14px] tracking-[-0.45px] m-[0px] max-[700.01px]:[&&]:text-[13px]"
              >
                {notice.title}
              </h2>
              {#if notice.simulated}<span
                  class="[&&]:text-[10px] [&&]:text-[#736748] [&&]:[background-image:initial] [&&]:[background-color:rgb(244,_238,_223)] [&&]:px-[7px] [&&]:py-[3px] [&&]:rounded-[5px] simulation-label"
                  >Simulasi</span
                >{/if}{#if !notice.readAt}<span
                  class="[&&]:text-[10px] [&&]:font-[600] [&&]:[background-image:initial] [&&]:[background-color:rgb(217,_239,_218)] [&&]:text-[#245f32] [&&]:px-[7px] [&&]:py-[3px] [&&]:rounded-[5px] unread-label"
                  >Belum dibaca</span
                >{/if}
            </div>
            <p
              class="leading-[1.8] [&&]:text-[12px] [&&]:text-[#586c5e] [&&]:[white-space-collapse:preserve] [&&]:[text-wrap-mode:wrap] [&&]:wrap-anywhere [&&]:mx-[0px] [&&]:my-[9px] max-[700.01px]:[&&]:text-[11px]"
            >
              {notice.body}
            </p>
            <small class="[&&]:text-[10px] [&&]:text-[#77847b] leading-[1.7]"
              >{app.session?.role === 'admin'
                ? `${app.data?.campuses.find((c) => c.id === notice.campusId)?.name || 'Kampus'} · `
                : ''}{date(notice.createdAt)}</small
            >
            <div
              class="[&&]:flex [&&]:gap-y-[20px] [&&]:gap-x-[20px] [&&]:mt-[14px] [&&]:flex-wrap notification-actions"
            >
              <a
                href={notice.href}
                class="[-webkit-tap-highlight-color:transparent] text-[#0668ce] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center gap-y-[7px] gap-x-[7px] [&&&]:text-[11px] font-[650] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                aria-disabled={app.busy}
                onclick={(event) => {
                  event.preventDefault();
                  if (!app.busy) open(notice);
                }}>Lihat detail<Icon name="arrow" size={14} /></a
              >{#if !notice.readAt}<button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
                  disabled={app.readOnly || app.loading || app.busy}
                  onclick={() =>
                    app.mutate(
                      () => dataService.readNotifications([notice.id]),
                      'Notifikasi ditandai dibaca.'
                    )}>Tandai dibaca</button
                >{/if}
            </div>
          </div>
        </article>{/each}
    </div>{:else}<Empty
      title={unreadOnly ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
      description={unreadOnly
        ? 'Anda sudah mengikuti seluruh pembaruan.'
        : 'Pemberitahuan akan muncul saat ada aktivitas yang terkait dengan Anda.'}
      icon="notifications"
    />{/if}
</section>
