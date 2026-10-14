// Tool Playwright only. Start on an editable Data Program page; never saves inputs.
async (page) => {
 await page.evaluate(async()=>{
  const {validateJourney,ensureJourney}=await import('/src/lib/pengajuan/journey.ts');
  const {PLACEHOLDERS}=await import('/src/lib/merge.ts');
  const c={id:'qa',name:'QA',award:{amountSen:7500000000}},r={versions:[]};ensureJourney(c,r);
  const tags=Object.fromEntries(['pks','permohonan','invois','kuitansi'].map(k=>[k,Object.keys(PLACEHOLDERS)]));
  const warnings=validateJourney(c,r,{},tags).blockers;
  if(warnings.filter(w=>w.section==='program').length!==6)throw Error('Duplicate program warnings');
  if(warnings.some(w=>/Judul program|Lokasi program|Nomor invois|Pejabat penandatangan/.test(w.text)))throw Error('Duplicate template aliases');
  r.journey.fields.nomorRekening='abc';r.journey.fields.tanggalInvois='2026-06-17';
  const invalid=validateJourney(c,r,{},tags).blockers;
  if(!invalid.some(w=>w.text.includes('5?40'))||!invalid.some(w=>w.text.includes('Invoice: tanggal harus')))throw Error('Format validation missing');
 });
 const field=page.getByLabel('Kabupaten / kota',{exact:true});
 const original=await field.inputValue();
 const warning=page.getByText('Kabupaten/kota program belum diisi.',{exact:true});
 try {
  await field.fill('');await warning.waitFor();
  await field.fill('Sorong');await warning.waitFor({state:'hidden'});
  await field.fill('   ');await warning.waitFor();
  return {validValueClearsWarning:true,whitespaceStillWarns:true};
 } finally {await field.fill(original);}
}
