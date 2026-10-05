// Tool Playwright only. Use an authenticated local admin page; read-only QA.
async (page) => {
 if(new URL(page.url()).origin!=='http://127.0.0.1:5176')throw Error('Use local app 5176');
 return page.evaluate(async()=>{
  const ids=['3s7qtxmh8sqghjm','6wqqkvxonz5gclp','878e5swr345c1at','fdnc0gsow3x1u4a','fgobuhb12ihn4jq','fu888zkhhim3l75','jtz7efqygf2lc48','kojzxdhf7zcegxb','mdhw6cibouypmce','mjs5loff713c74h','pvejbzdevqcmyhp','sbik7eb7cmh6mrz','scc3aqrjzwz3zj4','so250uq7mo2695c','w0vzubzgcp8fplu','z89xrd5plfee25s','zymrw7btvq3dyf5'];
  for(const id of ids){
   const res=await fetch('/api/pencairan/'+id+'/pengajuan'),j=await res.json();
   const r=await(await fetch('/api/pencairan/'+id+'/rab')).json();
   if(!res.ok||j.summary.amountSen!==7500000000||j.journey.status!=='draf'||j.journey.fields.nomorRekening||j.journey.fields.nomorPksKampus||Object.keys(j.journey.files).length||r.versions.length)throw Error('Unexpected initial state: '+id);
  }
  return {verified:ids.length,amountRupiah:75000000,allEmpty:true};
 });
}
