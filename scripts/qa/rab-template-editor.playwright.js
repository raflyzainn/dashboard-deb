// Jalankan melalui tool Playwright pada worktree dummy khusus port 5297.
// Prasyarat: login kampus dengan RAB kosong. Menyimpan draf QA di browser ini saja.
async page => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 assert(new URL(page.url()).origin==='http://127.0.0.1:5297','Gunakan server dummy worktree 5297.');
 await page.goto('http://127.0.0.1:5297/campus/pencairan?butir=rab_penuh&rabStep=upload');
 await page.getByRole('button',{name:'Tambah item',exact:true}).waitFor();
 const name=page.getByRole('textbox',{name:'Nama baris 1',exact:true});
 const resumed=await name.inputValue()==='Panel tambahan QA'&&await page.getByRole('textbox',{name:/^Nama baris /}).count()===1;
 assert(resumed||await name.inputValue()==='','QA memerlukan kampus kosong atau satu baris QA sebelumnya.');
 const fixture=await page.evaluate(async()=>{
  const X=await import('/node_modules/.vite/deps/xlsx.js');
  const Zip=(await import('/node_modules/.vite/deps/pizzip.js')).default;
  const {readExcel}=await import('/mockups/rab/model.ts');
  const bytes=await(await fetch('/templat/Template_RAB_DEB.xlsx')).arrayBuffer(),zip=new Zip(bytes);
  if(!/activeTab="0"/.test(zip.file('xl/workbook.xml').asText()))throw Error('Petunjuk belum menjadi lembar pembuka.');
  if(!zip.file('xl/worksheets/sheet2.xml').asText().includes('type="whole"'))throw Error('Validasi Excel belum bilangan bulat.');
  if(zip.file('xl/styles.xml').asText().includes('#,##0.00'))throw Error('Template masih menampilkan desimal.');
  const book=X.read(bytes,{type:'array'});
  if(book.SheetNames.join('|')!=='Petunjuk|RAB 100%|Contoh Pengisian|Ringkasan')throw Error('Lembar template tidak lengkap.');
  let rejected=false;try{await readExcel(new File([bytes],'kosong.xlsx'));}catch{rejected=true;}
  if(!rejected)throw Error('Template kosong mengimpor lembar contoh.');
  const data=X.write({SheetNames:['RAB 100%'],Sheets:{'RAB 100%':book.Sheets['Contoh Pengisian']}},{type:'array',bookType:'xlsx'});
  const items=await readExcel(new File([data],'contoh.xlsx'));
  if(items.length!==8||items.reduce((s,i)=>s+i.amountSen,0)!==1258500000||items[0].volume!==50)throw Error('Qty × Volume × harga tidak sesuai.');
  const old=await readExcel(new File([await(await fetch('/contoh-rab/01_RAB_10_Unit.xlsx')).arrayBuffer()],'lama.xlsx'));
  if(old.length!==4)throw Error('Format Excel lama tidak diterima.');
  const malformed=X.utils.aoa_to_sheet([['Kategori','Sub Kategori','Nama','Qty','Satuan','Volume','Satuan Volume','Harga Satuan','Total Harga'],['A','B','Item',-1,'unit',1,'kali',1000,9999]]);
  rejected=false;try{await readExcel(new File([X.write({SheetNames:['RAB 100%'],Sheets:{'RAB 100%':malformed}},{type:'array',bookType:'xlsx'})],'invalid.xlsx'));}catch{rejected=true;}
  if(!rejected)throw Error('Qty negatif diterima.');
  const {readRabRows}=await import('/mockups/rab/model.ts');
  const header=['Kategori','Sub Kategori','Nama','Qty','Satuan','Volume','Satuan Volume','Harga Satuan','Total Harga'];
  for(const col of [3,5,7]){const row=['A','B','Pecahan',1,'unit',1,'kali',1000];row[col]=1.5;let rejected=false;try{readRabRows([header,row]);}catch{rejected=true;}if(!rejected)throw Error('Pecahan diterima pada kolom '+col);}
  return Array.from(new Uint8Array(data));
 });
 if(!resumed){
 await page.evaluate(()=>{
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
  window.__rabRestore=()=>Object.defineProperty(IDBTransaction.prototype,'oncomplete',descriptor);
  let delay=true;
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{...descriptor,set(fn){
   if(delay&&typeof fn==='function'){delay=false;descriptor.set.call(this,function(e){setTimeout(()=>fn.call(this,e),1800);});}
   else descriptor.set.call(this,fn);
  }});
 });
 await name.fill('Snapshot autosave pertama');
 await page.getByText('Menyimpan draf\u2026',{exact:true}).waitFor();
 assert(!await name.isDisabled(),'Kolom terkunci saat autosave.');
 await name.fill('Draf belum lengkap QA');
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.evaluate(()=>window.__rabRestore());
 await page.reload();await name.waitFor();
 assert(await name.inputValue()==='Draf belum lengkap QA','Autosave menghilangkan baris belum lengkap.');
 await page.getByRole('button',{name:'Periksa RAB 100%',exact:true}).click();
 await page.getByRole('region',{name:'Tabel input RAB',exact:true}).getByRole('alert').waitFor();
 assert(new URL(page.url()).searchParams.get('rabStep')==='upload','Baris belum lengkap dapat diteruskan.');
 for(const [field,value] of [['Kategori','Bantuan Program'],['Sub Kategori','Tambahan'],['Nama','Panel tambahan QA'],['Satuan','unit']])await page.getByRole('textbox',{name:field+' baris 1',exact:true}).fill(value);
 await page.getByRole('spinbutton',{name:'Harga Satuan baris 1',exact:true}).fill('7415000');
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 }
 await page.reload();await name.waitFor();assert(await name.inputValue()==='Panel tambahan QA','Draf manual hilang setelah reload.');
 const file={name:'Contoh_Pengisian_QA.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixture)};
 await page.getByLabel('Tambah item dari Excel',{exact:true}).setInputFiles(file);
 await page.getByRole('textbox',{name:'Nama baris 9',exact:true}).waitFor();
 assert(await name.inputValue()==='Panel tambahan QA','Upload menimpa item lama.');
 assert(await page.getByRole('spinbutton',{name:'Qty baris 2',exact:true}).inputValue()==='25','Qty template hilang.');
 assert(await page.getByRole('spinbutton',{name:'Volume baris 2',exact:true}).inputValue()==='2','Volume template hilang.');
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.reload();await name.waitFor();
 assert(await page.getByRole('textbox',{name:/^Nama baris /}).count()===9,'Gabungan sembilan item tidak tersimpan.');
 await page.getByRole('button',{name:'Periksa RAB 100%',exact:true}).click();
 await page.getByRole('button',{name:'Lanjut',exact:true}).click();
 await page.getByRole('region',{name:'Pembagian jumlah item RAB',exact:true}).waitFor();
 const input=page.getByRole('spinbutton',{name:'Jumlah Tahap 1: Panel tambahan QA',exact:true});
 const row=page.getByRole('row').filter({has:input});
 for(const value of ['-1','2','0.5']){await input.fill(value);assert(await input.getAttribute('aria-invalid')==='true','Pembagian invalid diterima: '+value);assert(await page.getByRole('button',{name:'Lanjut',exact:true}).isDisabled(),'Lanjut aktif saat invalid.');}
 await page.getByRole('button',{name:'Semua ke Tahap 2: Panel tambahan QA',exact:true}).click();
 assert(await input.inputValue()==='0','Semua T2 gagal.');
 assert((await row.innerText()).includes('1 unit'),'Sisa Termin 2 salah.');
 const pager=page.getByRole('navigation',{name:'Halaman item RAB bawah',exact:true});
 for(let p=0;p<2;p++){
  const names=await page.getByRole('region',{name:'Pembagian jumlah item RAB',exact:true}).getByRole('spinbutton').evaluateAll(xs=>xs.map(x=>x.getAttribute('aria-label')));
  for(const name of names)await page.getByRole('spinbutton',{name,exact:true}).fill('0');
  if(p===0){await pager.getByRole('button',{name:'Berikutnya',exact:true}).click();await pager.getByText(/Halaman 2 dari 2/).waitFor();}
 }
 await pager.getByRole('button',{name:'Sebelumnya',exact:true}).click();
 await input.fill('1');
 await page.getByRole('button',{name:'Lanjut',exact:true}).click();
 await page.waitForURL('**rabStep=term2');
 await page.getByRole('button',{name:'Kembali',exact:true}).click();
 await input.waitFor();assert(await input.inputValue()==='1','Pembagian tidak tersimpan.');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Halaman melebar pada mobile.');
 await page.setViewportSize({width:1366,height:900});
 await page.getByRole('button',{name:'1. Isi / unggah RAB',exact:true}).click();
 await name.fill('Perubahan autosave');
 await page.getByRole('button',{name:/^Data Program/}).click();
 await page.waitForURL('**butir=program');
 assert(await page.getByRole('dialog').count()===0,'Pindah halaman masih meminta simpan manual.');
 await page.goto('http://127.0.0.1:5297/campus/pencairan?butir=rab_penuh&rabStep=upload');await name.waitFor();
 assert(await name.inputValue()==='Perubahan autosave','Pindah halaman menghilangkan perubahan terbaru.');
 await name.fill('Panel tambahan QA');
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.getByLabel('Tambah item dari Excel',{exact:true}).setInputFiles(file);
 await page.getByRole('textbox',{name:'Nama baris 17',exact:true}).waitFor();
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Periksa RAB 100%',exact:true}).click();
 await page.getByRole('button',{name:'Edit item / tambah Excel',exact:true}).click();
 const preserved=await page.evaluate(async()=>{const {transaction}=await import('/src/lib/data/demo/store.ts');return transaction(s=>{const v=s.fullDummy.campuses['campus-016'].versions.at(-1);return {count:v.lines.filter(l=>l.level===4).length,total:v.totalSen,term1:v.term1Sen,quantity:v.lines.find(l=>l.level===4).flags.term1Volume};});});
 assert(preserved.count===17&&preserved.total===3258500000&&preserved.term1===741500000&&preserved.quantity===1,'Upload kedua menimpa item atau pembagian lama.');
 const names=await page.getByRole('textbox',{name:/^Nama baris /}).evaluateAll(xs=>xs.map(x=>x.value));
 const duplicates=names.map((name,i)=>names.indexOf(name)<i?i+1:0).filter(Boolean).reverse();
 for(const i of duplicates)await page.getByRole('button',{name:`Hapus item baris ${i}`,exact:true}).click();
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 assert(await page.getByRole('textbox',{name:/^Nama baris /}).count()===9,'Hapus duplikat tidak mempertahankan sembilan item awal.');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Tabel input melebar pada mobile.');
 await page.setViewportSize({width:1366,height:900});
 const engineChecks=await page.evaluate(async()=>{
  const {transaction}=await import('/src/lib/data/demo/store.ts');
  const {createEngine}=await import('/src/lib/pengajuan/engine.ts');
  let state=await transaction(s=>structuredClone(s)),role='campus';
  const id='campus-016',record=state.fullDummy.campuses[id];
  record.versions=[];record.journey.status='draf';record.payment.paidAt='';delete record.journey.rabDraft;record.journey.rabDraftRevision=0;
  const engine=createEngine(async()=>({id:'qa',role,campusId:id,name:'QA'}),{transaction:async(fn,write)=>{const copy=structuredClone(state);const result=fn(copy);if(write)state=copy;return result;},origin:location.origin,amountSen:2000000000,id:()=>crypto.randomUUID()});
  const path='/api/pencairan/'+id+'/rab/items';
  const rows=[['A','A','Sama',10,'unit',1,'kali',1000],['B','B','Sama',10,'unit',1,'kali',1000]];
  let response=await engine.request(path,'POST',{sourceVersion:'',rows,lineIds:['','']}),v=response.version;
  await engine.request('/api/pencairan/'+id+'/rab/versions/'+v.id+'/allocation','PATCH',{quantities:{i0:3,i1:7}});
  response=await engine.request(path,'POST',{sourceVersion:v.id,rows:[...rows,['A','A','Sama',10,'unit',1,'kali',1000]],lineIds:['i0','i1','']});v=response.version;
  const leaves=v.lines.filter(l=>l.level===4);
  if(leaves.find(l=>l.id==='i0').flags.term1Volume!==3||leaves.find(l=>l.id==='i1').flags.term1Volume!==7||leaves.find(l=>l.id==='i2').flags.term1Volume!==undefined)throw Error('Alokasi tertukar saat kategori diurutkan.');
  const base={sourceVersion:v.id,rows:rows.slice(0,1),lineIds:['i0']};let checks=0;
  const rejected=async body=>{let failed=false;try{await engine.request(path,'POST',body);}catch{failed=true;}if(!failed)throw Error('Input terlarang diterima.');checks++;};
  await rejected({...base,sourceVersion:'old-version'});
  await rejected({...base,rows:Array(501).fill(rows[0]),lineIds:Array(501).fill('')});
  await rejected({...base,rows:[['A','A','Invalid',-1,'unit',1,'kali',1000]]});
  state.fullDummy.campuses[id].journey.status='menunggu';await rejected(base);
  state.fullDummy.campuses[id].journey.status='draf';state.fullDummy.campuses[id].payment.paidAt='2026-10-06';await rejected(base);
  state.fullDummy.campuses[id].payment.paidAt='';role='admin';await rejected(base);
  role='campus';const rev=state.fullDummy.campuses[id].journey.rabDraftRevision;
  const draft={...base,draft:true,itemDraftRevision:rev,rows:[['','','Sebagian',null,'',1,'kali',null]],lineIds:['']};
  const count=state.fullDummy.campuses[id].versions.length;
  await engine.request(path,'POST',draft);await rejected(draft);
  if(state.fullDummy.campuses[id].versions.length!==count)throw Error('Autosave membuat versi pada setiap ketikan.');
  let blocked=false;try{await engine.request('/api/pencairan/'+id+'/rab/versions/'+v.id+'/progress','POST',{step:2});}catch{blocked=true;}
  if(!blocked)throw Error('Draf item belum diperiksa dapat melewati validasi.');
  return {reorderedAllocationPreserved:true,rejections:checks,noPersistentWrites:true};
 });
 // Simulasikan kegagalan penyimpanan hanya untuk data QA ini, lalu coba lagi lewat UI.
 await page.evaluate(()=>{
  window.__rabQaPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){
   if(value?.fullDummy?.campuses?.['campus-016']?.journey?.rabDraft?.rows?.[0]?.[2]==='Gagal simpan QA')throw Error('Penyimpanan QA sementara tidak tersedia.');
   return window.__rabQaPut.call(this,value,...args);
  };
 });
 try{
  await name.fill('Gagal simpan QA');
  await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).waitFor();
  await page.getByText('Tindakan belum berhasil',{exact:true}).waitFor();
  assert(await name.inputValue()==='Gagal simpan QA','Kegagalan menghapus isian.');
 }finally{await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__rabQaPut;delete window.__rabQaPut;});}
 await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).click();
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.reload();await name.waitFor();assert(await name.inputValue()==='Gagal simpan QA','Coba lagi tidak menyimpan data.');
 // Menghapus semua baris juga merupakan draf yang harus bertahan setelah reload.
 const rowCount=await page.getByRole('textbox',{name:/^Nama baris /}).count();
 for(let i=rowCount;i>0;i--)await page.getByRole('button',{name:`Hapus item baris ${i}`,exact:true}).click();
 await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Tambah item',exact:true}).waitFor();
 assert(await page.getByRole('textbox',{name:/^Nama baris /}).count()===0,'Baris yang dihapus muncul lagi.');
 return {typingDuringAutosave:true,integerOnly:true,incompleteAutosave:true,successSnackbar:true,failureSnackbar:true,retryPreservesInput:true,emptyDraftPersisted:true,templateGuideFirst:true,exampleEightItems:true,legacyAccepted:true,invalidRejected:true,manualDraftPersisted:true,appendPreservesItems:true,quantityFactorsPersisted:true,compactTable:true,allocationPersisted:true,mobile:true,navigationAutosave:true,duplicateAppend:true,oldAllocationPreserved:true,removeItem:true,engineChecks};
}
