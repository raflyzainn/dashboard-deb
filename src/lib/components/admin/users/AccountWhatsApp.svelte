<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import NewTabLink from '$lib/components/shared/profile/NewTabLink.svelte';
  import { parseContacts, cleanPhone, whatsappLink } from '$lib/contacts';

  let { email, campusName, contacts, temporaryPassword = '', onclose }: {
    email: string; campusName: string;
    contacts?: { mentor: string; coordinator: string; localHero: string };
    temporaryPassword?: string; onclose: () => void;
  } = $props();

  let selected = $state<string[]>([]);
  let manual = $state('');
  let message = $state(untrack(() => `Halo Bapak/Ibu, berikut akses Dashboard DEB untuk ${campusName}.\n\nLink masuk: ${window.location.origin}/login\nEmail: ${email}${temporaryPassword ? `\nKata sandi sementara: ${temporaryPassword}` : ''}\n\nWajib mengganti kata sandi setelah masuk. Jangan teruskan pesan ini kepada orang lain.`));
  const groups = [['mentor', 'Mentor'], ['coordinator', 'Koordinator PFS 12'], ['localHero', 'Local hero']] as const;
  const validLink = (phone: string) => /^\+?[\d\s().-]+$/.test(phone.trim()) && /^\+?\d{9,15}$/.test(cleanPhone(phone)) ? whatsappLink(phone) : '';
  const choices = $derived(groups.flatMap(([key, group]) => parseContacts(contacts?.[key]).map(c => ({ ...c, group, link: validLink(c.phone) }))));
  const recipients = $derived([...new Set([...selected, ...(manual.trim() && validLink(manual) ? [validLink(manual)] : [])])]);
</script>

<Modal title="Kirim akses akun melalui WhatsApp" {onclose}>
  <div class="grid gap-4">
    <p class="m-0 break-words text-sm text-slate-600">{campusName} · {email}</p>
    <fieldset class="m-0 grid gap-2 rounded-xl border border-slate-200 p-3">
      <legend class="px-1 text-sm font-semibold">Pilih penerima</legend>
      {#each choices as c}
        <label class="flex items-start gap-2 text-sm">
          <input type="checkbox" class="mt-1" value={c.link} bind:group={selected} disabled={!c.link} />
          <span class="min-w-0 break-words">{c.group}: {c.name || 'Tanpa nama'}<span class="block text-xs text-slate-500">{c.link ? c.phone : 'Nomor belum tersedia atau tidak valid'}</span></span>
        </label>
      {:else}<p class="m-0 text-sm text-slate-500">Belum ada kontak kampus. Isi nomor penerima di bawah.</p>{/each}
    </fieldset>
    <label class="grid gap-1 text-sm font-medium">Nomor lain (opsional)
      <input type="tel" class="min-h-[42px] rounded-lg border border-slate-300 px-3" placeholder="0812 3456 7890" maxlength="30" bind:value={manual} aria-invalid={!!manual.trim() && !validLink(manual)} />
    </label>
    {#if manual.trim() && !validLink(manual)}<p class="m-0 text-sm text-red-700" role="alert">Isi nomor telepon yang valid, 9–15 angka, dengan awalan 0 atau kode negara.</p>{/if}
    <label class="grid gap-1 text-sm font-medium">Template pesan
      <textarea class="min-h-52 w-full rounded-lg border border-slate-300 p-3 text-sm leading-6" rows="8" maxlength="4000" bind:value={message}></textarea>
    </label>
    {#if /https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(message)}
      <p class="m-0 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Pesan masih memakai alamat lokal. Ganti link masuk dengan alamat aplikasi yang bisa dibuka penerima sebelum mengirim sungguhan.</p>
    {/if}
    {#if temporaryPassword}
      <p class="m-0 text-xs text-slate-600">Kata sandi sementara tercantum langsung di template. Pesan WhatsApp mengikuti isi template di atas. Kata sandi hanya tersedia selama dialog ini terbuka dan masuk ke URL WhatsApp; pastikan penerima benar.</p>
    {:else}<p class="m-0 text-xs text-slate-600">Kata sandi lama tidak dapat dibaca. Kirim informasi login saja, atau reset kata sandi jika diperlukan.</p>{/if}
    <p class="m-0 text-xs text-slate-600">Buka penerima satu per satu. Periksa pesan dan tekan Kirim di WhatsApp; aplikasi ini tidak mengirim otomatis.</p>
    <div class="flex flex-wrap gap-2">
      {#if message.trim() && (!manual.trim() || validLink(manual))}
        {#each recipients as link}
          <NewTabLink href={`${link}?text=${encodeURIComponent(message.trim())}`} icon="phone">Buka WhatsApp +{link.split('/').pop()}</NewTabLink>
        {/each}
      {/if}
    </div>
    {#if !recipients.length}<p class="m-0 text-sm text-slate-500" role="status">Pilih kontak atau isi nomor untuk membuka WhatsApp.</p>{/if}
  </div>
</Modal>
