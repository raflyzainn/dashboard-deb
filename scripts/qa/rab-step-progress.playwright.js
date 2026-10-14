// Tool Playwright: akun kampus, unggahan baru 03_RAB_Banyak_Item.xlsx pada langkah full.
async (page) => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const step=n=>page.getByRole('button',{name:new RegExp('^'+n+'\\. ')});
 const next=page.getByRole('button',{name:'Lanjut',exact:true});
 assert(await step(3).isDisabled()&&await step(4).isDisabled(),'Tahap baru harus terkunci');
 await page.goto('http://127.0.0.1:5182/campus/pencairan?bagian=rab&butir=rab_tahap2&rabStep=term2');
 await page.waitForURL('**rabStep=full');
 await next.click();await page.waitForURL('**rabStep=term1');
 assert(await step(4).isDisabled(),'Lanjut pertama hanya membuka Termin 1');
 assert(await page.getByRole('navigation',{name:'Halaman item RAB atas'}).count()===0,'Pagination atas harus dihapus');
 const pager=page.getByRole('navigation',{name:'Halaman item RAB bawah',exact:true});
 assert(await pager.count()===1,'Hanya satu pagination');
 assert((await pager.getByRole('button').allTextContents()).every(s=>!s.trim()),'Tombol pagination hanya ikon');
 const inputs=page.getByRole('spinbutton');
 for(let p=0;p<2;p++){
  for(let i=0;i<await inputs.count();i++)await inputs.nth(i).fill(String(Math.floor(Number(await inputs.nth(i).getAttribute('max'))/2)));
  await page.getByRole('status').filter({hasText:'Draf RAB tersimpan'}).waitFor();
  assert(await step(4).isDisabled(),'Autosave tidak membuka Termin 2');
  if(p===0)await pager.getByRole('button',{name:'Berikutnya'}).click();
 }
 await next.click();await page.waitForURL('**rabStep=term2');
 await step(2).click();await page.waitForURL('**rabStep=full');
 assert(await step(3).isEnabled()&&await step(4).isEnabled(),'Tahap yang pernah dicapai tetap terbuka');
 await page.reload();await page.getByRole('heading',{name:'Periksa RAB 100% dari Excel',exact:true}).waitFor();
 assert(await step(4).isEnabled(),'Progres harus bertahan setelah refresh');
 await step(3).click();await page.waitForURL('**rabStep=term1');
 await pager.getByRole('button',{name:'Berikutnya'}).click();
 assert((await pager.innerText()).includes('Halaman 2 dari 2'),'Ikon berikutnya berfungsi');
 await pager.getByRole('button',{name:'Sebelumnya'}).click();
 assert((await pager.innerText()).includes('Halaman 1 dari 2'),'Ikon sebelumnya berfungsi');
 await page.setViewportSize({width:390,height:844});await pager.scrollIntoViewIfNeeded();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Tidak boleh melebar pada mobile');
 await page.screenshot({path:'.playwright-mcp/rab-pagination-icons.png'});
 return {sequential:true,directLinkGuard:true,autosaveDoesNotUnlock:true,revisitAndRefresh:true,bottomIconsOnly:true,mobile:true};
}
