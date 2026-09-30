// Tool Playwright, draf kampus dengan 03_RAB_Banyak_Item.xlsx (10 item).
async page => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const pager=page.getByRole('navigation',{name:'Halaman item RAB atas',exact:true});
 const inputs=page.getByRole('spinbutton');
 const next=page.getByRole('button',{name:'Lanjut',exact:true});
 const summary=page.locator('[aria-label="Ringkasan pembagian RAB"]');
 await page.setViewportSize({width:1440,height:1000});
 assert(await inputs.count()===5,'Halaman pertama harus berisi 5 item');
 assert(await pager.getByRole('button',{name:'Sebelumnya'}).isDisabled(),'Batas halaman pertama');
 for(let i=0;i<5;i++)await inputs.nth(i).fill(String(Math.floor(Number(await inputs.nth(i).getAttribute('max'))/2)));
 const first=await inputs.first().inputValue();
 await inputs.first().fill('1.5');
 await pager.getByRole('button',{name:'Berikutnya'}).click();
 assert(await inputs.count()===5,'Halaman kedua harus berisi 5 item');
 assert(await pager.getByRole('button',{name:'Berikutnya'}).isDisabled(),'Batas halaman terakhir');
 for(let i=0;i<5;i++)await inputs.nth(i).fill(String(Math.floor(Number(await inputs.nth(i).getAttribute('max'))/2)));
 assert(await next.isDisabled(),'Input invalid pada halaman lain harus tetap memblokir');
 await pager.getByRole('button',{name:'Sebelumnya'}).click();
 assert(await inputs.first().inputValue()==='1.5','Pindah halaman tidak boleh menghapus input');
 await inputs.first().fill(first);
 const total=await summary.innerText();
 await pager.getByRole('button',{name:'Berikutnya'}).click();
 assert(await summary.innerText()===total,'Total harus mencakup seluruh halaman');
 await next.click();await page.waitForURL('**rabStep=term2');
 assert(await page.locator('[aria-label="Perbandingan tiga RAB"] article').count()===5,'Termin 2 juga memakai pagination');
 await pager.getByRole('button',{name:'Berikutnya'}).click();
 assert((await pager.innerText()).includes('Halaman 2 dari 2'),'Termin 2 halaman berikutnya');
 await page.getByRole('button',{name:'Kembali',exact:true}).click();await inputs.first().waitFor();
 assert(await inputs.first().inputValue()===first,'Kembali harus mempertahankan nilai tersimpan');
 await page.reload();await inputs.first().waitFor();
 assert(await inputs.first().inputValue()===first,'Reload harus mempertahankan pembagian');
 await pager.scrollIntoViewIfNeeded();await page.screenshot({path:'.playwright-mcp/rab-pagination.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Pagination tidak boleh membuat halaman melebar');
 await page.setViewportSize({width:1440,height:1000});
 return {fiveItems:true,pageBounds:true,hiddenValidation:true,allItemsTotal:true,persisted:true,term2:true,mobile:true};
}
