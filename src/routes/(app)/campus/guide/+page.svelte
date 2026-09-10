<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  const features = [
    { icon: 'dashboard', title: 'Beranda', description: 'Lihat ringkasan capaian kampus dan aktivitas terbaru sebelum memulai pekerjaan.', href: 'dashboard', action: 'Buka Beranda' },
    { icon: 'indicators', title: 'Indikator DEB', description: 'Lengkapi indikator kampus, periksa target, dan tindak lanjuti catatan review admin.', href: 'indicators', action: 'Lihat indikator' },
    { icon: 'proposal', title: 'Proposal', description: 'Unggah proposal kampus, lihat riwayat versi, dan baca masukan untuk perbaikan berikutnya.', href: 'proposal', action: 'Kelola proposal' },
    { icon: 'questions', title: 'Forum Q&A', description: 'Ajukan pertanyaan dan berdiskusi bersama admin serta kampus mitra lainnya.', href: 'questions', action: 'Buka forum' },
    { icon: 'faq', title: 'Pusat bantuan', description: 'Cari jawaban atas pertanyaan yang sering diajukan seputar penggunaan DEB.', href: 'faq', action: 'Cari jawaban' },
    { icon: 'notifications', title: 'Notifikasi', description: 'Periksa pemberitahuan terbaru agar informasi dan tindak lanjut tidak terlewat.', href: 'notifications', action: 'Lihat notifikasi' }
  ];
</script>

<svelte:head><title>Panduan aplikasi · Digitalisasi DEB</title></svelte:head>
<div class="app-guide">
  <section class="guide-hero" aria-labelledby="guide-title">
    <img src="/logo-pf-white.png" alt="Pertamina Foundation" width="205" height="55"/>
    <span class="guide-eyebrow">KENALI RUANG KERJA ANDA</span>
    <h1 id="guide-title">Langkah pertama menuju<br/>dampak bersama.</h1>
    <p>Digitalisasi DEB membantu kampus mitra memantau capaian, mengelola proposal, dan belajar bersama dalam satu tempat.</p>
    <a class="guide-start" href="/campus/dashboard">Mulai dari Beranda <Icon name="arrow" size={18}/></a>
  </section>

  <section aria-labelledby="features-title">
    <div class="guide-heading"><h2 id="features-title">Apa yang bisa Anda lakukan?</h2><p>Pilih fitur yang ingin digunakan. Panduan ini bisa dibuka kembali melalui ikon ? di samping bel.</p></div>
    <div class="feature-grid">
      {#each features as feature}
        <article class="feature-card"><span class="feature-symbol"><Icon name={feature.icon} size={24}/></span><h3>{feature.title}</h3><p>{feature.description}</p><a href={`/campus/${feature.href}`}>{feature.action}<Icon name="arrow" size={16}/></a></article>
      {/each}
    </div>
  </section>

  <aside class="guide-tip"><span class="tip-icon"><Icon name="leaf" size={25}/></span><div><h2>Mulai sedikit, lanjutkan bersama.</h2><p>Buka Beranda, periksa indikator yang perlu dilengkapi, lalu baca masukan admin. Jika ada yang belum jelas, cari jawabannya di Pusat bantuan atau tanyakan melalui Forum Q&A.</p></div></aside>
</div>

<style>
  .app-guide{max-width:1120px;margin:0 auto;display:grid;gap:30px}.guide-hero{position:relative;overflow:hidden;padding:36px;border-radius:18px;background:linear-gradient(120deg,#0878d8,#2040b5);color:white}.guide-hero::after{content:'';position:absolute;width:340px;height:340px;border:65px solid #ffffff08;border-radius:50%;right:-135px;top:-90px;pointer-events:none}.guide-hero img{display:block;width:180px;height:auto;margin-bottom:28px}.guide-eyebrow{display:block;font-size:10px;font-weight:600;letter-spacing:2px;color:#d2e9ff}.guide-hero h1{font-size:34px;line-height:1.3;letter-spacing:-1px;margin:13px 0 16px;color:white}.guide-hero p{max-width:620px;font-size:14px;line-height:1.8;margin:0 0 24px;color:#e0eeff}.guide-start{display:inline-flex;align-items:center;gap:16px;background:#fff;color:#1256b6;border-radius:9px;padding:13px 18px;font-size:13px;font-weight:700;text-decoration:none}.guide-heading h2{font-size:21px;margin:0 0 9px;color:#173963}.guide-heading p{font-size:13px;line-height:1.8;color:#647b97;margin:0 0 20px}.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.feature-card{display:flex;flex-direction:column;align-items:flex-start;padding:24px;background:white;border:1px solid #dce7f5;border-radius:13px}.feature-symbol{display:grid;place-items:center;width:46px;height:46px;background:#edf5ff;color:#176bd0;border-radius:12px;margin-bottom:18px}.feature-card h3{font-size:16px;margin:0 0 10px;color:#173963}.feature-card p{font-size:13px;line-height:1.8;color:#647b97;margin:0 0 22px;flex:1}.feature-card a{display:inline-flex;align-items:center;gap:10px;color:#1265c8;font-size:12px;font-weight:700;text-decoration:none}.feature-card a:hover{text-decoration:underline}.guide-tip{display:flex;align-items:flex-start;gap:17px;padding:24px;background:#eaf3ff;border:1px solid #d7e6fa;border-radius:13px}.tip-icon{flex-shrink:0;color:#176bd0;margin-top:2px}.guide-tip h2{font-size:15px;color:#173963;margin:0 0 8px}.guide-tip p{font-size:13px;line-height:1.8;color:#587395;margin:0}a:focus-visible{outline:3px solid #f4be40;outline-offset:5px}@media(max-width:1050px){.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.app-guide{gap:24px}.guide-hero{padding:25px}.guide-hero h1{font-size:27px}.guide-hero img{width:155px}.guide-hero p{font-size:13px}.feature-grid{grid-template-columns:1fr;gap:14px}.feature-card{padding:22px}.guide-heading h2{font-size:19px}.guide-tip{padding:20px}}
</style>
