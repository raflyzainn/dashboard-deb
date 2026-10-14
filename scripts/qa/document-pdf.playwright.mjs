// QA dummy lokal; jalankan hanya dengan izin pengujian pengguna. Server mockup harus aktif pada port 5189.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:false,slowMo:180});
const page=await browser.newPage({viewport:{width:1440,height:1000}}); const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{console.log('DIALOG',d.message());await d.dismiss()});page.setDefaultTimeout(60000);
const origin='http://127.0.0.1:5189',base='/api/pencairan/campus-001';
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
try{
 await page.goto(origin+'/login');await page.getByRole('combobox').selectOption('campus-001');await page.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await page.waitForURL('**/campus/dashboard');
 const setup=await page.evaluate(async base=>{
  const call=async(path,body,method='POST')=>{const view=await(await fetch(base+'/pengajuan')).json();const r=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify({...body,revision:view.journey.revision})});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j};
  await call('/pengajuan',{fields:{judulProgram:'Program QA PDF 37',alamat:'Alamat QA 37',mentor:'Mentor QA',koordinator:'Koordinator QA',lokasiProvinsiId:'31',lokasiProvinsi:'Daerah Khusus Ibukota Jakarta',lokasiKabupatenId:'31.74',kabupaten:'Kota Administrasi Jakarta Selatan',lokasiKecamatanId:'31.74.01',kecamatan:'Tebet',lokasiDesaId:'31.74.01.1001',desa:'Tebet Timur',lokasiKodePos:'12820',lokasiAlamatLengkap:'Jalan PDF 37, Tebet Timur',namaBank:'Bank QA PDF',nomorRekening:'1234567890',namaPemilik:'Kampus QA PDF',penandatanganNama:'Perwakilan QA PDF',penandatanganJabatan:'Dosen',tempatTandaTangan:'Jakarta',nomorSuratPermohonan:'QA-PDF37-P-001',tanggalSuratPermohonan:'2026-10-01',nomorInvois:'QA-PDF37-I-001',tanggalInvois:'2026-10-01',nomorKuitansi:'QA-PDF37-K-001',tanggalKuitansi:'2026-10-01',nomorPksKampus:'QA-PDF37-PKS-001'}},'PATCH');
  await call('/pengajuan',{requestPf:true},'PATCH');
  const upload=async(path,file,extra={})=>{const body=new FormData();body.set('file',file);for(const[k,v]of Object.entries(extra))body.set(k,v);const r=await fetch(base+path,{method:'POST',body});const j=await r.json();if(!r.ok)throw Error(JSON.stringify(j));return j};
  const Excel=(await import('/node_modules/.vite/deps/exceljs.js')).default;const{buildRabWorkbook}=await import('/src/lib/rab-excel.ts');
  const wb=buildRabWorkbook(Excel,{title:'RAB QA PDF',university:'Universitas Sebelas Maret',village:'Tebet Timur',penuh:[{no:'A',uraian:'Energi'},{no:'A.1',uraian:'Kegiatan'},{no:'A.1.a',uraian:'Peralatan'},{no:'A.1.a.1',uraian:'Panel QA',volume:10,satuan:'unit',hargaSatuan:2000000,jumlah:20000000}],tahap1:[],tahap2:[]});
  await upload('/rab/import',new File([await wb.xlsx.writeBuffer()],'QA-PDF.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  for(const[slot,path]of[['rekening','/sk-dummy.pdf'],['kop','/logo-pf.png']]){const blob=await(await fetch(path)).blob();await upload('/pengajuan/upload',new File([blob],slot+(slot==='kop'?'.png':'.pdf'),{type:slot==='kop'?'image/png':'application/pdf'}),{slot})}
  const v=(await(await fetch(base+'/rab')).json()).version;await call('/rab/versions/'+v.id+'/allocation',{quantities:Object.fromEntries(v.lines.filter(l=>l.level===4).map(l=>[l.id,6]))},'PATCH');for(const step of[2,3])await call('/rab/versions/'+v.id+'/progress',{step});
  return (await(await fetch(base+'/pengajuan')).json()).blockers;
 },base);assert(!setup.length,'Blockers: '+JSON.stringify(setup));
 await page.goto(origin+'/campus/pencairan?butir=ringkasan');
 await page.getByRole('button',{name:'Siapkan semua dokumen',exact:true}).click();
 await page.locator('section[aria-label="Pratinjau PKS"]').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('section[aria-label^="Pratinjau"] iframe[src^="blob:"]').length===4,null,{timeout:180000});
 console.log('AUTO_PREVIEWS',await page.locator('section[aria-label^="Pratinjau"] iframe').count());
 console.log('ERRORS_VISIBLE',await page.getByRole('alert').allTextContents());
 const pdfs=await page.evaluate(async base=>{
  const result=[];const{PDFDocument}=await import('/node_modules/.vite/deps/pdf-lib.js');
  for(const kind of['pks','permohonan','invois','kuitansi']){const labels={pks:'PKS',permohonan:'Surat permohonan',invois:'Invois',kuitansi:'Kuitansi'};const url=document.querySelector('a[aria-label="Unduh PDF '+labels[kind]+'"]').getAttribute('href');const r=await fetch(url);if(!r.ok)throw Error(await r.text());const bytes=new Uint8Array(await r.arrayBuffer());const source=await(await fetch(url.split('?')[0])).arrayBuffer();const sourceHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',source))].map(n=>n.toString(16).padStart(2,'0')).join('');result.push({kind,url,sourceHash,type:r.headers.get('content-type'),signature:new TextDecoder().decode(bytes.slice(0,5)),size:bytes.length,pages:(await PDFDocument.load(bytes)).getPageCount(),hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')})}return result;
 },base);assert(pdfs.every(x=>x.signature==='%PDF-'&&x.pages>=1&&x.size>5000),'Invalid PDF output');console.log('PDFS',JSON.stringify(pdfs));
 await fs.mkdir('output/pr37',{recursive:true});await page.screenshot({path:'output/pr37/automatic-pdfs.png',fullPage:true});

 const originalVersion=new URL(pdfs.find(x=>x.kind==='invois').url,origin).pathname.split('/').at(-2);
 await page.goto(origin+'/campus/pencairan?butir=surat');await page.getByRole('textbox',{name:'Nomor invoice',exact:false}).fill('QA-PDF37-I-002');await page.getByRole('button',{name:'Simpan draf',exact:true}).click();
 await page.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.fields.nomorInvois==='QA-PDF37-I-002',base);
 await page.goto(origin+'/campus/pencairan?butir=ringkasan');await page.getByRole('button',{name:'Buat ulang Invois',exact:true}).click();
 await page.waitForFunction(async base=>!(await(await fetch(base+'/pengajuan')).json()).stale.length,base);
 await page.getByRole('link',{name:'Unduh PDF Invois',exact:true}).waitFor();
 const revision=await page.evaluate(async({base,originalVersion})=>{const get=async path=>{const r=await fetch(base+path);if(!r.ok)throw Error(await r.text());const b=await r.arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(n=>n.toString(16).padStart(2,'0')).join('')};return {latest:await get(document.querySelector('a[aria-label="Unduh PDF Invois"]').getAttribute('href').slice(base.length)),old:await get('/documents/invois/versions/'+originalVersion+'/file?format=pdf'),oldSource:await get('/documents/invois/versions/'+originalVersion+'/file'),latestSource:await get(document.querySelector('a[aria-label="Unduh PDF Invois"]').getAttribute('href').slice(base.length).split('?')[0])}},{base,originalVersion});
 console.log('REVISION_HASHES',JSON.stringify({originalVersion,baseline:pdfs.find(x=>x.kind==='invois'),revision}));
 assert(revision.latest!==pdfs.find(x=>x.kind==='invois').hash,'Updated invoice reused stale PDF');assert(revision.oldSource===pdfs.find(x=>x.kind==='invois').sourceHash,'Archived source changed');assert(revision.latestSource!==revision.oldSource,'New source reused old data');console.log('REGENERATE_ARCHIVE',JSON.stringify(revision));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'output/pr37/mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');await page.setViewportSize({width:1440,height:1000});
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'Unduh PDF Invois',exact:true}).click();const d=await download;await d.saveAs('output/pr37/invoice.pdf');console.log('DOWNLOAD',d.suggestedFilename());
 const pdfTab=await browser.newPage({viewport:{width:1100,height:1400}});await pdfTab.goto('file:///'+process.cwd().replaceAll('\\','/')+'/output/pr37/invoice.pdf');await pdfTab.waitForTimeout(4000);await pdfTab.screenshot({path:'output/pr37/invoice-visible.png'});await pdfTab.close();
 for(const[kind,label]of[['pks','PKS'],['permohonan','Surat permohonan'],['kuitansi','Kuitansi']]){const waiting=page.waitForEvent('download');await page.getByRole('link',{name:'Unduh PDF '+label,exact:true}).click();const file=await waiting;await file.saveAs('output/pr37/'+kind+'.pdf');const preview=await browser.newPage({viewport:{width:1100,height:1400}});await preview.goto('file:///'+process.cwd().replaceAll('\\','/')+'/output/pr37/'+kind+'.pdf');await preview.waitForTimeout(2000);await preview.screenshot({path:'output/pr37/'+kind+'-visible.png'});if(kind==='pks'){await preview.mouse.move(750,650);await preview.mouse.wheel(0,1000000);await preview.waitForTimeout(1000);await preview.screenshot({path:'output/pr37/pks-last-page.png'})}await preview.close()}

 await page.getByRole('button',{name:'Ajukan untuk diperiksa',exact:true}).click();await page.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.status==='menunggu',base);
 assert(await page.locator('section[aria-label="Dokumen otomatis"] input[type=checkbox]:enabled').count()===0,'Locked checklists enabled');
 const blocked=await page.evaluate(async base=>{const r=await fetch(base+'/pengajuan',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({fields:{nomorInvois:'FORBIDDEN'}})});return r.status},base);assert(blocked===400,'Server unlocked submitted data');
 console.log('RESULT',JSON.stringify({automaticPdf:true,download:true,regenerate:true,archiveStable:true,mobile:true,lockedChecklist:true,serverLock:true,errors}));assert(!errors.length,'Browser errors');
}catch(e){console.error(e);await fs.mkdir('output/pr37',{recursive:true});await page.screenshot({path:'output/pr37/failure.png',fullPage:true});process.exitCode=1}
finally{await browser.close()}
