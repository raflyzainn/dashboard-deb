import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { samplePdf } from '../../src/lib/data/demo/fixtures/pdf';
export default defineConfig({
 envDir: false,
 plugins: [{name:'dummy-excel',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url?.split('?')[0]==='/api/pencairan/sk'){res.setHeader('Content-Type','application/pdf');void samplePdf('SK DUMMY SEMUA KAMPUS',1).arrayBuffer().then(bytes=>res.end(Buffer.from(bytes)));return;}
  if(req.url==='/contoh-rab.xlsx'){res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="Contoh_RAB_100_Persen.xlsx"');res.end(readFileSync(fileURLToPath(new URL('../rab/Contoh_RAB_100_Persen.xlsx',import.meta.url))));return;}next();
 });}},tailwindcss(),sveltekit()],
 server:{host:'127.0.0.1',port:5182,strictPort:true,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.local/**','**/scripts/fixtures/**']}}
});
