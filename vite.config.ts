import path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    port: 5176, strictPort: true,
    watch: { ignored: [path.resolve('.worktrees').replaceAll('\\','/')+'/**'] },
    // Preserve Vite's default deny patterns and also block local runtime secrets/fixtures.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.local/**', '**/scripts/fixtures/**'] }
  },
  preview: { port: 4176, strictPort: true }
});
