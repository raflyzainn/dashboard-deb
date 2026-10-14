// Jalankan lewat tool Playwright, akun admin dummy lokal.
async page => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:5182/admin/pencairan/campus-002?butir=rab');
 const table=page.getByRole('region',{name:'Tabel perbandingan tiga RAB'});
 await table.waitFor();
 for(const [kind,label] of [['rab_penuh','100%'],['rab','70%'],['rab_tahap2','30%']]){
  const cell=table.locator(`tbody [data-review-column="${kind}"]`).first();await cell.hover();
  assert(await table.locator(`[data-review-column="${kind}"]`).evaluateAll(es=>es.every(e=>e.classList.contains('bg-blue-100')&&getComputedStyle(e).cursor==='pointer')),'Warna dan pointer harus memenuhi kolom');
  await cell.click();await page.waitForURL('**butir='+kind);
  assert(await page.getByRole('button',{name:'Periksa RAB '+label,exact:true}).getAttribute('aria-pressed')==='true','Kolom terpilih salah');
  assert((await page.getByRole('complementary',{name:'Butir'}).locator('[aria-current=true]').innerText()).includes('RAB '+label),'Menu kiri harus mengikuti kolom');
 }
 const statuses=()=>page.evaluate(async()=>{const r=await fetch('/api/pencairan/campus-002');return (await r.json()).documents.map(d=>[d.kind,d.status]);});
 const before=JSON.stringify(await statuses());
 await page.getByRole('button',{name:'Periksa RAB 100%',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForURL('**butir=rab_penuh');
 assert(JSON.stringify(await statuses())===before,'Enter pada judul tidak boleh menyetujui dokumen');
 await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
 const amount=page.getByRole('spinbutton',{name:/Jumlah awal:/}).first();const value=await amount.inputValue();await amount.fill(String(Number(value)+1));
 await page.getByRole('button',{name:'Periksa RAB 70%',exact:true}).click();
 await page.getByRole('button',{name:'Tetap di sini',exact:true}).click();
 assert(await amount.inputValue()===String(Number(value)+1),'Batal pindah harus menjaga input');
 await page.getByRole('button',{name:'Periksa RAB 70%',exact:true}).click();await page.getByRole('button',{name:'Buang perubahan',exact:true}).click();
 await page.waitForURL('**butir=rab');
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:5182/admin/pencairan/campus-004?butir=rab');
  const panel=page.getByRole('status',{name:'Hasil pemeriksaan',exact:true});await panel.waitFor();
  assert(await panel.evaluate(e=>{const text=e.children[1].getBoundingClientRect(),buttons=e.children[2].getBoundingClientRect();return text.width>150&&buttons.top>=text.bottom&&document.documentElement.scrollWidth<=innerWidth;}),'Panel keputusan mobile terjepit atau melebar');
  if(width===390){await panel.scrollIntoViewIfNeeded();await page.screenshot({path:'.playwright-mcp/admin-decision-mobile.png'});}
 }
 return {columnClick:true,fullHover:true,keyboardSafe:true,unsavedGuard:true,mobile:[320,390,768]};
}
