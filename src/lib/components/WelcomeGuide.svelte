<script lang="ts">
  import Icon from './Icon.svelte';
  const features = [
    {
      icon: 'indicators',
      title: 'Pantau dan lengkapi indikator',
      description: 'Isi indikator DEB dan tindak lanjuti catatan review admin.'
    },
    {
      icon: 'proposal',
      title: 'Kelola proposal kampus',
      description: 'Unggah proposal, pantau status, dan baca masukan admin.'
    },
    {
      icon: 'questions',
      title: 'Belajar dan berdiskusi',
      description: 'Bertanya di Forum Q&A atau cari panduan di Pusat bantuan.'
    }
  ];
</script>
<section
  class="[&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [&&]:text-[#17365b] [&&]:p-[18px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(216,_230,_247)] [&&]:rounded-[12px] [@media(max-height:_800px)]:[&&]:p-[14px] welcome-guide"
  aria-label="Pengenalan Digitalisasi DEB"
>
  <div class="guide-heading">
    <span class="[&&]:text-[9px] [&&]:tracking-[1.5px] [&&]:text-[#2672c5]">MULAI DARI SINI</span>
    <h3
      class="font-[650] text-[color:var(--navy)] [&&]:text-[15px] [&&]:leading-[1.5] [&&]:mx-[0px] [&&]:my-[7px] [@media(max-height:_800px)]:[&&]:text-[14px]"
    >
      Satu ruang untuk langkah kampus Anda.
    </h3>
  </div>
  <ol
    class="[&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:grid [&&]:gap-y-[14px] [&&]:gap-x-[14px] [&&]:p-[0px] [&&]:mx-[0px] [&&]:my-[16px] [@media(max-height:_800px)]:[&&]:gap-y-[10px] [@media(max-height:_800px)]:[&&]:gap-x-[10px] [@media(max-height:_800px)]:[&&]:mx-[0px] [@media(max-height:_800px)]:[&&]:my-[12px]"
  >
    {#each features as feature}<li
        class="[&&]:flex [&&]:items-start [&&]:gap-y-[11px] [&&]:gap-x-[11px]"
      >
        <span
          class="[&&]:w-[34px] [&&]:h-[34px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:text-[#236dc4] [&&]:shrink-0 [&&]:rounded-[9px] feature-icon"
          ><Icon name={feature.icon} size={18} /></span
        >
        <div>
          <h4
            class="[&&]:mt-[0px] [&&]:mb-[3px] font-[650] text-[color:var(--navy)] [&&]:text-[12px] [&&]:leading-[1.6] [&&]:mx-[0px]"
          >
            {feature.title}
          </h4>
          <p class="[&&]:leading-[1.7] [&&]:text-[11px] [&&]:text-[#69809c] m-[0px]">
            {feature.description}
          </p>
        </div>
      </li>{/each}
  </ol>
  <p
    class="[&&]:leading-[1.7] [&&]:text-[11px] [&&]:text-[#69809c] [&&]:[border-top-width:1px] [&&]:[border-top-style:solid] [&&]:[border-top-color:rgb(228,_237,_248)] [&&]:pt-[12px] [&&]:flex [&&]:items-start [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:m-[0px] [&&_svg]:shrink-0 [&&_svg]:mt-[2px] guide-tip"
  >
    <Icon name="campus" size={15} /><span
      >Mulai dari <strong class="font-[650]">Beranda</strong> untuk melihat ringkasan kampus Anda.</span
    >
  </p>
</section>
