// Run with the browser tool on an editable local QA Data Program page.
async(page)=>{
 const field=page.getByLabel('Kabupaten / kota',{exact:true}),original=await field.inputValue();
 const isSave=r=>r.request().method()==='PATCH'&&r.url().endsWith('/pengajuan')&&r.request().postDataJSON()?.fields&&r.status()===200;
 let writes=0;
 const listener=r=>{if(r.method()==='PATCH'&&r.url().endsWith('/pengajuan')&&r.postDataJSON()?.fields)writes++;};
 page.on('request',listener);
 try{
  if(await page.getByRole('button',{name:'Simpan draf',exact:true}).count())throw Error('Manual save remains');
  await field.fill('QA debounce');await page.waitForTimeout(200);
  await field.fill('QA debounce final');await page.waitForTimeout(400);
  if(writes)throw Error('Save before debounce elapsed');
  await page.waitForResponse(isSave);await page.waitForTimeout(300);
  if(writes!==1)throw Error('Expected one save for typing burst');
  await page.reload();await field.waitFor();
  for(let i=0;i<20&&(await field.inputValue())!=='QA debounce final';i++)await page.waitForTimeout(100);
  if(await field.inputValue()!=='QA debounce final')throw Error('Value not persisted');
  return {debounced:true,persistedAfterReload:true};
 }finally{
  page.off('request',listener);
  if(await field.inputValue()!==original){await field.fill(original);await page.waitForResponse(isSave);}
 }
}
