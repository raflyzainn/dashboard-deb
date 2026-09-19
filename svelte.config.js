import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: { adapter: adapter({
      // Static folders are listed by name: the default per file list of static/data/regions exceeds the Pages routes limit.
      routes: { include: ['/*'], exclude: ['<build>', '<prerendered>', '/data/*', '/templat/*', '/favicon.svg', '/favicon-16x16.png', '/favicon-32x32.png', '/favicon-96x96.png', '/favicon-512x512.png', '/logo-pf.png', '/logo-pf-white.png'] }
    }) }
};
