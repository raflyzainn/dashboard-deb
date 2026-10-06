import { transaction } from '../../src/lib/data/demo/store';
import { createEngine } from '../../src/lib/pengajuan/engine';
import { BUDGET } from '../rab/model';
import type { AppSession } from '../../src/lib/types';
export { itemLines } from '../../src/lib/pengajuan/engine';
export function createApi(actor:()=>Promise<AppSession>) {
 const engine=createEngine(actor,{transaction,origin:location.origin,amountSen:BUDGET,dummy:true,id:()=>crypto.randomUUID()});
 async function request(url:string,method='GET',body:any={}) {
  const target=new URL(url,location.origin);
  if(method==='GET'&&target.searchParams.get('format')==='pdf') {
   target.searchParams.delete('format');
   const source=await engine.request(target.pathname+target.search,method,body);
   if(!(source instanceof Blob))throw Error('Dokumen belum tersedia untuk dibuat PDF.');
   const {browserDocumentPdf}=await import('../../src/lib/pengajuan/browser-document-pdf');
   return browserDocumentPdf(source,true);
  }
  return engine.request(url,method,body);
 }
 return {...engine,request,blob:(url:string)=>request(url) as Promise<Blob>};
}
