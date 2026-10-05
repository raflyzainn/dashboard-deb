// Tool browser: draf campus-011, Termin 1. Hanya data dummy lokal.
async page => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const input=page.getByRole('spinbutton').first();
 const notice=page.getByText('Draf RAB tersimpan',{exact:true});
 const revision=()=>page.evaluate(async()=>{const response=await fetch('/api/pencairan/campus-011/pengajuan');return (await response.json()).journey.revision;});
 const before=await revision();
 await input.fill('6');await input.fill('7');await input.fill('8');
 await notice.waitFor();
 assert(await revision()===before+1,'Debounce harus menyimpan satu pembaruan');
 assert(await page.getByRole('button',{name:'Simpan draf pembagian',exact:true}).count()===0,'Tombol simpan tengah harus hilang');
 await page.screenshot({path:'.playwright-mcp/rab-autosave-snackbar.png'});
 await notice.waitFor({state:'hidden'});
 await page.reload();await input.waitFor();assert(await input.inputValue()==='8','Autosave harus bertahan setelah reload');
 const saved=await revision();await input.fill('1.5');
 await page.waitForTimeout(1100);
 assert(await revision()===saved&&!await notice.isVisible(),'Input invalid tidak boleh disimpan/diklaim berhasil');
 await page.evaluate(()=>{
  window.__qaPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){
   const q=value?.fullDummy?.campuses?.['campus-011']?.versions?.at(-1)?.lines?.find(l=>l.level===4)?.flags?.term1Volume;
   if(q===9){IDBObjectStore.prototype.put=window.__qaPut;throw Error('Simulasi penyimpanan gagal');}
   return window.__qaPut.call(this,value,...args);
  };
 });
 try {
  await input.fill('9');await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).waitFor();
  assert(await input.inputValue()==='9'&&!await notice.isVisible(),'Kegagalan harus mempertahankan input tanpa snackbar sukses');
  await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).click();await notice.waitFor();
 } finally {await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__qaPut;delete window.__qaPut;});}
 const pager=page.getByRole('navigation',{name:'Halaman item RAB atas',exact:true});
 await pager.getByRole('button',{name:'Berikutnya'}).click();
 const value=await input.inputValue();await input.fill(value==='0'?'1':'0');await notice.waitFor();
 await page.waitForFunction(()=>document.querySelector('input[type=number]')?.value==='0'||document.querySelector('input[type=number]')?.value==='1');
 assert((await pager.innerText()).includes('Halaman 2'),'Autosave tidak boleh mereset halaman');
 await input.fill(value);await page.getByRole('button',{name:'Lanjut',exact:true}).click();await page.waitForURL('**rabStep=term2');
 return {debounce:true,persisted:true,invalidBlocked:true,failureRetry:true,snackbar:true,pagePreserved:true};
}
