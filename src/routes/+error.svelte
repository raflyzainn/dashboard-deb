<script lang="ts">
  import { page } from '$app/state';
</script>
<main
  id="main-content"
  class="min-h-[70vh] flex items-center justify-center gap-y-[16px] gap-x-[16px] flex-col text-[#8a9a7e] text-[13px] text-center p-[25px] loading-screen"
>
  <h1
    class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
  >
    {page.status === 404 ? 'Halaman tidak ditemukan' : 'Halaman belum dapat dimuat'}
  </h1>
  <p class="leading-[1.8] m-[0px]">Gunakan tautan berikut untuk kembali ke ruang kerja.</p>
  <a
    href="/"
    class="[-webkit-tap-highlight-color:transparent] text-[white] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] text-[12px] font-[650] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
    >Kembali ke beranda</a
  >
</main>
