import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  // This branch runs entirely in the browser; backend routes are not deployed.
  kit: { adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html' }) }
};
