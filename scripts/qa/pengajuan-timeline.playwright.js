// Browser tool on a campus with a submitted package waiting for PF.
async(page)=>{
 const summary=page.getByText('Lihat seluruh proses pencairan',{exact:true});
 if(!await summary.evaluate(s=>s.parentElement.open))await summary.click();
 const timeline=page.getByRole('list',{name:'Linimasa proses pencairan'});
 const active=await timeline.locator('[aria-current=step]').innerText();
 if(!active.includes('Pemeriksaan PF'))throw Error('Submitted package timeline is stale: '+active);
 if((await timeline.locator('li').evaluateAll(items=>items.filter(i=>i.textContent.includes('?')).length))!==3)throw Error('Earlier steps not complete');
 return {active};
}
