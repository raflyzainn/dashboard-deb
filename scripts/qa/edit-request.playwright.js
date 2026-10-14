// Run only through the Playwright tool after --seed-qa3; remove QA with --delete-qa afterwards.
// Real local API checks plus campus/admin UI. Never uses a real campus or remote database.
async page => {
 const origin='http://127.0.0.1:5176',base='/api/pencairan/32859b9c98494e7',contexts=[],errors=[];
 if(new URL(page.url()).origin!==origin)throw Error('Use local port 5176.');
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const login=async key=>{const context=await page.context().browser().newContext();contexts.push(context);const p=await context.newPage();p.on('pageerror',error=>errors.push(error.message));await p.goto(origin+'/login');await p.getByRole('combobox').selectOption(key);await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/*/dashboard');return p;};
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
  // Requesting access must not mutate fields, document versions, or approvals.
  const before=await view();
  await campus.goto(origin+'/campus/pencairan?butir=program');
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).click();
  assert(await campus.getByRole('button',{name:'Kirim permintaan revisi',exact:true}).isDisabled(),'Empty reason must be blocked');
  await campus.getByLabel('Alasan pengajuan revisi').fill('QA: lokasi kegiatan berubah');
  await campus.getByRole('button',{name:'Kirim permintaan revisi',exact:true}).click();
  await campus.getByText('Menunggu persetujuan admin',{exact:true}).waitFor();
  let current=await view(),request=current.journey.editRequests.at(-1);
  assert(current.journey.status===before.journey.status&&JSON.stringify(current.journey.fields)===JSON.stringify(before.journey.fields),'Request must not open or change data');
  assert(JSON.stringify(current.documents)===JSON.stringify(before.documents),'Request must not invalidate documents');
  assert(await campus.getByRole('textbox',{name:'Alamat kampus',exact:false}).isDisabled(),'Pending section remains readonly');
  assert((await call(campus,'/pengajuan/edit-requests',{section:'program',reason:'Duplicate'})).status===400,'Duplicate pending request must fail');
  assert((await call(campus,'/pengajuan/edit-requests',{section:'sk',reason:'Invalid'})).status===400,'SK cannot be requested');
  assert((await call(campus,'/pengajuan/edit-requests',{section:'rab',reason:'  '})).status===400,'Blank reason must fail');
  assert((await call(campus,'/pengajuan/edit-requests',{section:'rab',reason:'x'.repeat(2001)})).status===400,'Oversized reason must fail');
  assert((await call(campus,'/pengajuan/edit-requests/'+request.id,{decision:'approved',note:''})).status===400,'Campus must not approve');
  assert((await call(admin,'/pengajuan/edit-requests/'+request.id,{decision:'rejected',note:''})).status===400,'Rejection must include a reason');
  await admin.goto(origin+'/admin/pencairan/32859b9c98494e7?butir=program');
  let decision=admin.getByRole('form',{name:'Keputusan revisi Data Program',exact:true});
  await decision.getByLabel('Catatan keputusan (wajib jika ditolak)').fill('QA: jelaskan lokasi baru');
  await decision.getByRole('button',{name:'Tolak permintaan',exact:true}).click();
  await admin.getByText('Keputusan permintaan revisi tersimpan.',{exact:true}).waitFor();
  await campus.reload();await campus.getByText('Permintaan revisi ditolak',{exact:true}).waitFor();
  assert(await campus.getByText('Catatan admin: QA: jelaskan lokasi baru',{exact:true}).isVisible(),'Rejection note must be visible');
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).click();
  await campus.getByLabel('Alasan pengajuan revisi').fill('QA: pindah ke Jalan QA 14');
  await campus.getByRole('button',{name:'Kirim permintaan revisi',exact:true}).click();
  await campus.getByText('Menunggu persetujuan admin',{exact:true}).waitFor();
  request=(await view()).journey.editRequests.at(-1);
  await admin.reload();decision=admin.getByRole('form',{name:'Keputusan revisi Data Program',exact:true});
  await decision.getByRole('button',{name:'Setujui akses edit',exact:true}).click();
  await admin.getByText('Keputusan permintaan revisi tersimpan.',{exact:true}).waitFor();
  assert((await call(admin,'/pengajuan/edit-requests/'+request.id,{decision:'approved',note:''})).status===400,'Decision must not be replayed');
  assert(JSON.stringify((await view()).documents)===JSON.stringify(before.documents),'Opening access must preserve document versions and approvals');
  await campus.reload();await campus.getByRole('button',{name:'Kirim perbaikan',exact:true}).waitFor();
  assert(await campus.getByRole('textbox',{name:'Alamat kampus',exact:false}).isEnabled(),'Approved whole section opens');
  await campus.getByRole('button',{name:/^Administrasi.*Hanya lihat/}).click();
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).waitFor();
  assert(await campus.getByRole('textbox',{name:'Nama bank',exact:false}).isDisabled(),'Other pages readable but locked');
  assert(await campus.locator('input[type=file]:enabled').count()===0,'Other page uploads disabled');
  assert(await campus.getByRole('button',{name:'Kirim perbaikan',exact:true}).count()===0,'Readonly section must not have submit edit');
  assert((await call(campus,'/pengajuan',{fields:{namaBank:'Forbidden'}},'PATCH')).status===400,'Backend keeps unrelated fields locked');
  assert((await call(campus,'/pengajuan/checklist',{key:'invois-0',checked:true},'PATCH')).status===400,'Unrelated checklist stays locked');
  // A second request can wait while Data Program is being revised.
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).click();
  await campus.getByLabel('Alasan pengajuan revisi').fill('QA: nomor invoice perlu diperiksa');
  await campus.getByRole('button',{name:'Kirim permintaan revisi',exact:true}).click();
  await campus.getByText('Menunggu persetujuan admin',{exact:true}).waitFor();
  for(const butir of ['sk','rab_penuh','pks','ringkasan']){
   await campus.goto(origin+'/campus/pencairan?butir='+butir);
   await campus.locator('[aria-label="Isi pengajuan"]').waitFor();
   assert(new URL(campus.url()).searchParams.get('butir')===butir,'Readonly deep link must stay open: '+butir);
  }
  await campus.goto(origin+'/campus/pencairan?butir=program');
  await campus.getByRole('textbox',{name:'Alamat lengkap lokasi program',exact:false}).fill('Jalan QA 14, Tebet Timur, Jakarta Selatan');
  await campus.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.fields.lokasiAlamatLengkap==='Jalan QA 14, Tebet Timur, Jakarta Selatan',base);
  await campus.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true}).waitFor();
  await campus.getByRole('button',{name:'Kirim perbaikan',exact:true}).click();
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).waitFor();
  current=await view();assert(current.journey.status==='menunggu','Submission relocks all sections');
  assert(await campus.getByRole('textbox',{name:'Alamat kampus',exact:false}).isDisabled(),'UI relocks after submission');
  assert((await call(campus,'/pengajuan',{fields:{alamat:'Forbidden'}},'PATCH')).status===400,'Server relocks after submission');
  assert(current.documents.filter(d=>['invois','permohonan','kuitansi','rekening'].includes(d.kind)).every(d=>d.status==='sesuai'),'Unrelated approvals remain');
  assert(current.journey.editRequests.filter(r=>r.section==='program').length===2,'History retains rejected and approved requests');
  // Approve the outstanding administration request and exercise a different scope.
  request=current.journey.editRequests.find(r=>r.section==='administrasi'&&r.status==='pending');
  await ok(call(admin,'/pengajuan/edit-requests/'+request.id,{decision:'approved',note:'QA: perbaiki administrasi'}));
  await ok(call(campus,'/pengajuan',{fields:{nomorKuitansi:'QA/K/14'}},'PATCH'));
  assert((await call(campus,'/pengajuan',{fields:{alamat:'Forbidden'}},'PATCH')).status===400,'Administrasi approval must not open Data Program');
  assert((await view()).stale.join(',')==='kuitansi','Receipt-only change must not invalidate invoice');
  await generate();await ok(call(campus,'/pengajuan/submit'));
  await ok(call(admin,'/documents/pks/review',{decision:'sesuai'}));
  await ok(call(admin,'/documents/kuitansi/review',{decision:'sesuai'}));
  assert((await view()).journey.status==='selesai','Review can finish after requested edits');
  await ok(call(campus,'/pengajuan/edit-requests',{section:'rab',reason:'QA: sesuaikan alokasi'}));
  request=(await view()).journey.editRequests.at(-1);
  await ok(call(admin,'/pengajuan/edit-requests/'+request.id,{decision:'approved',note:''}));
  const rab=await campus.evaluate(async base=>(await(await fetch(base+'/rab')).json()).version,base);
  await ok(call(campus,'/rab/versions/'+rab.id+'/allocation',{quantities:Object.fromEntries(rab.lines.filter(l=>l.level===4).map(l=>[l.id,5]))},'PATCH'));
  await generate();await ok(call(campus,'/pengajuan/submit'));
  for(const kind of ['rab_penuh','rab','rab_tahap2','pks','permohonan','invois','kuitansi'])await ok(call(admin,'/documents/'+kind+'/review',{decision:'sesuai'}));
  assert((await view()).journey.status==='selesai','RAB edit request roundtrip completes');
  // Changes that do not affect a letter still have a review path, without regenerating letters.
  await ok(call(campus,'/pengajuan/edit-requests',{section:'program',reason:'QA: perbarui kode pos'}));
  request=(await view()).journey.editRequests.at(-1);
  await ok(call(admin,'/pengajuan/edit-requests/'+request.id,{decision:'approved',note:''}));
  await ok(call(campus,'/pengajuan',{fields:{lokasiKodePos:'12821'}},'PATCH'));
  const metadataOnly=(await view()).stale.length===0;
  assert(metadataOnly,'Postal code correction with manual address must preserve all generated letters');
  const revisionCard=await campus.evaluate(async base=>(await(await fetch(base)).json()),base);
  assert(!revisionCard.readiness.lengkap&&revisionCard.readiness.state!=='siap_dibayar','Open revision must block payout readiness');
  const paymentAttempt=await call(admin,'/pembayaran',{paidAt:'2026-10-05',paidSen:1000000000,paidRef:'QA-MUST-NOT-PAY'},'PATCH');
  assert(paymentAttempt.status===400,'Payment must fail during revision');
  await generate();await ok(call(campus,'/pengajuan/submit'));
  assert((await call(admin,'/pembayaran',{paidAt:'2026-10-05',paidSen:1000000000,paidRef:'QA-MUST-NOT-PAY'},'PATCH')).status===400,'Payment must fail while awaiting review');
  if(metadataOnly){await admin.goto(origin+'/admin/pencairan/32859b9c98494e7?butir=program');await admin.getByRole('button',{name:'Setujui perbaikan data',exact:true}).click();await admin.getByText('Perbaikan data disetujui.',{exact:true}).waitFor();}
  else for(const doc of (await view()).documents.filter(d=>d.status==='menunggu_review'))await ok(call(admin,'/documents/'+doc.kind+'/review',{decision:'sesuai'}));
  assert((await view()).journey.status==='selesai','Metadata-only edit must have a completion path');
  const assessmentChecks=await campus.evaluate(async()=>{const {assess,KINDS}=await import('/src/lib/pencairan.ts');const statuses=Object.fromEntries(KINDS.map(kind=>[kind,'sesuai'])),input={suratKuasaRequired:false,redChecks:0,paidAt:'',originalsAll:true,lampiranCount:1};return {ready:assess(statuses,{...input,submissionStatus:'selesai'}).state,revisi:assess(statuses,{...input,submissionStatus:'revisi'}).state,menunggu:assess(statuses,{...input,submissionStatus:'menunggu'}).state};});
  assert(assessmentChecks.ready==='siap_dibayar'&&assessmentChecks.revisi==='menunggu_kampus'&&assessmentChecks.menunggu==='menunggu_admin','Complete documents must not bypass submission review');
  // A direct PF request for the same section must also settle the pending access request.
  await ok(call(campus,'/pengajuan/edit-requests',{section:'pks',reason:'QA: perbarui nomor PKS'}));
  await ok(call(admin,'/documents/pks/review',{decision:'perlu_revisi',note:'QA: silakan perbaiki PKS'}));
  assert((await view()).journey.editRequests.at(-1).status==='approved','Direct PF revision must settle matching pending request');
  await ok(call(campus,'/pengajuan',{fields:{nomorPksKampus:'QA/PKS/14'}},'PATCH'));await generate();await ok(call(campus,'/pengajuan/submit'));await ok(call(admin,'/documents/pks/review',{decision:'sesuai'}));
  await ok(call(admin,'/pengajuan/checklist',{key:'pks-0',checked:true},'PATCH'));
  assert((await call(campus,'/pengajuan/checklist',{key:'pks-0',checked:false},'PATCH')).status===400,'Campus readonly checklist rejects changes');
  await campus.setViewportSize({width:390,height:844});
  await campus.goto(origin+'/campus/pencairan?butir=pks');
  await campus.getByRole('button',{name:'Ajukan Revisi',exact:true}).click();
  assert(await campus.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile must not overflow');
  await campus.screenshot({path:'.local/edit-request-mobile.png',fullPage:true});
  assert(errors.length===0,errors.join('\n'));
  return {metadataOnly,consoleErrors:errors,readonlyNavigation:true,requestReason:true,rejection:true,approval:true,duplicatesBlocked:true,roleGuard:true,resubmitRelocks:true,otherApprovalsPreserved:true,administrationRoundtrip:true,rabRoundtrip:true,mobile:true};
 } finally {for(const context of contexts)await context.close();}
}
