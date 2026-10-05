<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  let { onclose }: { onclose: () => void } = $props();
  let currentPassword = $state(''),
    password = $state(''),
    confirmation = $state('');
  let showCurrent = $state(false),
    showNew = $state(false),
    showConfirm = $state(false);
  let busy = $state(false),
    success = $state(false),
    error = $state('');
  const rules = $derived([
    { label: 'Minimal 8 karakter', met: password.length >= 8 },
    { label: 'Mengandung angka', met: /[0-9]/.test(password) },
    { label: 'Mengandung huruf kapital', met: /[A-Z]/.test(password) }
  ]);
  const matches = $derived(!!confirmation && password === confirmation);
  const valid = $derived(
    !!currentPassword && rules.every((r) => r.met) && matches && password !== currentPassword
  );
  function close() {
    if (busy) return;
    if (success) window.location.assign('/login');
    else onclose();
  }
  async function submit() {
    if (busy || !valid) return;
    busy = true;
    error = '';
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password, passwordConfirm: confirmation })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password belum dapat diubah.');
      currentPassword = '';
      password = '';
      confirmation = '';
      success = true;
    } catch (e) {
      error =
        e instanceof Error
          ? e.message
          : 'Koneksi terputus. Jika password sudah tersimpan, masuk kembali menggunakan password baru.';
    } finally {
      busy = false;
    }
  }
</script>

<Modal title={success ? 'Password berhasil diubah' : 'Ganti password'} onclose={close}>
  {#if success}
    <div class="[&&]:text-center [&&]:text-[#197749] password-success" role="status">
      <Icon name="check" size={30} />
      <p
        class="[&&]:mt-[15px] [&&]:mb-[22px] [&&]:leading-[1.8] [&&]:text-[13px] [&&]:text-[#627b99] [&&]:mx-[0px]"
      >
        Gunakan password baru untuk masuk kembali. Sesi login sebelumnya sudah diakhiri di semua
        perangkat.
      </p>
    </div>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center [&&]:justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] [&&]:w-[100%] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button submit"
      onclick={close}>Masuk kembali<Icon name="arrow" size={17} /></button
    >
  {:else}
    <p
      class="[&&]:mt-[0px] [&&]:mb-[22px] [&&]:leading-[1.8] [&&]:text-[13px] [&&]:text-[#627b99] [&&]:mx-[0px] intro"
    >
      Masukkan password saat ini dan buat password baru. Setelah berhasil, Anda perlu masuk kembali
      di semua perangkat.
    </p>
    <form
      class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] [&&]:grid [&&]:gap-y-[10px] [&&]:gap-x-[10px]"
      onsubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label
        class="[&&]:text-[12px] [&&]:text-[#234d7e] [&&]:mt-[6px] [&&]:mb-[0px] [&&]:mx-[0px]"
        for="change-current">Password saat ini</label
      >
      <div class="[&&]:relative password-input">
        <input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:pr-[48px] pl-[12px] max-w-[100%] [&&]:w-[100%] [&&]:h-[46px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          id="change-current"
          type={showCurrent ? 'text' : 'password'}
          autocomplete="current-password"
          maxlength="128"
          required
          bind:value={currentPassword}
          disabled={busy}
        /><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#527daa] [&&]:absolute [&&]:right-[4px] [&&]:top-[3px] [&&]:w-[40px] [&&]:h-[40px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[6px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(23,_104,_212)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[4px]"
          type="button"
          aria-label={showCurrent ? 'Sembunyikan password saat ini' : 'Lihat password saat ini'}
          onclick={() => (showCurrent = !showCurrent)}
          ><Icon name={showCurrent ? 'eye-off' : 'eye'} size={19} /></button
        >
      </div>
      <label
        class="[&&]:text-[12px] [&&]:text-[#234d7e] [&&]:mt-[6px] [&&]:mb-[0px] [&&]:mx-[0px]"
        for="change-new">Password baru</label
      >
      <div class="[&&]:relative password-input">
        <input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:pr-[48px] pl-[12px] max-w-[100%] [&&]:w-[100%] [&&]:h-[46px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          id="change-new"
          type={showNew ? 'text' : 'password'}
          autocomplete="new-password"
          maxlength="128"
          required
          aria-describedby="change-rules"
          bind:value={password}
          disabled={busy}
        /><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#527daa] [&&]:absolute [&&]:right-[4px] [&&]:top-[3px] [&&]:w-[40px] [&&]:h-[40px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[6px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(23,_104,_212)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[4px]"
          type="button"
          aria-label={showNew ? 'Sembunyikan password baru' : 'Lihat password baru'}
          onclick={() => (showNew = !showNew)}
          ><Icon name={showNew ? 'eye-off' : 'eye'} size={19} /></button
        >
      </div>
      <ul
        class="[&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:grid [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:mt-[2px] [&&]:mb-[5px] [&&]:p-[0px] [&&]:mx-[0px]"
        id="change-rules"
      >
        {#each rules as rule}<li
            class="[&&]:flex [&&]:items-center [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[11px] [&&]:text-[#71849b] [&.met]:text-[#197749]"
            class:met={rule.met}
          >
            <Icon name={rule.met ? 'check' : 'clock'} size={15} />{rule.label}<span
              class="[&&]:absolute [&&]:w-[1px] [&&]:h-[1px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[clip:rect(0,_0,_0,_0)] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] m-[-1px] border-[0px] border-none border-[color:currentcolor] sr-only"
              >: {rule.met ? 'Terpenuhi' : 'Belum terpenuhi'}</span
            >
          </li>{/each}
      </ul>
      {#if password && password === currentPassword}<p
          class="[&&]:leading-[1.7] [&&]:text-[12px] [&&]:text-[#a52c27] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_241,_239)] [&&]:p-[11px] [&&]:m-[0px] [&&]:rounded-[7px] error"
        >
          Password baru harus berbeda dari password saat ini.
        </p>{/if}
      <label
        class="[&&]:text-[12px] [&&]:text-[#234d7e] [&&]:mt-[6px] [&&]:mb-[0px] [&&]:mx-[0px]"
        for="change-confirm">Konfirmasi password baru</label
      >
      <div class="[&&]:relative password-input">
        <input
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] [&&]:pr-[48px] pl-[12px] max-w-[100%] [&&]:w-[100%] [&&]:h-[46px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
          id="change-confirm"
          type={showConfirm ? 'text' : 'password'}
          autocomplete="new-password"
          maxlength="128"
          required
          bind:value={confirmation}
          disabled={busy}
          aria-describedby="change-match"
        /><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#527daa] [&&]:absolute [&&]:right-[4px] [&&]:top-[3px] [&&]:w-[40px] [&&]:h-[40px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[6px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(23,_104,_212)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:2px] [&:focus-visible]:outline-offset-[4px]"
          type="button"
          aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Lihat konfirmasi password'}
          onclick={() => (showConfirm = !showConfirm)}
          ><Icon name={showConfirm ? 'eye-off' : 'eye'} size={19} /></button
        >
      </div>
      <p
        id="change-match"
        class:met={matches}
        class="leading-[1.8] [&&]:text-[11px] [&&]:text-[#647b97] [&&]:m-[0px] [&.met]:text-[#197749] match"
        aria-live="polite"
      >
        {confirmation
          ? matches
            ? 'Konfirmasi password sudah cocok.'
            : 'Konfirmasi password belum cocok.'
          : 'Ketik ulang password baru Anda.'}
      </p>
      {#if error}<p
          class="[&&]:leading-[1.7] [&&]:text-[12px] [&&]:text-[#a52c27] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_241,_239)] [&&]:p-[11px] [&&]:m-[0px] [&&]:rounded-[7px] error"
          role="alert"
        >
          {error}
        </p>{/if}
      <div
        class="[&&]:flex [&&]:justify-end [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:mt-[14px] max-[500.01px]:[&&]:flex-wrap actions"
      >
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] max-[500.01px]:[&&&]:text-[11px] max-[500.01px]:[&&&]:grow max-[500.01px]:[&&&]:shrink max-[500.01px]:[&&&]:[flex-basis:0%] button secondary"
          type="button"
          disabled={busy}
          onclick={close}>Batal</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] max-[500.01px]:[&&&]:text-[11px] max-[500.01px]:[&&&]:grow max-[500.01px]:[&&&]:shrink max-[500.01px]:[&&&]:[flex-basis:0%] button"
          type="submit"
          disabled={busy || !valid}>{busy ? 'Menyimpan…' : 'Simpan password baru'}</button
        >
      </div>
    </form>
  {/if}
</Modal>
