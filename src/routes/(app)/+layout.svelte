<script lang="ts">
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import { pollVisible } from '$lib/polling';
  import { pageRequest, pageKey } from '$lib/page-data';
  import { page } from '$app/state';
  import { app } from '$lib/state.svelte';
  import Shell from '$lib/components/Shell.svelte';
  import Empty from '$lib/components/Empty.svelte';
  let { children } = $props();
  const routeRole = $derived(page.url.pathname.split('/')[1]);
  const authorized = $derived(app.ready && app.session && routeRole === app.session.role);
  const request = $derived(pageRequest(page.url));
  const requestKey = $derived(pageKey(request));
  $effect(() => {
    if (!authorized) return;
    const stopNavigation = pollVisible(() => app.refreshNavigation(true), 15000);
    return stopNavigation;
  });
  $effect(() => {
    if (!authorized || !['questions', 'question-detail'].includes(request.view)) return;
    return pollVisible(() => app.refreshForum(), 5000);
  });
  $effect(() => {
    if (authorized) {
      const next = request;
      untrack(() => {
        void app.openPage(next);
      });
    }
  });
  $effect(() => {
    if (!app.ready) return;
    if (!app.session) goto('/login', { replaceState: true });
    else if (routeRole !== app.session.role)
      goto(`/${app.session.role}/dashboard`, { replaceState: true });
  });
</script>
{#if authorized}<Shell
    >{#if app.data && app.pageId === requestKey}{#key app.session?.id}{@render children()}{/key}{:else if app.loading || app.pageId !== requestKey}<div
        class="min-h-[70vh] flex items-center justify-center gap-y-[16px] gap-x-[16px] flex-col text-[#8a9a7e] text-[13px] text-center p-[25px] loading-screen"
      >
        <span
          class="w-[25px] h-[25px] [border-top-color:#69974d] [border-right-color:rgb(223,_233,_214)] [border-bottom-color:rgb(223,_233,_214)] [border-left-color:rgb(223,_233,_214)] [animation-duration:1s] [animation-timing-function:linear] [animation-delay:0s] [animation-iteration-count:infinite] [animation-direction:normal] [animation-fill-mode:none] [animation-play-state:running] [animation-name:spin] [animation-timeline:auto] [animation-range-start:normal] [animation-range-end:normal] border-[2px] border-solid rounded-[50%] spinner"
        ></span>Memuat data kampus…
      </div>{:else}<section
        class="[background-image:initial] [background-color:white] min-w-[0] overflow-x-hidden overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel"
      >
        <Empty
          title="Data belum dapat dimuat"
          description="Periksa koneksi PocketBase lalu coba kembali."
        />
        <div class="flex justify-center pt-[0px] pb-[30px] px-[20px] center-actions">
          <button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
            onclick={() => app.reload()}>Coba muat ulang</button
          >
        </div>
      </section>{/if}</Shell
  >{:else}<main
    id="main-content"
    class="min-h-[70vh] flex items-center justify-center gap-y-[16px] gap-x-[16px] flex-col text-[#8a9a7e] text-[13px] text-center p-[25px] loading-screen"
  >
    <span
      class="w-[25px] h-[25px] [border-top-color:#69974d] [border-right-color:rgb(223,_233,_214)] [border-bottom-color:rgb(223,_233,_214)] [border-left-color:rgb(223,_233,_214)] [animation-duration:1s] [animation-timing-function:linear] [animation-delay:0s] [animation-iteration-count:infinite] [animation-direction:normal] [animation-fill-mode:none] [animation-play-state:running] [animation-name:spin] [animation-timeline:auto] [animation-range-start:normal] [animation-range-end:normal] border-[2px] border-solid rounded-[50%] spinner"
    ></span>Menyiapkan ruang kerja…
  </main>{/if}
