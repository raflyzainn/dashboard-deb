<script lang="ts">
  import Icon from './Icon.svelte';
  const features = [
    { icon:'indicators', title:'Pantau dan lengkapi indikator', description:'Isi indikator DEB dan tindak lanjuti catatan review admin.' },
    { icon:'proposal', title:'Kelola proposal kampus', description:'Unggah proposal, pantau status, dan baca masukan admin.' },
    { icon:'questions', title:'Belajar dan berdiskusi', description:'Bertanya di Forum Q&A atau cari panduan di Pusat bantuan.' }
  ];
</script>
<section class="welcome-guide" aria-label="Pengenalan Digitalisasi DEB">
  <div class="guide-heading"><span>MULAI DARI SINI</span><h3>Satu ruang untuk langkah kampus Anda.</h3></div>
  <ol>{#each features as feature}<li><span class="feature-icon"><Icon name={feature.icon} size={18}/></span><div><h4>{feature.title}</h4><p>{feature.description}</p></div></li>{/each}</ol>
  <p class="guide-tip"><Icon name="campus" size={15}/><span>Mulai dari <strong>Beranda</strong> untuk melihat ringkasan kampus Anda.</span></p>
</section>
<style>
.welcome-guide{border:1px solid #d8e6f7;border-radius:12px;background:#fff;padding:18px;color:#17365b}.guide-heading>span{font-size:9px;letter-spacing:1.5px;color:#2672c5}.guide-heading h3{font-size:15px;line-height:1.5;margin:7px 0}.welcome-guide li p,.guide-tip{font-size:11px;line-height:1.7;color:#69809c}.welcome-guide ol{list-style:none;padding:0;margin:16px 0;display:grid;gap:14px}.welcome-guide li{display:flex;align-items:flex-start;gap:11px}.feature-icon{width:34px;height:34px;display:grid;place-items:center;background:#edf5ff;color:#236dc4;border-radius:9px;flex-shrink:0}h4{font-size:12px;line-height:1.6;margin:0 0 3px}.guide-tip{border-top:1px solid #e4edf8;padding-top:12px;display:flex;align-items:flex-start;gap:8px;margin:0}.guide-tip :global(svg){flex-shrink:0;margin-top:2px}@media(max-height:800px){.welcome-guide{padding:14px}.welcome-guide ol{gap:10px;margin:12px 0}.guide-heading h3{font-size:14px}}
</style>
