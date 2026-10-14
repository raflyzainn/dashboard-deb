// Jalankan melalui tool Playwright; QA 3 lokal sudah memiliki RAB dan dokumen.
// Hanya mengubah kampus QA; bersihkan setelahnya dengan --delete-qa.
async page => {
 const origin='http://127.0.0.1:5176',base='/api/pencairan/32859b9c98494e7';
 const browser=page.context().browser(),contexts=[];
 const assert=(ok,text)=>{if(!ok)throw Error(text);};
 const login=async key=>{const c=await browser.newContext();contexts.push(c);const p=await c.newPage();await p.goto(origin+'/login');await p.locator(`option[value="${key}"]`).waitFor({state:'attached'});await p.getByRole('combobox').selectOption(key);await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/*/dashboard');return p;};
 try{
  const campus=await login('campus-904'),admin=await login('admin-1');
  const call=async(p,path,body,method='POST')=>p.evaluate(async({base,path,body,method})=>{
   const j=await(await fetch(base+'/pengajuan')).json();
   const response=await fetch(base+path,{method,headers:{'content-type':'application/json'},body:JSON.stringify({...body,expectedRevision:j.serverRevision})});
   return {status:response.status,value:await response.json()};
  },{base,path,body,method});
  const view=async()=>campus.evaluate(async base=>await(await fetch(base+'/pengajuan')).json(),base);
  const rebuild=async()=>{
   const j=await view();for(const k of j.stale)assert((await call(campus,'/pengajuan/dokumen/'+k,{})).status===200,'Dokumen gagal dibuat ulang');
   await campus.goto(origin+'/campus/pencairan?bagian=ringkasan&butir=ringkasan');
   await campus.getByRole('button',{name:'Ajukan untuk diperiksa',exact:true}).click();
   await campus.getByText('Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.',{exact:true}).waitFor();
  };
  assert((await view()).journey.status==='revisi','Prasyarat: QA 3 berada pada revisi PKS');
  await rebuild();
  assert((await call(admin,'/rab/keputusan',{decision:'perlu_revisi',note:'QA: ubah alokasi panel Termin 1.'})).status===200,'Revisi RAB gagal');
  const j=await view();assert(j.journey.status==='revisi'&&j.stale.length===4,'Dokumen harus dibuat ulang setelah revisi');
  assert((await call(campus,'/pengajuan/submit',{})).status===400,'Kirim tanpa revisi harus ditolak');
  const rab=await campus.evaluate(async base=>await(await fetch(base+'/rab')).json(),base);
  const leaves=rab.version.lines.filter(l=>l.level===4),quantities=Object.fromEntries(leaves.map(l=>[l.id,l.flags.term1Volume]));
  quantities[leaves[0].id]=quantities[leaves[0].id]===1?0:1;
  assert((await call(campus,'/rab/versions/'+rab.version.id+'/allocation',{quantities},'PATCH')).status===200,'Alokasi gagal disimpan');
  await rebuild();
  for(const kind of ['pks','rab_penuh','rab','rab_tahap2','permohonan','kuitansi','invois','rekening']){
   const body={decision:'sesuai',...(kind==='rekening'?{bank:{result:'sesuai',nameSeen:'Kampus QA Lokal 3'}}:{})};
   assert((await call(admin,'/documents/'+kind+'/review',body)).status===200,'Persetujuan gagal: '+kind);
  }
  assert((await view()).journey.status==='selesai','Paket tidak disetujui');
  assert((await call(admin,'/rab/keputusan',{decision:'batal'})).status===200,'Pembatalan RAB gagal');
  await admin.goto(origin+'/admin/pencairan/32859b9c98494e7?butir=rab');
  await admin.getByRole('button',{name:'Sesuai: jadikan nominal Tahap 1',exact:true}).click();
  await admin.waitForFunction(async base=>(await(await fetch(base+'/pengajuan')).json()).journey.status==='selesai',base);
  const final=await view();assert(final.journey.history.every((h,i)=>h.number===i+1),'Urutan riwayat salah');
  return {revisionResubmitted:true,unchangedRejected:true,rabWithdrawalReapproved:true,history:final.journey.history.length};
 }finally{for(const c of contexts)await c.close();}
}
