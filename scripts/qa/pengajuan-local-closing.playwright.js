// Jalankan dengan tool browser pada halaman admin kampus yang sudah dibayar di lokal.
async page => {
 const match=page.url().match(/127\.0\.0\.1:5176\/admin\/pencairan\/([a-z0-9]{15})/);
 if(!match)throw Error('Buka kartu admin kampus lokal yang sudah dibayar.');
 const base='/api/pencairan/'+match[1];
 return page.evaluate(async base=>{
  const get=async path=>{const r=await fetch(base+path);if(!r.ok)throw Error(path+': '+r.status);return r.json();};
  const card=await get(''),lampiran=await get('/lampiran');
  if(card.readiness.state!=='dibayar'||!card.disbursement.paidAt||card.lampiranCount<1)throw Error('Pembayaran/lampiran belum persisten.');
  for(const a of lampiran.attachments){const r=await fetch(base+'/lampiran/'+a.number);if(!r.ok||r.headers.get('content-type')!=='application/pdf'||(await r.blob()).size===0)throw Error('Lampiran tidak dapat diunduh.');}
  return {state:card.readiness.state,paidSen:card.disbursement.paidSen,attachments:lampiran.attachments.length};
 },base);
}
