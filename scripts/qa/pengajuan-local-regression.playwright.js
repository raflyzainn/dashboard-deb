// Tool browser only. Read-only regression after removing LPJ from the local journey.
async page => {
 const context=await page.context().browser().newContext(),p=await context.newPage();
 try {
  await p.goto('http://127.0.0.1:5176/login');
  await p.getByRole('combobox').selectOption('admin-1');
  await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();
  await p.waitForURL('**/admin/dashboard');
  const result=await p.evaluate(async()=>{
   const directory=await(await fetch('/api/pencairan')).json();
   if(!directory.rows?.length)throw Error('Empty directory');
   for(const row of directory.rows)for(const suffix of ['','/lampiran']){
    const r=await fetch('/api/pencairan/'+row.campus.id+suffix);
    if(!r.ok)throw Error(row.campus.name+suffix+': '+r.status);
   }
   return {campuses:directory.rows.length};
  });
  await p.goto('http://127.0.0.1:5176/admin/pencairan/zymrw7btvq3dyf5/tahap-2');
  await p.getByRole('heading',{name:'Pencairan Tahap 2',exact:true}).waitFor();
  if(await p.getByRole('link',{name:'Buka laporan realisasi Tahap 1',exact:true}).count())throw Error('Removed LPJ flow still linked');
  if(await p.getByRole('alert').count())throw Error('Stage 2 summary has an error');
  await p.getByText('Halaman ini menampilkan ringkasan sisa dana.',{exact:false}).waitFor();
  return {...result,noLpjLink:true};
 }finally{await context.close();}
}
