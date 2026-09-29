import { createDemoService } from '../../src/lib/data/demo/service';
import { transaction } from '../../src/lib/data/demo/store';
import { createApi } from './api';
import type { AppSession } from '../../src/lib/types';
export function createFullDemoService() {
 const demo=createDemoService();
 let selected='';
 const api=createApi(async()=> (await demo.session()).session);
 const nativeFetch=typeof window==='undefined'?null:window.fetch.bind(window);
 const choose=(key:string)=>{selected=key;demo.selectAccount(key);};
 const accounts=()=>transaction(s=>[{key:'admin-1',name:'Admin PF 1 (dummy)',role:'admin' as const},{key:'admin-2',name:'Admin PF 2 (dummy)',role:'admin' as const},...s.accounts.filter(a=>a.active).map(a=>({key:a.id,name:`${a.campus} - ${a.name}`,role:'campus' as const}))]);
 if(nativeFetch) window.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);
  if(!url.pathname.startsWith('/api/')) return nativeFetch(input,init);
  try {
   const method=init?.method||(input instanceof Request?input.method:'GET');
   let body:any=init?.body;
   if(typeof body==='string')body=JSON.parse(body);
   if(url.pathname==='/api/auth/logout'){choose('');sessionStorage.removeItem('deb-full-dummy-login');return Response.json({ok:true});}
   if(url.pathname==='/api/auth/login'){
    if(body?.password!=='Dummy123!')throw Error('Gunakan kata sandi dummy: Dummy123!');
    const key=body.email==='admin1@example.test'?'admin-1':body.email==='admin2@example.test'?'admin-2':await transaction(s=>s.accounts.find(a=>a.active&&a.email===body.email)?.id||'');
    if(!key)throw Error('Akun dummy tidak ditemukan. Gunakan pilihan akun lokal di bawah.');
    sessionStorage.setItem('deb-full-dummy-login',key);choose(key);return Response.json({ok:true});
   }
   const result=await api.request(url.pathname+url.search,method,body);
   return result instanceof Blob?new Response(result):Response.json(result);
  }catch(e){return Response.json({message:e instanceof Error?e.message:'Simulasi gagal.'},{status:400});}
 };
 if (nativeFetch) {
  const click = async (event: MouseEvent) => {
   const anchor = (event.target as Element).closest('a');
   if (!anchor) return;
   const url = new URL(anchor.href, location.origin);
   if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return;
   event.preventDefault();
   if (url.pathname.startsWith('/api/auth/oauth/')) {
    sessionStorage.setItem('deb-full-dummy-login', 'admin-1');
    location.assign('/admin/dashboard'); return;
   }
   try {
    const blob = await api.blob(url.pathname + url.search);
    const href = URL.createObjectURL(blob);
    if (anchor.target === '_blank') window.open(href, '_blank', 'noopener');
    else { const link = document.createElement('a'); link.href = href; link.download = 'Dokumen_DUMMY.pdf'; link.click(); }
    setTimeout(() => URL.revokeObjectURL(href), 60000);
   } catch (error) { window.alert(error instanceof Error ? error.message : 'Berkas dummy belum tersedia.'); }
  };
  document.addEventListener('click', click, true);
  import.meta.hot?.dispose(() => { document.removeEventListener('click', click, true); window.fetch = nativeFetch; });
 }
 return {...demo,api,accounts,
  selectAccount(key:string){choose(key||(typeof sessionStorage!=='undefined'?sessionStorage.getItem('deb-full-dummy-login')||'':''));},
  async session(){const result=await demo.session();return {...result,session:{...result.session,superAdmin:result.session.role==='admin'}};}
 };
}
