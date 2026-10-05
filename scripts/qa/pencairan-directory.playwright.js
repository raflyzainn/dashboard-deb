// Browser tool on a signed-in local admin page; read-only.
async(page)=>{
 const response=await page.request.get('/api/pencairan');
 if(!response.ok())throw Error('Directory failed: '+response.status());
 const {rows}=await response.json();
 if(!Array.isArray(rows)||!rows.length)throw Error('Directory is empty');
 await page.goto('/admin/pencairan');
 await page.getByRole('heading',{name:'Pencairan',exact:true}).waitFor();
 if(rows.some(row=>row.needsPfPks))await page.getByRole('region',{name:'Tugas PKS PF'}).waitFor();
 return {campuses:rows.length,pfTasks:rows.filter(row=>row.needsPfPks).length};
}
