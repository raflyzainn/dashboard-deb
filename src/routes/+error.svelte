<script lang="ts">
  import { page } from '$app/state';
</script>
<main id="main-content" class="loading-screen"><h1>{page.status === 404 ? 'Halaman tidak ditemukan' : 'Halaman belum dapat dimuat'}</h1><p>Gunakan tautan berikut untuk kembali ke ruang kerja.</p><a href="/" class="button">Kembali ke beranda</a></main>
