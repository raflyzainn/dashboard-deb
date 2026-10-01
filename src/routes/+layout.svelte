<script lang="ts">
  import '../app.css';
  import { onMount, untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import ErrorSnackbar from '$lib/components/ui/ErrorSnackbar.svelte';
  import { reportError } from '$lib/feedback';
  let { children } = $props();
  onMount(() => {
    const showError = (event: Event) => { app.toast = ''; app.error = (event as CustomEvent<string>).detail; };
    let invalidThisTurn = false;
    const invalid = (event: Event) => {
      if (invalidThisTurn) return;
      invalidThisTurn = true;
      setTimeout(() => { invalidThisTurn = false; }, 0);
      const field = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const label = field.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
      label?.querySelectorAll('input, select, textarea, button, [aria-hidden="true"]').forEach(node => node.remove());
      const name = field.getAttribute('aria-label') || label?.textContent?.replace(/\s+/g, ' ').trim() || 'Isian ini';
      app.toast = '';
      app.error = field.validity.valueMissing ? `${name} wajib diisi.`
        : field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email' ? `${name}: masukkan alamat email yang valid, misalnya nama@kampus.ac.id.`
        : field.validity.rangeUnderflow ? `${name}: nilai belum mencapai batas minimum yang ditentukan.`
        : field.validity.rangeOverflow ? `${name}: nilai melebihi batas maksimum yang ditentukan.`
        : `${name}: ${field.validationMessage}`;
    };
    window.addEventListener('deb:error', showError);
    document.addEventListener('invalid', invalid, true);
    const unexpected = () => reportError('Aplikasi mengalami kendala. Coba ulangi tindakan Anda. Jika tetap gagal, muat ulang halaman setelah memastikan draf tersimpan.');
    const rejected = (event: PromiseRejectionEvent) => { if (event.reason?.name !== 'AbortError') unexpected(); };
    // Keep the original console error for diagnosis; do not expose internal details to users.
    window.addEventListener('error', unexpected);
    window.addEventListener('unhandledrejection', rejected);
    return () => {
      window.removeEventListener('deb:error', showError);
      document.removeEventListener('invalid', invalid, true);
      window.removeEventListener('error', unexpected);
      window.removeEventListener('unhandledrejection', rejected);
    };
  });
  $effect(() => {
    if (!app.toast) return;
    const timer = setTimeout(() => (app.toast = ''), 4000);
    return () => clearTimeout(timer);
  });
  $effect(() => {
    untrack(() => {
      // The public verification page has no session to probe.
      if (!location.pathname.startsWith('/verifikasi/')) void app.init();
    });
  });
</script>
<svelte:head><title>Desa Energi Berdikari · Pertamina Foundation</title></svelte:head>
<a
  href="#main-content"
  class="[-webkit-tap-highlight-color:transparent] text-[white] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] fixed top-[-80px] left-[16px] z-[200] [background-image:initial] [background-color:var(--dark)] px-[20px] py-[12px] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:focus]:top-[12px] skip-link"
  >Langsung ke konten</a
>
{@render children()}
<ErrorSnackbar />
{#if app.toast && !app.dialogs}<div
    class="fixed bottom-[24px] left-[50%] [transform:translateX(-50%)] z-[150] [background-image:initial] [background-color:rgb(25,_63,_40)] text-[#e7f5d9] flex items-center gap-y-[12px] gap-x-[12px] [box-shadow:0_7px_30px_#16352325] text-[14px] max-w-[calc(100%_-_32px)] w-[max-content] px-[22px] py-[15px] rounded-[10px] max-[700.01px]:bottom-[14px] max-[700.01px]:text-[13px] max-[700.01px]:px-[17px] max-[700.01px]:py-[14px] toast"
    role="status"
  >
    <Icon name="check" />{app.toast}
  </div>{/if}
