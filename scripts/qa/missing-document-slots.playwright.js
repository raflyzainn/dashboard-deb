// Run through the Playwright browser tool, not the terminal.
// Prepare a local synthetic campus named qa-missing-slots-* with SK Rp1,000,000,
// a draft disbursement and zero/partial document slots. Sign in on a tab with
// ?qa_missing=<campus id>. Existing SK status and IDs must survive both writes.
async (page) => {
 const p=page.context().browser().contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('http://127.0.0.1:5176/')&&p.url().includes('qa_missing='));
 if(!p)throw Error('Open the isolated local QA campus first');
 const id=new URL(p.url()).searchParams.get('qa_missing');
 return p.evaluate(async id=>{
  const base='/api/pencairan/'+id;
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const view=async()=>{const r=await fetch(base+'/pengajuan');assert(r.ok,'Read failed');return r.json();};
  const before=await view();
  assert(before.campus.name.startsWith('qa-missing-slots-'),'Synthetic campus only');
  assert(before.journey.status==='draf'&&!before.paid,'Unpaid draft required');
  const send=async(path,body)=>fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const rab=await send('/rab/items',{rows:[['QA','QA','Barang',1,'unit',1,'paket',1000000]],lineIds:[''],sourceVersion:before.rab?.id||'',revision:before.journey.revision,expectedRevision:before.serverRevision});
  assert(rab.status===200,'RAB with missing slots: '+await rab.text());
  const current=await view();
  const stale=await send('/rab/items',{rows:[],lineIds:[],revision:before.journey.revision,expectedRevision:before.serverRevision});
  assert(stale.status===409,'Stale write must still be rejected');
  const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;
  canvas.getContext('2d').fillRect(0,0,200,100);
  const file=await new Promise(resolve=>canvas.toBlob(resolve));
  const form=new FormData();form.set('slot','rekening');form.set('file',file,'QA.png');form.set('expectedRevision',current.serverRevision);
  const upload=await fetch(base+'/pengajuan/upload',{method:'POST',body:form});
  assert(upload.status===200,'Upload with missing slots: '+await upload.text());
  const after=await view();
  assert(after.documents.length===10&&new Set(after.documents.map(d=>d.kind)).size===10,'Expected ten unique slots');
  assert(after.documents.find(d=>d.kind==='sk').status===before.documents.find(d=>d.kind==='sk').status,'Existing SK status changed');
  assert(after.journey.files.rekening.name==='QA.png','Uploaded file was not saved');
  return {rab:rab.status,upload:upload.status,stale:stale.status,slots:after.documents.length};
 },id);
}
