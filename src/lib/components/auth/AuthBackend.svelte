<script lang="ts">
  import { page } from '$app/state';
  import { goto, replaceState } from '$app/navigation';
  import { dev } from '$app/environment';
  import { onDestroy, untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import WelcomeGuide from './WelcomeGuide.svelte';
  let screen = $state<
    'login' | 'employee' | 'activate' | 'forgot' | 'password' | 'sent' | 'success' | 'invalid'
  >('login');
  let email = $state(''),
    password = $state(''),
    confirmation = $state(''),
    error = $state(''),
    busy = $state(false);
  let showPassword = $state(false),
    showConfirmation = $state(false),
    token = $state('');
  let flow = $state<'activate' | 'forgot'>('activate');
  let resendSeconds = $state(0),
    resent = $state(false);
  let resendTimer: ReturnType<typeof setInterval> | undefined;
  function startResendCooldown() {
    if (resendTimer) clearInterval(resendTimer);
    const until = Date.now() + 60000;
    resendSeconds = 60;
    resendTimer = setInterval(() => {
      resendSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (!resendSeconds) clearInterval(resendTimer);
    }, 1000);
  }
  onDestroy(() => {
    if (resendTimer) clearInterval(resendTimer);
  });
  // TODO(MICROSOFT-SSO): Implement server-side Microsoft OAuth/OIDC (state, nonce,
  // PKCE and tenant validation), map authorized employees to server-managed roles,
  // and establish a verified DEB session. The button currently only shows a notice.
  let microsoftNotice = $state(false);
  const activationSteps = ['Email PIC', 'Periksa email', 'Buat password', 'Selesai'];
  const step = $derived(
    flow === 'activate'
      ? (
          { activate: 1, sent: 2, password: 3, success: 4 } as Partial<
            Record<typeof screen, number>
          >
        )[screen] || 0
      : 0
  );
  let target = $state({ campus: '', name: '', email: '', purpose: 'activate' });
  const longEnough = $derived(password.length >= 8),
    hasNumber = $derived(/[0-9]/.test(password)),
    hasCapital = $derived(/[A-Z]/.test(password));
  const passwordsMatch = $derived(confirmation.length > 0 && password === confirmation);
  const passwordRules = $derived([
    { label: 'Minimal 8 karakter', met: longEnough },
    { label: 'Mengandung angka', met: hasNumber },
    { label: 'Mengandung huruf kapital', met: hasCapital }
  ]);
  const title = $derived(
    {
      login: 'Selamat datang kembali.',
      employee: 'Masuk sebagai Karyawan',
      activate: 'Aktivasi akun kampus.',
      forgot: 'Lupa password?',
      password: target.purpose === 'forgot' ? 'Buat password baru.' : 'Buat password Anda',
      sent: 'Periksa email Anda.',
      success: 'Password berhasil disimpan.',
      invalid: 'Tautan tidak dapat digunakan.'
    }[screen]
  );
  $effect(() => {
    const value = page.url.searchParams.get('token');
    if (value)
      untrack(() => {
        token = value;
        void inspect();
      });
  });
  async function api(operation: string, body: object) {
    const r = await fetch('/api/auth/' + operation, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || 'Permintaan belum dapat diproses.');
    return data;
  }
  function go(next: typeof screen) {
    if (next === 'activate' || next === 'forgot') flow = next;
    screen = next;
    error = '';
    microsoftNotice = false;
    password = '';
    confirmation = '';
    showPassword = false;
    showConfirmation = false;
  }
  async function inspect() {
    busy = true;
    try {
      const result = await api('inspect', { token });
      target = result;
      token = result.token || token;
      flow = target.purpose === 'forgot' ? 'forgot' : 'activate';
      email = target.email;
      go('password');
    } catch {
      go('invalid');
    } finally {
      busy = false;
    }
  }
  async function submit() {
    if (busy || (screen === 'sent' && resendSeconds > 0)) return;
    busy = true;
    error = '';
    try {
      if (screen === 'login') {
        await api('login', { email, password });
        await app.login('');
        if (app.session) await goto('/' + app.session.role + '/dashboard');
        else throw new Error('Sesi belum dapat dimuat.');
      } else if (screen === 'password') {
        if (!longEnough || !hasNumber || !hasCapital)
          throw new Error('Password minimal 8 karakter, mengandung angka dan huruf kapital.');
        if (password !== confirmation) throw new Error('Konfirmasi password belum sama.');
        await api('confirm', { token, password, passwordConfirm: confirmation });
        go('success');
        replaceState('/login', {});
      } else {
        const again = screen === 'sent';
        await api('request', { email, purpose: flow });
        startResendCooldown();
        resent = again;
        go('sent');
      }
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>
<svelte:head
  ><title>Login - Digitalisasi DEB</title><meta
    name="robots"
    content="noindex,nofollow"
  /></svelte:head
>
<main
  id="main-content"
  class="grid grid-cols-[1.05fr_1fr] [&&]:min-h-[100dvh] max-[900.01px]:grid-cols-[0.9fr_1fr] max-[700.01px]:[&&]:flex max-[700.01px]:[&&]:flex-col login-page auth-page"
  class:flow-page={step > 0 || screen === 'success'}
  class:success-page={screen === 'success'}
  class:password-page={screen === 'password'}
>
  <section
    class="relative overflow-x-hidden overflow-y-hidden [background-image:linear-gradient(145deg,_rgb(23,_104,_239)_0%,_rgb(25,_68,_208)_58%,_rgb(37,_44,_159)_100%)] [background-color:initial] flex flex-col [&&]:min-h-[0] [&&]:h-[100dvh] px-[55px] [&&]:py-[clamp(20px,_4vh,_36px)] [&_.brand]:text-[#fff] [&_.brand]:m-[0px] [&_.brand-mark]:[background-image:initial] [&_.brand-mark]:[background-color:rgba(255,_255,_255,_0.094)] [&_.brand-mark]:text-[#fff] [&_.brand-mark]:border-[1px] [&_.brand-mark]:border-solid [&_.brand-mark]:border-[color:rgba(255,_255,_255,_0.17)] [&_.brand-sub]:text-[#bcd9ff] max-[1200.01px]:px-[40px] max-[1200.01px]:[&&]:py-[clamp(20px,_4vh,_36px)] max-[900.01px]:[&&]:min-h-[0] max-[900.01px]:px-[30px] max-[900.01px]:[&&]:py-[clamp(20px,_4vh,_36px)] max-[700.01px]:[&&]:min-h-[0] max-[700.01px]:[&&]:h-[clamp(145px,_24dvh,_200px)] max-[700.01px]:[&&]:shrink-0 max-[700.01px]:[&&]:px-[24px] max-[700.01px]:[&&]:py-[18px] max-[700.01px]:[&_.brand]:text-[26px] max-[700.01px]:[&_.brand-mark]:w-[36px] max-[700.01px]:[&_.brand-mark]:h-[38px] [&:before]:absolute [&:before]:[content:''] [&:before]:w-[420px] [&:before]:h-[100dvh] [&:before]:left-[-190px] [&:before]:top-[70px] [&:before]:[box-shadow:0_0_0_70px_#ffffff08,_0_0_0_145px_#ffffff05] [&:before]:border-[1px] [&:before]:border-solid [&:before]:border-[color:rgba(255,_255,_255,_0.075)] [&:before]:rounded-[50%] max-[700.01px]:[.flow-page_&]:min-h-[100px] max-[700.01px]:[.flow-page_&]:h-[100px] max-[700.01px]:[.flow-page_&]:py-[18px] min-[701px]:[&&&]:min-h-[100dvh] min-[701px]:[&&&]:h-[auto] min-[701px]:[&&&]:[align-self:stretch] login-story"
  >
    <a
      class="[-webkit-tap-highlight-color:transparent] text-[color:var(--dark)] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] flex items-center gap-y-[10px] gap-x-[10px] mt-[0px] mb-[30px] text-[30px] tracking-[-1.3px] font-[800] leading-[1] mx-[10px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] max-[900.01px]:text-[27px] max-[700.01px]:[&&&]:text-[23px] brand"
      href="/login"
      ><span
        class="flex items-center justify-center w-[42px] h-[45px] [background-image:initial] [background-color:var(--dark)] text-[#cce8b3] [border-top-left-radius:13px] [border-top-right-radius:13px] [border-bottom-right-radius:13px] [border-bottom-left-radius:4px] brand-mark"
        ><Icon name="leaf" size={29} /></span
      ><span
        >DEB<span
          class="block text-[7px] tracking-[1.5px] font-[650] mt-[8px] text-[#788975] max-[900.01px]:text-[6px] brand-sub"
          >RUANG TUMBUH BERSAMA</span
        ></span
      ></a
    >
    <div
      class="relative z-[2] [&&]:mt-[clamp(32px,_7vh,_75px)] max-w-[450px] [&_h1]:text-[#fff] [&_h1]:text-[49px] [&_h1]:leading-[1.2] [&_h1]:tracking-[-2px] [&_h1]:font-[550] [&_h1]:mt-[24px] [&_h1_em]:[font-style:normal] [&_h1_em]:text-[#9fd5ff] [&>p]:text-[13px] [&>p]:leading-[2] [&>p]:text-[#d1e5ff] [&>p]:mt-[25px] [&>p]:max-w-[360px] max-[1200.01px]:[&_h1]:text-[42px] max-[900.01px]:[&&]:mt-[clamp(32px,_7vh,_75px)] max-[900.01px]:[&_h1]:text-[35px] max-[900.01px]:[&>p]:text-[12px] max-[700.01px]:[&&]:mt-[14px] max-[700.01px]:max-w-[340px] max-[700.01px]:[&_.eyebrow]:text-[7px] max-[700.01px]:[&_.eyebrow]:mb-[10px] max-[700.01px]:[&_h1]:text-[34px] max-[700.01px]:[&_h1]:tracking-[-1.2px] max-[700.01px]:[&_h1]:mt-[10px] max-[700.01px]:[&>p]:text-[11px] max-[700.01px]:[&>p]:mt-[16px] max-[700.01px]:[&>p]:max-w-[270px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[5vh] max-[700.01px]:[.flow-page_&]:hidden login-copy"
    >
      <span
        class="block text-[10px] tracking-[1.9px] font-[750] [&&]:text-[#c9e5ff] mb-[9px] max-[700.01px]:[&&&]:hidden max-[700.01px]:text-[8px] eyebrow light"
        >DIGITALISASI DEB PUTIH</span
      >
      <h1
        class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:text-[clamp(34px,_5.5vh,_44px)] max-[700.01px]:[&&]:mt-[0] max-[700.01px]:[&&]:text-[clamp(21px,_3.2vh,_27px)] max-[700.01px]:[&&]:leading-[1.15] max-[700.01px]:[&&]:max-w-[270px]"
      >
        Dari kolaborasi,<br />tumbuh <em>perubahan.</em>
      </h1>
      <p
        class="leading-[1.8] m-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[16px] max-[700.01px]:[&&]:hidden"
      >
        Satu ruang untuk merawat gagasan, memantau langkah, dan mewujudkan dampak bersama kampus
        mitra.
      </p>
      <div
        class="flex gap-y-[36px] gap-x-[36px] [&&]:mt-[28px] [&>div]:flex [&>div]:flex-col [&_strong]:text-[29px] [&_strong]:tracking-[-1px] [&_strong]:text-[#fff] [&_strong]:font-[500] [&_span]:text-[10px] [&_span]:text-[#c0d9ff] [&_span]:mt-[6px] max-[900.01px]:gap-y-[23px] max-[900.01px]:gap-x-[23px] max-[700.01px]:hidden [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[20px] login-metrics"
      >
        <div><strong class="font-[650]">40</strong><span>Kampus mitra</span></div>
        <div><strong class="font-[650]">PB</strong><span>Sumber data tunggal</span></div>
        <div><strong class="font-[650]">1</strong><span>Tujuan bersama</span></div>
      </div>
    </div>
    <div
      class="absolute top-[auto] right-[0px] bottom-[0px] left-[0px] h-[330px] [pointer-events:none] overflow-x-hidden overflow-y-hidden [&>svg]:absolute [&>svg]:bottom-[-5px] [&>svg]:right-[-20px] [&>svg]:w-[320px] [&>svg]:opacity-[0.6] max-[700.01px]:left-[45%] max-[700.01px]:[&&]:h-[170px] max-[700.01px]:opacity-[0.45] max-[700.01px]:[&>svg]:right-[-90px] max-[700.01px]:[&>svg]:w-[290px] [&>svg_path:first-child]:[fill:#8fc8ff] [&>svg_path:last-child]:[stroke:#fff] max-[700.01px]:[.flow-page_&]:h-[120px] landscape"
      aria-hidden="true"
    >
      <span
        class="absolute w-[120px] h-[120px] right-[70px] top-[15px] [box-shadow:0_0_0_35px_#ffffff0a,_0_0_0_70px_#ffffff08] border-[1px] border-solid border-[color:rgba(255,_255,_255,_0.157)] rounded-[50%] sun"
      ></span>
      <div
        class="absolute w-[800px] h-[480px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:left-[110px] [&&]:top-[120px] [transform:rotate(-20deg)] [&&]:text-[#276bb7] [&&]:text-[11px] [&&]:block [&&]:mb-[25px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] rounded-[50%] [.flow-page_&]:mb-[18px] [.password-page_&]:mb-[12px] [.success-page_&]:mb-[12px] hill back"
      ></div>
      <div
        class="absolute w-[800px] h-[480px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_68,_187)] left-[-250px] [&&]:top-[230px] [transform:rotate(-20deg)] rounded-[50%] hill front"
      ></div>
      <svg
        class="shrink-0 max-[700.01px]:[&&]:w-[220px] max-[700.01px]:[&&]:right-[-55px]"
        viewBox="0 0 460 220"
        ><path
          d="M220 220V70m0 94c-75 0-95-60-95-90 60 0 95 25 95 90Zm0-43c75 0 100-65 100-110-72 0-100 42-100 110Z"
          fill="#c6e4a7"
        /><path d="m220 163-65-62m65 23 73-81" fill="none" stroke="#326747" stroke-width="3" /></svg
      >
    </div>
    <div
      class="relative z-[2] flex flex-col gap-y-[8px] gap-x-[8px] mt-[auto] [&&]:pt-[24px] text-[#c0d9ff] text-[9px] tracking-[1.4px] [&>span]:text-[10px] [&>span]:text-[#9fc5f5] [&>span]:tracking-[0] max-[900.01px]:[&&]:pt-[24px] max-[700.01px]:hidden login-footer"
    >
      <img
        class="[&&]:w-[180px] [&&]:h-[auto] [&&]:mb-[4px] pf-white-logo"
        src="/logo-pf-white.png"
        alt="Pertamina Foundation"
        width="205"
        height="55"
      /><span>Untuk masa depan yang berkelanjutan.</span>
    </div>
  </section>
  <section
    class="[&&]:flex [&&]:flex-col [&&]:min-h-[100dvh] [&&]:px-[48px] [&&]:py-[clamp(16px,_3vh,_28px)] max-[700.01px]:[&&]:min-h-[0] max-[700.01px]:[&&]:grow max-[700.01px]:[&&]:shrink max-[700.01px]:[&&]:[flex-basis:0%] max-[700.01px]:[&&]:px-[24px] max-[700.01px]:[&&]:py-[16px] [.password-page_&]:py-[16px] max-[700.01px]:[.password-page_&]:py-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:py-[10px] [.success-page_&]:py-[14px] max-[700.01px]:[.success-page_&]:py-[8px] stage"
    aria-label="Akses akun"
  >
    <div
      class="[&&]:flex [&&]:justify-between [&&]:gap-y-[15px] [&&]:gap-x-[15px] [&&]:text-[10px] [&&]:text-[#6d839f] max-[700.01px]:[&&]:text-[9px] max-[700.01px]:[.password-page_&]:hidden max-[700.01px]:[.success-page_&]:hidden stage-top"
    >
      <span>PORTAL KAMPUS MITRA</span>{#if dev}<a
          class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#1768c0] [&&]:[text-decoration-line:underline] [&&]:[text-decoration-thickness:initial] [&&]:[text-decoration-style:initial] [&&]:[text-decoration-color:initial] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
          href="/login?qa=1">Akun QA lokal</a
        >{/if}
    </div>
    <div
      class="[&&]:w-[100%] [&&]:max-w-[420px] [&&]:px-[0px] [&&]:py-[clamp(16px,_3vh,_30px)] [&&]:m-[auto] max-[700.01px]:[&&]:px-[0px] max-[700.01px]:[&&]:py-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:py-[12px] max-[700.01px]:[.flow-page_&]:py-[12px] [.password-page_&]:py-[10px] max-[700.01px]:[.password-page_&]:py-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:py-[6px] [.success-page_&]:py-[10px] form-wrap"
    >
      {#if screen !== 'login' && screen !== 'success'}<button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#276bb7] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:block [&&]:mb-[25px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [.flow-page_&]:mb-[18px] [.password-page_&]:mb-[12px] [.success-page_&]:mb-[12px] back"
          onclick={() => go('login')}
          >{screen === 'employee' ? 'Kembali ke masuk kampus' : 'Kembali ke masuk'}</button
        >{/if}
      {#if step}<nav
          class="[&&]:mt-[0px] [&&]:mb-[24px] [&&]:mx-[0px] max-[700.01px]:[&&]:mb-[18px] [.password-page_&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:mb-[10px] [.success-page_&]:mb-[14px] activation-progress"
          aria-label="Tahapan aktivasi akun"
        >
          <p
            class="[&&]:mt-[0px] [&&]:mb-[15px] leading-[1.8] [&&]:flex [&&]:justify-between [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:text-[10px] [&&]:text-[#6580a1] [&&]:mx-[0px] [.password-page_.activation-progress>&]:mb-[10px]"
          >
            Aktivasi akun <strong class="[&&]:font-[650] [&&]:text-[#1768c0]"
              >Langkah {step} dari 4</strong
            >
          </p>
          <ol
            class="[&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:grid [&&]:grid-cols-[repeat(4,_1fr)] [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:p-[0px] [&&]:m-[0px]"
          >
            {#each activationSteps as label, index}<li
                class="[&&]:relative [&&]:flex [&&]:flex-col [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:text-[#7c8fa7] [&&]:text-[9px] [&&]:text-center [&&]:leading-[1.4] [&:not(:last-child):after]:absolute [&:not(:last-child):after]:[content:''] [&:not(:last-child):after]:left-[calc(50%_+_19px)] [&:not(:last-child):after]:right-[calc(-50%_+_11px)] [&:not(:last-child):after]:top-[15px] [&:not(:last-child):after]:h-[2px] [&:not(:last-child):after]:[background-image:initial] [&:not(:last-child):after]:[background-color:rgb(217,_228,_242)] [&.current]:text-[#155fb9] [&.current]:font-[700] [&.complete]:text-[#23764f] [&.complete:after]:[background-image:initial] [&.complete:after]:[background-color:rgb(161,_211,_188)]"
                class:current={step === index + 1}
                class:complete={step > index + 1}
                aria-current={step === index + 1 ? 'step' : undefined}
              >
                <span
                  class="[&&]:w-[32px] [&&]:h-[32px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_242,_248)] [&&]:text-[#7b91ad] [&&]:text-[11px] [&&]:font-[650] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(212,_224,_238)] [&&]:rounded-[50%] [.current_&]:[background-image:initial] [.current_&]:[background-color:rgb(23,_107,_214)] [.current_&]:text-[white] [.current_&]:[box-shadow:0_0_0_4px_#e7f1ff] [.current_&]:border-[color:rgb(23,_107,_214)] [.complete_&]:[background-image:initial] [.complete_&]:[background-color:rgb(231,_246,_238)] [.complete_&]:text-[#23764f] [.complete_&]:border-[color:rgb(182,_221,_201)] step-number"
                  >{#if step > index + 1}<Icon name="check" size={14} />{:else}{index +
                      1}{/if}</span
                ><span>{label}</span>
              </li>{/each}
          </ol>
        </nav>{/if}
      <div
        class="[&&]:inline-grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[48px] [&&]:h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:text-[#2373cd] [&&]:mb-[26px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(213,_230,_251)] [&&]:rounded-[13px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:w-[38px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:h-[38px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[14px] max-[700.01px]:[&&]:hidden [.flow-page_&]:hidden form-icon"
      >
        <Icon
          name={screen === 'success' ? 'check' : screen === 'invalid' ? 'alert' : 'leaf'}
          size={25}
        />
      </div>
      <span
        class="[&&]:block [&&]:text-[9px] [&&]:tracking-[2px] [&&]:text-[#6d89ab] [&&]:mb-[12px] max-[700.01px]:[&&]:mb-[8px] [.password-page_&]:mb-[7px] [.success-page_&]:mb-[7px] section-label"
        >AKSES AKUN DEB</span
      >
      <h2
        class="font-[650] text-[color:var(--navy)] [&&]:text-[30px] [&&]:tracking-[-1px] [&&]:leading-[1.3] m-[0px] max-[700.01px]:[&&]:text-[24px] [.password-page_&]:text-[28px] max-[700.01px]:[.password-page_&]:text-[24px] [.success-page_&]:text-[26px]"
      >
        {title}
      </h2>
      {#if ['login', 'activate', 'forgot', 'password'].includes(screen)}
        <p
          class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
        >
          {screen === 'login'
            ? 'Masuk menggunakan email PIC dan password akun kampus Anda.'
            : screen === 'password'
              ? 'Simpan password untuk melanjutkan akses akun kampus.'
              : 'Gunakan email PIC yang sudah didaftarkan admin DEB.'}
        </p>
        {#if screen === 'password'}<details
            class="[&&]:text-[11px] [&&]:text-[#2368b5] [&&]:mx-[0px] [&&]:my-[10px] intro-guide"
          >
            <summary
              class="[&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&&]:cursor-pointer [&&]:leading-[1.6]"
              >Baru di DEB? Kenali ruang kerja Anda</summary
            ><WelcomeGuide />
          </details>
          <div
            class="[&&]:flex [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:items-center [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:text-[#2d79ca] [&&]:p-[17px] [&&]:mx-[0px] [&&]:my-[22px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(216,_231,_248)] [&&]:rounded-[9px] max-[700.01px]:[&&]:p-[12px] max-[700.01px]:[&&]:mx-[0px] max-[700.01px]:[&&]:my-[12px] max-[700.01px]:[.flow-page_&]:mx-[0px] max-[700.01px]:[.flow-page_&]:my-[12px] [.password-page_&]:mt-[12px] [.password-page_&]:mb-[16px] [.password-page_&]:px-[14px] [.password-page_&]:py-[12px] [.password-page_&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:mt-[8px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:mb-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[.password-page_&]:mx-[0px] account-summary"
          >
            <Icon name="campus" />
            <div class="[&&]:min-w-[0] [&&]:grid [&&]:gap-y-[6px] [&&]:gap-x-[6px]">
              <strong class="font-[650] [&&]:text-[12px]">{target.campus}</strong><span
                class="[&&]:text-[11px] [&&]:text-[#6b82a0] [&&]:wrap-anywhere"
                >{target.name} - {target.email}</span
              >
            </div>
          </div>{/if}
        <form
          class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] [&&]:flex [&&]:flex-col [&&]:gap-y-[10px] [&&]:gap-x-[10px] [.password-page_&]:gap-y-[8px] [.password-page_&]:gap-x-[8px]"
          onsubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {#if screen !== 'password'}<label
              class="[&&]:text-[12px] [&&]:text-[#335580] [&&]:mt-[7px] [.password-page_&]:m-[0px]"
              for="real-email">Email PIC</label
            ><input
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[13px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:text-[#24466f] max-w-[100%] [&&]:min-w-[0] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:px-[14px] [&&]:py-[12px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(205,_221,_241)] [&&]:rounded-[8px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(205,_221,_241)] [&::placeholder]:text-[#24466f]"
              id="real-email"
              type="email"
              autocomplete="email"
              required
              bind:value={email}
            />{/if}
          {#if screen === 'login' || screen === 'password'}
            <div
              class="[&&]:flex [&&]:justify-between [&&]:items-center [.password-page_&]:m-[0px] label-row"
            >
              <label
                class="[&&]:text-[12px] [&&]:text-[#335580] [&&]:mt-[7px] [.password-page_&]:m-[0px]"
                for="real-password">{screen === 'password' ? 'Password baru' : 'Password'}</label
              >{#if screen === 'login'}<button
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#276bb7] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] inline-link"
                  type="button"
                  onclick={() => go('forgot')}>Lupa password?</button
                >{/if}
            </div>
            <div class="[&&]:relative password-input">
              <input
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[13px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:text-[#24466f] [&&]:pr-[48px] [&&]:pl-[14px] max-w-[100%] [&&]:min-w-[0] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:py-[12px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(205,_221,_241)] [&&]:rounded-[8px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(205,_221,_241)] [&::placeholder]:text-[#24466f]"
                id="real-password"
                type={showPassword ? 'text' : 'password'}
                autocomplete={screen === 'login' ? 'current-password' : 'new-password'}
                required
                maxlength="128"
                aria-describedby={screen === 'password' ? 'password-requirements' : undefined}
                bind:value={password}
              /><button
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#4b719c] [&&]:absolute [&&]:right-[5px] [&&]:top-[5px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
                type="button"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-pressed={showPassword}
                onclick={() => (showPassword = !showPassword)}
                ><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button
              >
            </div>
          {/if}
          {#if screen === 'password'}<ul
              id="password-requirements"
              class="[&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:mt-[2px] [&&]:mb-[6px] [&&]:grid [&&]:gap-y-[6px] [&&]:gap-x-[6px] [&&]:text-[11px] [&&]:text-[#7185a0] [&&]:p-[0px] [&&]:mx-[0px] password-rules"
              aria-label="Persyaratan password"
            >
              {#each passwordRules as rule}<li
                  class="[&&]:flex [&&]:items-center [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:leading-[1.5] [&.met]:text-[#187347]"
                  class:met={rule.met}
                >
                  <span
                    class="[&&]:w-[17px] [&&]:h-[17px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:shrink-0 [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(203,_217,_233)] [&&]:rounded-[50%] [.met_&]:[background-image:initial] [.met_&]:[background-color:rgb(231,_246,_236)] [.met_&]:border-[color:rgb(162,_212,_182)] rule-icon"
                    aria-hidden="true"
                    >{#if rule.met}<Icon name="check" size={12} />{:else}<span
                        class="[&&]:w-[4px] [&&]:h-[4px] [&&]:[background-image:initial] [&&]:[background-color:rgb(145,_163,_186)] [&&]:rounded-[50%]"
                      ></span>{/if}</span
                  ><span>{rule.label}</span><span
                    class="[&&]:absolute [&&]:w-[1px] [&&]:h-[1px] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [&&]:[clip:rect(0,_0,_0,_0)] [&&]:[white-space-collapse:collapse] [&&]:[text-wrap-mode:nowrap] [&&]:p-[0px] [&&]:m-[-1px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] sr-only"
                    >{rule.met ? 'Terpenuhi' : 'Belum terpenuhi'}</span
                  >
                </li>{/each}
            </ul>
            <label
              class="[&&]:text-[12px] [&&]:text-[#335580] [&&]:mt-[7px] [.password-page_&]:m-[0px]"
              for="real-confirm">Konfirmasi password</label
            >
            <div class="[&&]:relative password-input">
              <input
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[13px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:text-[#24466f] [&&]:pr-[48px] [&&]:pl-[14px] max-w-[100%] [&&]:min-w-[0] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:py-[12px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(205,_221,_241)] [&&]:rounded-[8px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(205,_221,_241)] [&::placeholder]:text-[#24466f]"
                id="real-confirm"
                type={showConfirmation ? 'text' : 'password'}
                autocomplete="new-password"
                required
                maxlength="128"
                aria-describedby="password-match"
                bind:value={confirmation}
              /><button
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#4b719c] [&&]:absolute [&&]:right-[5px] [&&]:top-[5px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px]"
                type="button"
                aria-label={showConfirmation
                  ? 'Sembunyikan konfirmasi password'
                  : 'Tampilkan konfirmasi password'}
                aria-pressed={showConfirmation}
                onclick={() => (showConfirmation = !showConfirmation)}
                ><Icon name={showConfirmation ? 'eye-off' : 'eye'} size={18} /></button
              >
            </div>
            <p
              id="password-match"
              class="leading-[1.8] [&&]:flex [&&]:items-center [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:min-h-[18px] [&&]:text-[11px] [&&]:text-[#7185a0] [&&]:m-[0px] [&.met]:text-[#187347] [&.mismatch]:text-[#b42318] password-match"
              class:met={passwordsMatch}
              class:mismatch={!!confirmation && !passwordsMatch}
              aria-live="polite"
            >
              <span aria-hidden="true"
                >{#if passwordsMatch}<Icon name="check" size={13} />{/if}</span
              >{passwordsMatch
                ? 'Konfirmasi password cocok.'
                : confirmation
                  ? 'Konfirmasi password belum cocok.'
                  : 'Ketik ulang password yang sama.'}
            </p>{/if}
          {#if error}<p
              class="[&&]:leading-[1.7] [&&]:text-[11px] [&&]:text-[#a33b31] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_240,_238)] [&&]:p-[12px] m-[0px] [&&]:rounded-[7px] error"
              role="alert"
            >
              {error}
            </p>{/if}
          <button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[white] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_104,_212)] [&&]:mt-[17px] [&&]:px-[18px] [&&]:py-[13px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[10px] max-[700.01px]:[&&]:mt-[12px] [.password-page_&]:mt-[6px] [.password-page_&:disabled]:cursor-not-allowed [.success-page_&]:mt-[12px] primary"
            disabled={busy ||
              (screen === 'password' &&
                (!longEnough || !hasNumber || !hasCapital || !passwordsMatch))}
            >{busy
              ? 'Memproses...'
              : screen === 'login'
                ? 'Masuk'
                : screen === 'password'
                  ? 'Simpan password'
                  : screen === 'forgot'
                    ? 'Kirim tautan pemulihan'
                    : 'Kirim tautan aktivasi'}<Icon name="arrow" size={18} /></button
          >
        </form>
        {#if screen === 'login'}
          <div
            class="[&&]:flex [&&]:gap-y-[0px] [&&]:gap-x-[6px] [&&]:text-center [&&]:mt-[25px] [&&]:text-[12px] [&&]:text-[#7085a0] [&&]:items-center [&&]:justify-center [&&]:flex-wrap [&&]:leading-[1.6] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[16px] max-[700.01px]:[&&]:mt-[16px] first-time"
          >
            <span>Baru pertama kali masuk?</span><button
              class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#125bb7] [&&]:[background-image:none] [&&]:[background-color:initial] [&&]:min-h-[44px] [&&]:[text-decoration-line:underline] [&&]:[text-decoration-thickness:initial] [&&]:[text-decoration-style:initial] [&&]:[text-decoration-color:#125bb766] [&&]:[text-underline-offset:3px] [&&]:px-[2px] [&&]:py-[10px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.6] [&:focus-visible]:[outline-color:rgb(22,_115,_222)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[text-decoration-color:currentColor]"
              type="button"
              disabled={busy}
              onclick={() => go('activate')}>Aktivasi akun</button
            >
          </div>
          <div
            class="[&&]:flex [&&]:items-center [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:text-[#7185a0] [&&]:text-[11px] [&&]:mx-[0px] [&&]:my-[18px] [&::before]:[content:''] [&::before]:h-[1px] [&::before]:grow [&::before]:shrink [&::before]:[flex-basis:0%] [&::before]:[background-image:initial] [&::before]:[background-color:rgb(220,_229,_239)] [&::after]:[content:''] [&::after]:h-[1px] [&::after]:grow [&::after]:shrink [&::after]:[flex-basis:0%] [&::after]:[background-image:initial] [&::after]:[background-color:rgb(220,_229,_239)] login-divider"
          >
            <span>Karyawan</span>
          </div>
          <button
            type="button"
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[600] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#285d99] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[10px] [&&]:gap-x-[10px] [&&]:w-[100%] [&&]:min-h-[44px] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:px-[12px] [&&]:py-[10px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.6] [&:focus-visible]:[outline-color:rgb(22,_115,_222)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(230,_239,_250)] employee-entry"
            disabled={busy}
            onclick={() => go('employee')}
            >Masuk sebagai Karyawan<Icon name="arrow" size={16} /></button
          >
        {/if}
      {:else if screen === 'employee'}
        <p
          class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
        >
          Gunakan akun Microsoft kerja Pertamina Foundation untuk mengakses ruang kerja karyawan.
        </p>
        <button
          type="button"
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[600] [font-stretch:inherit] [&&]:text-[16px] [&&]:leading-[22px] [&&]:[font-family:'Segoe_UI',_Arial,_sans-serif] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#fff] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[15px] [&&]:gap-x-[15px] [&&]:w-[100%] [&&]:min-h-[52px] [&&]:[background-image:initial] [&&]:[background-color:rgb(48,_48,_48)] [&&]:[box-shadow:0_2px_3px_#0000001a] [&&]:[transition-behavior:normal] [&&]:[transition-duration:0.15s] [&&]:[transition-timing-function:ease] [&&]:[transition-delay:0s] [&&]:[transition-property:background] [&&]:px-[18px] [&&]:py-[14px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(48,_48,_48)] [&&]:rounded-[14px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.6] [&:focus-visible]:[outline-color:rgb(22,_115,_222)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(36,_36,_36)] microsoft-login"
          disabled={busy}
          onclick={() => (microsoftNotice = true)}
        >
          <svg
            class="[&&]:shrink-0"
            width="21"
            height="21"
            viewBox="0 0 21 21"
            fill="none"
            aria-hidden="true"
            ><path fill="#f25022" d="M0 0h10v10H0z" /><path
              fill="#7fba00"
              d="M11 0h10v10H11z"
            /><path fill="#00a4ef" d="M0 11h10v10H0z" /><path
              fill="#ffb900"
              d="M11 11h10v10H11z"
            /></svg
          >
          <span>Masuk dengan Microsoft</span>
        </button>
        {#if microsoftNotice}<p
            class="[&&]:mt-[12px] [&&]:mb-[0px] [&&]:leading-[1.7] [&&]:text-[12px] [&&]:text-[#607795] [&&]:mx-[0px] microsoft-notice"
            role="status"
          >
            Login Microsoft belum diaktifkan. Hubungi admin DEB untuk informasi akses karyawan.
          </p>{/if}
      {:else if screen === 'sent'}<p
          class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
        >
          Jika email terdaftar dan memenuhi syarat, tautan akan dikirim ke <strong
            class="[&&]:font-[650] [&&]:text-[#24466f] [&&]:wrap-anywhere email-destination"
            >{email.trim().toLowerCase()}</strong
          >. Periksa inbox dan folder spam pada alamat tersebut.
        </p>
        {#if error}<p
            class="[&&]:leading-[1.7] [&&]:text-[11px] [&&]:text-[#a33b31] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_240,_238)] [&&]:p-[12px] m-[0px] [&&]:rounded-[7px] error"
            role="alert"
          >
            {error}
          </p>{/if}
        {#if resent}<p
            class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
            role="status"
          >
            Permintaan kirim ulang diterima. Jika memenuhi syarat, gunakan tautan dari email
            terbaru.
          </p>{/if}
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[white] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_104,_212)] [&&]:mt-[17px] [&&]:px-[18px] [&&]:py-[13px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[10px] max-[700.01px]:[&&]:mt-[12px] [.password-page_&]:mt-[6px] [.password-page_&:disabled]:cursor-not-allowed [.success-page_&]:mt-[12px] primary"
          disabled={busy || resendSeconds > 0}
          onclick={() => submit()}
          >{busy
            ? 'Mengirim…'
            : resendSeconds > 0
              ? `Kirim ulang email (${resendSeconds} detik)`
              : 'Kirim ulang email'}</button
        >
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[white] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_104,_212)] [&&]:mt-[17px] [&&]:px-[18px] [&&]:py-[13px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[10px] max-[700.01px]:[&&]:mt-[12px] [.password-page_&]:mt-[6px] [.password-page_&:disabled]:cursor-not-allowed [.success-page_&]:mt-[12px] primary"
          disabled={busy}
          onclick={() => go('login')}>Kembali ke masuk</button
        >
      {:else if screen === 'success'}<p
          class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
        >
          Kenali DEB, lalu masuk dengan email dan password Anda.
        </p>
        <WelcomeGuide /><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[white] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_104,_212)] [&&]:mt-[17px] [&&]:px-[18px] [&&]:py-[13px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[10px] max-[700.01px]:[&&]:mt-[12px] [.password-page_&]:mt-[6px] [.password-page_&:disabled]:cursor-not-allowed [.success-page_&]:mt-[12px] primary"
          onclick={() => go('login')}>Lanjut ke masuk</button
        >
      {:else}<p
          class="[&&]:mt-[17px] [&&]:mb-[25px] [&&]:leading-[1.9] [&&]:text-[12px] [&&]:text-[#7185a0] [&&]:mx-[0px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[12px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mb-[16px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mx-[0px] max-[700.01px]:[&&]:mt-[10px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:[&&]:text-[11px] max-[700.01px]:[&&]:mx-[0px] [.flow-page_&]:mt-[12px] [.flow-page_&]:mb-[17px] [.flow-page_&]:mx-[0px] [.password-page_&]:mt-[8px] [.password-page_&]:mb-[12px] [.password-page_&]:mx-[0px] [.success-page_&]:mt-[10px] [.success-page_&]:mb-[14px] [.success-page_&]:mx-[0px] intro"
        >
          Tautan mungkin kedaluwarsa, sudah digunakan, atau telah diganti. Minta tautan baru sesuai
          kebutuhan akun Anda.
        </p>
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[white] [&&]:flex [&&]:items-center [&&]:justify-center [&&]:gap-y-[13px] [&&]:gap-x-[13px] [&&]:w-[100%] [&&]:min-h-[48px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_104,_212)] [&&]:mt-[17px] [&&]:px-[18px] [&&]:py-[13px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[8px] [&:disabled]:[cursor:wait] [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [@media(min-width:_701px)_and_(max-height:_800px)]:[&&]:mt-[10px] max-[700.01px]:[&&]:mt-[12px] [.password-page_&]:mt-[6px] [.password-page_&:disabled]:cursor-not-allowed [.success-page_&]:mt-[12px] primary"
          onclick={() => go('activate')}>Minta tautan aktivasi</button
        ><button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#276bb7] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] inline-link"
          onclick={() => go('forgot')}>Pemulihan password</button
        >{/if}
    </div>
    <footer
      class="[&&]:text-[10px] [&&]:text-[#8092aa] [&&]:text-center [&&]:grid [&&]:[justify-items:center] [&&]:gap-y-[6px] [&&]:gap-x-[6px] max-[700.01px]:[&&]:pt-[16px] max-[700.01px]:[.flow-page_&]:pt-[10px] max-[700.01px]:[.password-page_&]:pt-[10px] stage-footer"
    >
      <img
        class="[&&&]:hidden max-[700.01px]:[&&&]:block max-[700.01px]:[&&&]:w-[116px] max-[700.01px]:[&&&]:h-[auto] pf-color-logo"
        src="/logo-pf.png"
        alt="Pertamina Foundation"
        width="140"
        height="37"
      /><span class="max-[700.01px]:[&&]:text-[9px]">Digitalisasi DEB</span>
    </footer>
  </section>
</main>
