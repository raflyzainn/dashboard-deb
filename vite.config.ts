import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // Worktrees must not share optimized modules with the parent checkout.
  cacheDir: path.resolve('.svelte-kit/vite-cache'),
  optimizeDeps: { include: ['xlsx'] },
  server: {
    port: 5176, strictPort: true,
    watch: { ignored: ['.worktrees', '.local'].map(dir => path.resolve(dir).replaceAll('\\', '/') + '/**') },
    // Preserve Vite's default deny patterns and also block local runtime secrets/fixtures.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**', '**/scripts/fixtures/**'] }
  },
  preview: { port: 4176, strictPort: true }
});
