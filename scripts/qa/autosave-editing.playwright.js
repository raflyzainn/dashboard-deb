// Browser lokal, Data Program yang belum diajukan. Mengubah nama sementara lalu memulihkan.
async page => {
 if(!page.url().startsWith('http://127.0.0.1:5176/campus/pencairan'))throw Error('Hanya frontend lokal.');
 const field=page.getByLabel('Nama kegiatan / program',{exact:true});
 const original=await field.inputValue(),changed=(original+' QA sementara').trim();
 let entered;
 const started=new Promise(resolve=>entered=resolve);
 const pattern='**/pengajuan';
 const delay=async route=>{if(route.request().method()==='PATCH'&&route.request().postDataJSON()?.fields){entered();await new Promise(r=>setTimeout(r,1200));}await route.continue();};
 await page.route(pattern,delay);
 try{
  await field.fill(original+' ');
  await started;
  if(await field.isDisabled())throw Error('Input terkunci saat autosave.');
  await field.fill(changed);
  await page.getByRole('status').filter({hasText:'Draf tersimpan. Belum dikirim ke PF.'}).waitFor();
  if(await field.inputValue()!==changed)throw Error('Respons lama menimpa ketikan baru.');
  await page.reload();await field.waitFor();
  if(await field.inputValue()!==changed)throw Error('Ketikan terbaru belum persisten.');
  return {editableDuringSave:true,latestPersisted:true};
 }finally{
  await page.unroute(pattern,delay);
  await field.fill(original);
  await page.getByRole('status').filter({hasText:'Draf tersimpan. Belum dikirim ke PF.'}).waitFor();
 }
}
