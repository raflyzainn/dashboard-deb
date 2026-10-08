import { writeFile, open, readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import net from 'node:net';
const root=process.cwd(),cwd=path.join(root,'.local/cloudflare-smoke');
await mkdir(cwd,{recursive:true});
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(4177,'127.0.0.1',()=>s.close(resolve));});
await writeFile(path.join(cwd,'wrangler.jsonc'),JSON.stringify({name:'deb-local-smoke',pages_build_output_dir:path.join(root,'.svelte-kit/cloudflare'),compatibility_date:'2026-09-11',compatibility_flags:['nodejs_compat']}));
await writeFile(path.join(cwd,'.env.smoke'),'PB_URL=http://127.0.0.1:1\nDEB_LOCAL_PREVIEW_ENABLED=false\nDEB_PUBLIC_URL=http://127.0.0.1:4177\n');
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>['PATH','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','COMSPEC'].includes(key.toUpperCase())));
Object.assign(env,{WRANGLER_SEND_METRICS:'false',CLOUDFLARE_INCLUDE_PROCESS_ENV:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',CI:'true'});
const log=await open(path.join(cwd,'runtime.log'),'w');
const child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'pages','dev',path.join(root,'.svelte-kit/cloudflare'),'--env-file',path.join(cwd,'.env.smoke'),'--binding','PB_URL=http://127.0.0.1:1','--binding','DEB_LOCAL_PREVIEW_ENABLED=false','--binding','DEB_PUBLIC_URL=http://127.0.0.1:4177','--ip','127.0.0.1','--port','4177','--inspector-port','0'],{cwd,env,windowsHide:true,stdio:['ignore',log.fd,log.fd]});
await log.close();
try{
 let ready=false;
 for(let i=0;i<90&&child.exitCode===null;i++){
  try{ready=(await fetch('http://127.0.0.1:4177/login',{signal:AbortSignal.timeout(1000)})).status===200;}catch{}
  if(ready)break;
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw Error('Wrangler not ready; inspect local runtime.log.');
 const startup=await readFile(path.join(cwd,'runtime.log'),'utf8');
 if(/Using secrets|env\.(?:PB_SUPER|R2_|DEB_INVITATION_KEY|DEB_SUPERADMIN)/.test(startup))throw Error('Unexpected credential bindings; refusing smoke requests.');
 const test=spawn(process.execPath,[path.join(root,'tests/cloudflare-smoke.mjs')],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 const [code]=await once(test,'exit');if(code!==0)throw Error('Cloudflare smoke failed, exit '+code);
}finally{
 if(child.exitCode===null){
  const stop=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{env,windowsHide:true,stdio:'ignore'});await once(stop,'exit');
 }
}
