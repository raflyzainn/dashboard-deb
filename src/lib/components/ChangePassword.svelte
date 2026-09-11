<script lang="ts">
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  let { onclose }: { onclose: () => void } = $props();
  let currentPassword = $state(''), password = $state(''), confirmation = $state('');
  let showCurrent = $state(false), showNew = $state(false), showConfirm = $state(false);
  let busy = $state(false), success = $state(false), error = $state('');
  const rules = $derived([
    { label: 'Minimal 8 karakter', met: password.length >= 8 },
    { label: 'Mengandung angka', met: /[0-9]/.test(password) },
    { label: 'Mengandung huruf kapital', met: /[A-Z]/.test(password) }
  ]);
  const matches = $derived(!!confirmation && password === confirmation);
  const valid = $derived(!!currentPassword && rules.every(r => r.met) && matches && password !== currentPassword);
  function close() { if (busy) return; if (success) window.location.assign('/login'); else onclose(); }
  async function submit() {
    if (busy || !valid) return;
    busy = true; error = '';
    try {
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, password, passwordConfirm: confirmation }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password belum dapat diubah.');
      currentPassword = ''; password = ''; confirmation = ''; success = true;
    } catch (e) { error = e instanceof Error ? e.message : 'Koneksi terputus. Jika password sudah tersimpan, masuk kembali menggunakan password baru.'; }
    finally { busy = false; }
  }
</script>

<Modal title={success ? 'Password berhasil diubah' : 'Ganti password'} onclose={close}>
  {#if success}
    <div class="password-success" role="status"><Icon name="check" size={30}/><p>Gunakan password baru untuk masuk kembali. Sesi login sebelumnya sudah diakhiri di semua perangkat.</p></div>
    <button class="button submit" onclick={close}>Masuk kembali<Icon name="arrow" size={17}/></button>
  {:else}
    <p class="intro">Masukkan password saat ini dan buat password baru. Setelah berhasil, Anda perlu masuk kembali di semua perangkat.</p>
    <form onsubmit={e => { e.preventDefault(); void submit(); }}>
      <label for="change-current">Password saat ini</label>
      <div class="password-input"><input id="change-current" type={showCurrent ? 'text' : 'password'} autocomplete="current-password" maxlength="128" required bind:value={currentPassword} disabled={busy}/><button type="button" aria-label={showCurrent ? 'Sembunyikan password saat ini' : 'Lihat password saat ini'} onclick={() => showCurrent = !showCurrent}><Icon name={showCurrent ? 'eye-off' : 'eye'} size={19}/></button></div>
      <label for="change-new">Password baru</label>
      <div class="password-input"><input id="change-new" type={showNew ? 'text' : 'password'} autocomplete="new-password" maxlength="128" required aria-describedby="change-rules" bind:value={password} disabled={busy}/><button type="button" aria-label={showNew ? 'Sembunyikan password baru' : 'Lihat password baru'} onclick={() => showNew = !showNew}><Icon name={showNew ? 'eye-off' : 'eye'} size={19}/></button></div>
      <ul id="change-rules">{#each rules as rule}<li class:met={rule.met}><Icon name={rule.met ? 'check' : 'clock'} size={15}/>{rule.label}<span class="sr-only">: {rule.met ? 'Terpenuhi' : 'Belum terpenuhi'}</span></li>{/each}</ul>
      {#if password && password === currentPassword}<p class="error">Password baru harus berbeda dari password saat ini.</p>{/if}
      <label for="change-confirm">Konfirmasi password baru</label>
      <div class="password-input"><input id="change-confirm" type={showConfirm ? 'text' : 'password'} autocomplete="new-password" maxlength="128" required bind:value={confirmation} disabled={busy} aria-describedby="change-match"/><button type="button" aria-label={showConfirm ? 'Sembunyikan konfirmasi password' : 'Lihat konfirmasi password'} onclick={() => showConfirm = !showConfirm}><Icon name={showConfirm ? 'eye-off' : 'eye'} size={19}/></button></div>
      <p id="change-match" class:met={matches} class="match" aria-live="polite">{confirmation ? matches ? 'Konfirmasi password sudah cocok.' : 'Konfirmasi password belum cocok.' : 'Ketik ulang password baru Anda.'}</p>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <div class="actions"><button class="button secondary" type="button" disabled={busy} onclick={close}>Batal</button><button class="button" type="submit" disabled={busy || !valid}>{busy ? 'Menyimpan…' : 'Simpan password baru'}</button></div>
    </form>
  {/if}
</Modal>

<style>
  .intro,.password-success p{font-size:13px;line-height:1.8;color:#627b99;margin:0 0 22px}form{display:grid;gap:10px}label{font-size:12px;color:#234d7e;margin:6px 0 0}.password-input{position:relative}.password-input input{width:100%;padding-right:48px;height:46px}.password-input button{position:absolute;right:4px;top:3px;width:40px;height:40px;display:grid;place-items:center;background:transparent;border:0;border-radius:6px;color:#527daa;cursor:pointer}.password-input button:focus-visible{outline:2px solid #1768d4}ul{list-style:none;display:grid;gap:7px;padding:0;margin:2px 0 5px}li{display:flex;align-items:center;gap:7px;font-size:11px;color:#71849b}.met{color:#197749}.match{font-size:11px;margin:0;color:#647b97}.match.met{color:#197749}.error{font-size:12px;line-height:1.7;color:#a52c27;background:#fff1ef;padding:11px;border-radius:7px;margin:0}.actions{display:flex;justify-content:flex-end;gap:12px;margin-top:14px}.password-success{text-align:center;color:#197749}.password-success p{margin-top:15px}.submit{width:100%;justify-content:center}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@media(max-width:500px){.actions{flex-wrap:wrap}.actions .button{flex:1;font-size:11px}}
</style>
