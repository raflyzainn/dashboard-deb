<script lang="ts">
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  $effect(() => {
    if (app.ready)
      goto(app.session ? `/${app.session.role}/dashboard` : '/login', { replaceState: true });
  });
</script>
<main
  id="main-content"
  class="min-h-[70vh] flex items-center justify-center gap-y-[16px] gap-x-[16px] flex-col text-[#8a9a7e] text-[13px] text-center p-[25px] loading-screen"
>
  <span
    class="w-[25px] h-[25px] [border-top-color:#69974d] [border-right-color:rgb(223,_233,_214)] [border-bottom-color:rgb(223,_233,_214)] [border-left-color:rgb(223,_233,_214)] [animation-duration:1s] [animation-timing-function:linear] [animation-delay:0s] [animation-iteration-count:infinite] [animation-direction:normal] [animation-fill-mode:none] [animation-play-state:running] [animation-name:spin] [animation-timeline:auto] [animation-range-start:normal] [animation-range-end:normal] border-[2px] border-solid rounded-[50%] spinner"
  ></span>Menyiapkan ruang kerja…
</main>
