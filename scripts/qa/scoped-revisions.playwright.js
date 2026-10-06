// Run only through the Playwright tool after --seed-qa3; remove QA with --delete-qa afterwards.
// Real local API checks plus campus/admin UI. Never uses a real campus or remote database.
async page => {
 const origin='http://127.0.0.1:5176',base='/api/pencairan/32859b9c98494e7',contexts=[];
 if(new URL(page.url()).origin!==origin)throw Error('Use local port 5176.');
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const login=async key=>{const context=await page.context().browser().newContext();contexts.push(context);const p=await context.newPage();await p.goto(origin+'/login');await p.getByRole('combobox').selectOption(key);await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/*/dashboard');return p;};
 try {
  const campus=await login('campus-904'),admin=await login('admin-1');
  const view=()=>campus.evaluate(async base=>await(await fetch(base+'/pengajuan')).json(),base);
  const call=(p,path,body={},method='POST')=>p.evaluate(async({base,path,body,method})=>{
   const j=await(await fetch(base+'/pengajuan')).json();const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify({...body,revision:j.journey.revision,expectedRevision:j.serverRevision})});return {status:response.status,value:await response.json()};
  },{base,path,body,method});
  const ok=async promise=>{const result=await promise;assert(result.status===200,JSON.stringify(result));return result.value;};
  const generate=async()=>{for(const kind of (await view()).stale)await ok(call(campus,'/pengajuan/dokumen/'+kind));};
  let initial=await view();assert(initial.campus.name==='Kampus QA Lokal 3','Temporary QA campus only');
  assert(initial.journey.status==='draf'&&!initial.journey.history.length,'Seed a fresh QA campus');
  await ok(call(admin,'/pengajuan/pf',{nomorPksPf:'PF/QA/2026'},'PATCH'));
  await ok(call(campus,'/pengajuan',{fields:{judulProgram:'Program QA Revisi',alamat:'Alamat kampus QA',mentor:'Mentor QA',koordinator:'Koordinator QA',lokasiProvinsiId:'31',lokasiProvinsi:'Daerah Khusus Ibukota Jakarta',lokasiKabupatenId:'31.74',kabupaten:'Kota Administrasi Jakarta Selatan',lokasiKecamatanId:'31.74.01',kecamatan:'Tebet',lokasiDesaId:'31.74.01.1001',desa:'Tebet Timur',lokasiKodePos:'12820',lokasiAlamatLengkap:'Tebet Timur, Jakarta Selatan',namaBank:'Bank QA',nomorRekening:'1234567890',namaPemilik:'Kampus QA Lokal 3',penandatanganNama:'Perwakilan QA',penandatanganJabatan:'Dosen',tempatTandaTangan:'Jakarta',nomorSuratPermohonan:'QA/P/1',tanggalSuratPermohonan:'2026-10-01',nomorInvois:'QA/I/1',tanggalInvois:'2026-10-01',nomorKuitansi:'QA/K/1',tanggalKuitansi:'2026-10-01',nomorPksKampus:'QA/PKS/1'}},'PATCH'));
  const prepared=await campus.evaluate(async base=>{
   const upload=async(path,file,extra={})=>{const j=await(await fetch(base+'/pengajuan')).json();const body=new FormData();body.set('file',file);body.set('expectedRevision',String(j.serverRevision));for(const [key,value] of Object.entries(extra))body.set(key,value);const response=await fetch(base+path,{method:'POST',body});if(!response.ok)throw Error(await response.text());return response.json();};
   const Excel=(await import('/node_modules/.vite/deps/exceljs.js')).default;
   const {buildRabWorkbook}=await import('/src/lib/rab-excel.ts');
   const wb=buildRabWorkbook(Excel,{title:'RAB QA',university:'Kampus QA Lokal 3',village:'Desa QA',penuh:[{no:'A',uraian:'Energi QA'},{no:'A.1',uraian:'Kegiatan QA'},{no:'A.1.a',uraian:'Peralatan QA'},{no:'A.1.a.1',uraian:'Panel QA',volume:10,satuan:'unit',hargaSatuan:2000000,jumlah:20000000}],tahap1:[],tahap2:[]});
   await upload('/rab/import',new File([await wb.xlsx.writeBuffer()],'RAB-QA.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
   for(const [slot,path] of [['rekening','/sk-dummy.pdf'],['kop','/logo-pf.png']]){const blob=await(await fetch(path)).blob();await upload('/pengajuan/upload',new File([blob],slot+(slot==='kop'?'.png':'.pdf'),{type:slot==='kop'?'image/png':'application/pdf'}),{slot});}
   return (await(await fetch(base+'/rab')).json()).version;
  },base);
  await ok(call(campus,'/rab/versions/'+prepared.id+'/allocation',{quantities:Object.fromEntries(prepared.lines.filter(l=>l.level===4).map(l=>[l.id,6]))},'PATCH'));
  for(const step of [2,3])await ok(call(campus,'/rab/versions/'+prepared.id+'/progress',{step}));
  await generate();await ok(call(campus,'/pengajuan/submit'));
  for(const kind of ['rab_penuh','rab','rab_tahap2','permohonan','invois','kuitansi','rekening'])await ok(call(admin,'/documents/'+kind+'/review',{decision:'sesuai',...(kind==='rekening'?{bank:{result:'sesuai',nameSeen:'Kampus QA Lokal 3'}}:{})}));
  // Admin selects the source of the error in the actual review UI.
  await admin.goto(origin+'/admin/pencairan/32859b9c98494e7?butir=program');
  assert(await admin.getByRole('checkbox').count()===0,'Revision must not require choosing individual fields');
  await admin.getByLabel('Catatan revisi Data Program',{exact:true}).fill('QA: perbaiki alamat di Data Program.');
  await admin.getByRole('button',{name:'Minta revisi Data Program',exact:true}).click();
  await admin.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.status==='revisi',base);
  let revised=await view();assert(revised.stale.join(',')==='pks','Only PKS must need regeneration');
  const preserved=Object.fromEntries(revised.documents.filter(d=>['permohonan','invois','kuitansi','rekening'].includes(d.kind)).map(d=>[d.kind,d.versions.at(-1).id]));
  assert((await call(campus,'/pengajuan',{fields:{namaBank:'Forbidden'}},'PATCH')).status===400,'Backend must reject unrelated fields');
  assert((await call(campus,'/rab/versions/'+prepared.id+'/allocation',{quantities:{}},'PATCH')).status===400,'Backend must reject unrelated RAB writes');
  assert((await call(campus,'/pengajuan/dokumen/invois')).status===400,'Backend must reject rebuilding unrelated documents');
  assert((await call(campus,'/pengajuan/submit')).status===400,'Unchanged revision must not submit');
  const blockedUpload=await campus.evaluate(async base=>{const j=await(await fetch(base+'/pengajuan')).json();const body=new FormData();body.set('slot','rekening');body.set('expectedRevision',String(j.serverRevision));body.set('file',new File([await(await fetch('/sk-dummy.pdf')).blob()],'QA.pdf',{type:'application/pdf'}));return (await fetch(base+'/pengajuan/upload',{method:'POST',body})).status;},base);
  assert(blockedUpload===400,'Data Program revision must not allow evidence uploads');
  await campus.goto(origin+'/campus/pencairan?butir=program');
  assert(await campus.getByRole('textbox',{name:'Nama kegiatan / program',exact:false}).isEnabled(),'All program fields must be editable');
  assert(await campus.getByRole('textbox',{name:'Alamat kampus',exact:false}).isEnabled(),'The whole Data Program section must open');
  assert(await campus.getByRole('button',{name:/^Administrasi.*Terkunci/}).isDisabled(),'Other sections cannot open');
  await campus.goto(origin+'/campus/pencairan?butir=administrasi');await campus.waitForURL('**butir=program');
  const address=campus.getByRole('textbox',{name:'Alamat lengkap lokasi program',exact:false});await address.fill('Jl. QA Baru, Tebet Timur, Jakarta Selatan');
  await campus.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.fields.lokasiAlamatLengkap.startsWith('Jl. QA Baru'),base);
  await campus.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
  await campus.reload();await address.waitFor();assert((await address.inputValue()).startsWith('Jl. QA Baru'),'Revision must survive reload');
  await campus.getByRole('button',{name:'Kirim perbaikan',exact:true}).click();
  await campus.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.status==='menunggu',base);
  await campus.getByText('Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.',{exact:true}).waitFor();
  const sent=await view();for(const [kind,id] of Object.entries(preserved)){const doc=sent.documents.find(d=>d.kind===kind);assert(doc.status==='sesuai'&&doc.versions.at(-1).id===id,'Unrelated approval/version must survive: '+kind);}
  assert((await call(campus,'/pengajuan',{fields:{lokasiAlamatLengkap:'Forbidden after submit'}},'PATCH')).status===400,'Submitted repairs must relock');
  await ok(call(admin,'/documents/pks/review',{decision:'sesuai'}));assert((await view()).journey.status==='selesai','Repaired packet must finish without reapproving unrelated items');
  // A second round can contain more than one request, without losing the first scope.
  await ok(call(admin,'/documents/invois/review',{decision:'perlu_revisi',note:'QA nomor invoice',section:'administrasi'}));
  await ok(call(admin,'/documents/rekening/review',{decision:'perlu_revisi',note:'QA bukti rekening',section:'administrasi',bank:{result:'berbeda',nameSeen:'Kampus QA Lokal 3'}}));
  revised=await view();assert(revised.journey.revisionRequests.filter(r=>r.status==='open').length===2,'Multiple revision scopes must remain open');
  assert(revised.stale.join(',')==='invois','Evidence-only revision must not invalidate other letters');
  await campus.goto(origin+'/campus/pencairan?butir=administrasi');
  assert(await campus.getByRole('textbox',{name:'Nama bank',exact:false}).isEnabled(),'Whole Administrasi section must open');
  assert(await campus.getByRole('textbox',{name:'Nomor invoice',exact:false}).isEnabled(),'Requested invoice is editable');
  assert(await campus.getByLabel('Bukti rekening',{exact:true}).isEnabled(),'Requested evidence is editable');
  assert(await campus.getByLabel('Kop surat kampus',{exact:true}).isEnabled(),'Letterhead belongs to Administrasi');
  const uploaded=await campus.evaluate(async base=>{
   const upload=async slot=>{const j=await(await fetch(base+'/pengajuan')).json();const body=new FormData();body.set('slot',slot);body.set('expectedRevision',String(j.serverRevision));body.set('file',new File([await(await fetch('/sk-dummy.pdf')).blob()],'Bukti-QA.pdf',{type:'application/pdf'}));return (await fetch(base+'/pengajuan/upload',{method:'POST',body})).status;};
   return {allowed:await upload('rekening')};
  },base);
  assert(uploaded.allowed===200,'Upload within revised section must succeed');
  assert((await call(campus,'/pengajuan',{fields:{judulProgram:'Forbidden'}},'PATCH')).status===400,'Administrasi revision must not open Data Program');
  await ok(call(campus,'/pengajuan',{fields:{nomorInvois:'QA/I/2'}},'PATCH'));await generate();await ok(call(campus,'/pengajuan/submit'));
  await ok(call(admin,'/documents/invois/review',{decision:'sesuai'}));await ok(call(admin,'/documents/rekening/review',{decision:'sesuai',bank:{result:'sesuai',nameSeen:'Kampus QA Lokal 3'}}));
  assert((await view()).journey.status==='selesai','Multiple requests must finish');
  await ok(call(admin,'/rab/keputusan',{decision:'perlu_revisi',note:'QA ubah pembagian RAB',section:'rab'}));
  assert((await call(campus,'/pengajuan',{fields:{nomorInvois:'Forbidden'}},'PATCH')).status===400,'RAB revision must not open invoice');
  const rab=await campus.evaluate(async base=>(await(await fetch(base+'/rab')).json()).version,base);
  await ok(call(campus,'/rab/versions/'+rab.id+'/allocation',{quantities:Object.fromEntries(rab.lines.filter(l=>l.level===4).map(l=>[l.id,5]))},'PATCH'));
  assert((await view()).stale.length===4,'RAB amounts affect all four letters');await generate();await ok(call(campus,'/pengajuan/submit'));
  for(const kind of ['rab_penuh','rab','rab_tahap2','pks','permohonan','invois','kuitansi'])await ok(call(admin,'/documents/'+kind+'/review',{decision:'sesuai'}));
  assert((await view()).journey.status==='selesai','RAB revision round must finish');
  // A signed, unaffected document must remain usable when another section is revised.
  await campus.evaluate(async base=>{for(const kind of ['pks','permohonan','invois','kuitansi']){const j=await(await fetch(base+'/pengajuan')).json();const body=new FormData();body.set('signed','true');body.set('expectedRevision',String(j.serverRevision));body.set('file',new File([await(await fetch('/sk-dummy.pdf')).blob()],'Tanda-tangan-QA.pdf',{type:'application/pdf'}));const r=await fetch(base+'/documents/'+kind+'/versions',{method:'POST',body});if(!r.ok)throw Error(await r.text());}},base);
  await ok(call(admin,'/documents/pks/review',{decision:'perlu_revisi',section:'program',note:'QA Data Program'}));
  assert((await view()).stale.join(',')==='pks','Unrelated signed documents must not become stale');
  await ok(call(admin,'/documents/pks/review',{decision:'perlu_revisi',section:'pks',note:'QA PKS'}));
  assert((await view()).journey.revisionRequests.filter(r=>r.status==='open').length===2,'Data Program and PKS requests must coexist');
  assert((await call(admin,'/documents/pks/review',{decision:'batal'})).status===400,'Cannot silently cancel an open revision');
  await campus.goto(origin+'/campus/pencairan?butir=sk&signed=1');await campus.waitForURL('**butir=program');
  assert(await campus.getByRole('textbox',{name:'Nama kegiatan / program',exact:false}).isEnabled(),'Signed URL must not bypass revision navigation');
  await ok(call(campus,'/pengajuan',{fields:{lokasiAlamatLengkap:'Alamat QA diperbaiki lagi',nomorPksKampus:'QA/PKS/2'}},'PATCH'));await generate();await ok(call(campus,'/pengajuan/submit'));await ok(call(admin,'/documents/pks/review',{decision:'sesuai'}));
  await ok(call(admin,'/documents/invois/review',{decision:'perlu_revisi',note:'QA Administrasi rekening kuasa'}));
  await ok(call(campus,'/pengajuan',{fields:{jenisRekening:'kuasa',namaBank:'Bank QA Baru',namaPemilik:'Penerima QA',pemberiKuasa:'Perwakilan QA',penerimaKuasa:'Penerima QA',tanggalKuasa:'2026-10-01'}},'PATCH'));
  const bankChanged=await view();assert(!bankChanged.journey.files.rekening&&bankChanged.documents.find(d=>d.kind==='rekening').status!=='sesuai','Changing bank identity must invalidate old evidence approval');
  await campus.evaluate(async base=>{for(const slot of ['rekening','kuasa']){const j=await(await fetch(base+'/pengajuan')).json();const body=new FormData();body.set('slot',slot);body.set('expectedRevision',String(j.serverRevision));body.set('file',new File([await(await fetch('/sk-dummy.pdf')).blob()],'QA-'+slot+'.pdf',{type:'application/pdf'}));const r=await fetch(base+'/pengajuan/upload',{method:'POST',body});if(!r.ok)throw Error(await r.text());}},base);
  await generate();await ok(call(campus,'/pengajuan/submit'));
  for(const d of (await view()).documents.filter(d=>d.status==='menunggu_review'))await ok(call(admin,'/documents/'+d.kind+'/review',{decision:'sesuai',...(d.kind==='rekening'?{bank:{result:'sesuai',nameSeen:'Penerima QA'}}:{})}));
  await ok(call(admin,'/documents/pks/review',{decision:'perlu_revisi',section:'program',note:'QA ubah nama program'}));
  await ok(call(campus,'/pengajuan',{fields:{judulProgram:'Program QA Revisi Nama'}},'PATCH'));
  await campus.goto(origin+'/campus/pencairan?butir=program');
  assert(await campus.getByRole('button',{name:/^Administrasi.*Terkunci/}).isDisabled(),'Dependent authorization must not unlock Administrasi');
  const savedUpload=campus.waitForResponse(r=>r.url().endsWith('/pengajuan/upload')&&r.request().method()==='POST');
  await campus.getByLabel('Surat kuasa terbaru',{exact:true}).setInputFiles('C:/Users/rafly/OneDrive/Desktop/magang/pertamina foundation/dashboard-deb/static/sk-dummy.pdf');assert((await savedUpload).status()===200,'Dependent signed authorization can be replaced within Data Program');
  await campus.getByRole('button',{name:'Kirim perbaikan',exact:true}).click();await campus.getByText('Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.',{exact:true}).waitFor();
  for(const d of (await view()).documents.filter(d=>d.status==='menunggu_review'))await ok(call(admin,'/documents/'+d.kind+'/review',{decision:'sesuai'}));
  assert((await view()).journey.status==='selesai','Program revision with dependent authorization must finish');
  return {wholeSectionUi:true,noFieldCheckboxes:true,lockedNavigation:true,backendGuards:true,selectiveRegeneration:true,preservedApprovals:true,resubmittedAndRelocked:true,multipleRequests:true,uploads:true,rabRoundtrip:true,signedDocuments:true,bankEvidence:true,dependentAuthorization:true,history:(await view()).journey.history.length};
 } finally {for(const context of contexts)await context.close();}
}
