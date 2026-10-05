import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
 envDir: false,
 plugins: [tailwindcss(),sveltekit()],
 server:{host:'127.0.0.1',port:5182,strictPort:true,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.local/**','**/scripts/fixtures/**']}}
});
