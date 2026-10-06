import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const root='.qa/onboarding/pdf-all',origin=process.env.QA_ORIGIN||'http://127.0.0.1:5191',base='/api/pencairan/campus-001';
await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false,slowMo:100});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.setDefaultTimeout(25000);
const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{console.log('DIALOG',d.type());if(d.type()==='beforeunload')await d.accept();else await d.dismiss()});
const assert=(x,m)=>{if(!x)throw Error(m)};
const login=async role=>{if(page.url().startsWith(origin))await page.evaluate(async()=>{const {app}=await import('/src/lib/state.svelte.ts');await app.logout()});await page.goto(origin+'/login');await page.getByRole('combobox').selectOption(role);await page.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await page.waitForURL('**/'+(role.startsWith('admin')?'admin':'campus')+'/dashboard');await page.waitForTimeout(300)};
const view=()=>page.evaluate(async base=>(await(await fetch(base+'/pengajuan')).json()),base);
const call=(path,body={},method='POST')=>page.evaluate(async({base,path,body,method})=>{const v=await(await fetch(base+'/pengajuan')).json();const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify({...body,revision:v.journey.revision,expectedRevision:v.serverRevision})});return{status:r.status,data:await r.json()}},{base,path,body,method});
const ok=async promise=>{const r=await promise;assert(r.status===200,JSON.stringify(r));return r.data};
const shot=name=>page.screenshot({path:root+'/'+name+'.png',fullPage:true});
const run=async(name,fn)=>{try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('STATE_AFTER',name,(await view()).journey.status);console.log('PASS',name,JSON.stringify(detail))}catch(e){results.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.message);await shot('failure-'+results.length)}await fs.writeFile(root+'/results.json',JSON.stringify({results,errors},null,2))};
try{
await login('campus-001');
// Fixture administrasi/RAB hanya prasyarat; poin 4-7 bukan sasaran QA ini.
await ok(call('/pengajuan',{fields:{judulProgram:'Program QA Revisi 6 Oktober',alamat:'Alamat Kampus QA',mentor:'Mentor QA',koordinator:'Koordinator QA',lokasiProvinsiId:'31',lokasiProvinsi:'Daerah Khusus Ibukota Jakarta',lokasiKabupatenId:'31.74',kabupaten:'Kota Administrasi Jakarta Selatan',lokasiKecamatanId:'31.74.01',kecamatan:'Tebet',lokasiDesaId:'31.74.01.1001',desa:'Tebet Timur',lokasiKodePos:'12820',lokasiAlamatLengkap:'Jl. QA No. 14, Tebet Timur',namaBank:'Bank QA',nomorRekening:'1234567890',namaPemilik:'Kampus QA',penandatanganNama:'Perwakilan QA',penandatanganJabatan:'Dosen',tempatTandaTangan:'Jakarta',nomorSuratPermohonan:'QA-P-001',tanggalSuratPermohonan:'2026-10-01',nomorInvois:'QA-I-001',tanggalInvois:'2026-10-01',nomorKuitansi:'QA-K-001',tanggalKuitansi:'2026-10-01',nomorPksKampus:'QA-PKS-001'}},'PATCH'));
const prepared=await page.evaluate(async base=>{const upload=async(path,file,extra={})=>{const body=new FormData();body.set('file',file);for(const[k,v]of Object.entries(extra))body.set(k,v);const r=await fetch(base+path,{method:'POST',body});if(!r.ok)throw Error(await r.text());return r.json()};const Excel=(await import('/node_modules/.vite/deps/exceljs.js')).default;const{buildRabWorkbook}=await import('/src/lib/rab-excel.ts');const wb=buildRabWorkbook(Excel,{title:'RAB QA',university:'Kampus QA',village:'Tebet Timur',penuh:[{no:'A',uraian:'Energi'},{no:'A.1',uraian:'Kegiatan'},{no:'A.1.a',uraian:'Peralatan'},{no:'A.1.a.1',uraian:'Panel QA',volume:10,satuan:'unit',hargaSatuan:2000000,jumlah:20000000}],tahap1:[],tahap2:[]});await upload('/rab/import',new File([await wb.xlsx.writeBuffer()],'QA.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));await upload('/pengajuan/upload',new File([await(await fetch('/logo-pf.png')).blob()],'kop.png',{type:'image/png'}),{slot:'kop'});return(await(await fetch(base+'/rab')).json()).version},base);
await ok(call('/rab/versions/'+prepared.id+'/allocation',{quantities:Object.fromEntries(prepared.lines.filter(l=>l.level===4).map(l=>[l.id,6]))},'PATCH'));for(const step of[2,3])await ok(call('/rab/versions/'+prepared.id+'/progress',{step}));
await page.evaluate(async base=>{const body=new FormData();body.set('slot','rekening');body.set('file',new File([await(await fetch('/logo-pf.png')).blob()],'Foto-QA.png',{type:'image/png'}));const r=await fetch(base+'/pengajuan/upload',{method:'POST',body});if(!r.ok)throw Error(await r.text())},base);for(const kind of['pks','permohonan','invois','kuitansi'])await ok(call('/pengajuan/dokumen/'+kind));


const pdfChecks=[];
for(const kind of ['pks','permohonan','invois','kuitansi']){
 console.log('PDF_START',kind);
 const detail=await page.evaluate(async({base,kind})=>{
  const source=await(await fetch(base+'/pengajuan/dokumen/'+kind)).blob();
  const{renderAsync}=await import('/node_modules/.vite/deps/docx-preview.js');
  const baseline=document.createElement('iframe');document.body.append(baseline);const doc=baseline.contentDocument;doc.open();doc.write('<!doctype html><html><head></head><body></body></html>');doc.close();
  await renderAsync(source,doc.body,doc.head,{className:'deb-pdf',ignoreLastRenderedPageBreak:true,useBase64URL:true});
  const expected=[...doc.querySelectorAll('section.deb-pdf > article')].map(a=>a.textContent).join('').replace(/\s/g,'');baseline.remove();
  const observer=new MutationObserver(()=>{for(const frame of document.querySelectorAll('iframe[title="Pembuatan PDF"]'))frame.remove=()=>{frame.id='qa-paginated';frame.style.cssText='position:fixed;inset:0;width:1000px;height:1400px;z-index:999;background:white';};});observer.observe(document.body,{childList:true});
  try{const{browserDocumentPdf}=await import('/src/lib/pengajuan/browser-document-pdf.ts');const blob=await browserDocumentPdf(source);window.qaPdfURL=URL.createObjectURL(blob);const d=document.querySelector('#qa-paginated').contentDocument;return {noLetterheadPlaceholder:!d.body.textContent.replace(/\s/g,'').includes('KOPUNIVERSITAS'),contentPreserved:[...d.querySelectorAll('section.deb-pdf > article')].map(a=>a.textContent).join('').replace(/\s/g,'')===expected,pages:[...d.querySelectorAll('section.deb-pdf')].map(p=>({height:p.getBoundingClientRect().height,text:[...p.querySelectorAll(':scope > article')].map(a=>a.textContent).join('').trim()}))};}finally{observer.disconnect();}
 },{base,kind});
 assert(detail.noLetterheadPlaceholder,'Placeholder kop masih tampil '+kind);assert(detail.contentPreserved,'Isi dokumen berubah saat paginasi '+kind);assert(detail.pages.every(p=>p.text),'Halaman kosong '+kind);
 const downloadPromise=page.waitForEvent('download');await page.evaluate(()=>{const a=document.createElement('a');a.href=window.qaPdfURL;a.download='qa.pdf';a.click();});await(await downloadPromise).saveAs(root+'/'+kind+'.pdf');
 const{PDFDocument}=await import('pdf-lib');const pdf=await PDFDocument.load(await fs.readFile(root+'/'+kind+'.pdf'));const sizes=pdf.getPages().map(p=>p.getSize());assert(sizes.every(p=>Math.abs(p.height-842)<2),'Halaman bukan A4 '+kind);
 await page.frameLocator('#qa-paginated').locator('section.deb-pdf').first().screenshot({path:root+'/'+kind+'-first.png'});await page.frameLocator('#qa-paginated').locator('section.deb-pdf').last().screenshot({path:root+'/'+kind+'-last.png'});
 await page.evaluate(()=>{Element.prototype.remove.call(document.querySelector('#qa-paginated'));URL.revokeObjectURL(window.qaPdfURL);});
 pdfChecks.push({kind,pages:sizes.length,contentPreserved:true,noEmptyPage:true,A4:true});console.log('PDF_PASS',kind,sizes.length);
}
await fs.writeFile(root+'/results.json',JSON.stringify({passed:true,pdfChecks},null,2));
}catch(e){console.error(e);await shot('pdf-failure');process.exitCode=1}finally{await browser.close()}
