// Tool browser_run_code_unsafe; admin pada RAB mockup lengkap, belum dibayar.
// Menguji kunci kolom, warning/larangan persetujuan, lalu memulihkan harga.
async(page)=>{
 const base=page.url().split('?')[0];
 for(const kind of ['rab_penuh','rab','rab_tahap2']){
  await page.goto(base+'?butir='+kind);
  await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
  const price=page.getByLabel('Harga satuan: Panel surya dan baterai',{exact:true});
  const volume=page.getByLabel('Jumlah awal: Panel surya dan baterai',{exact:true});
  const first=page.getByLabel('Jumlah Tahap 1: Panel surya dan baterai',{exact:true});
  if(await price.isEnabled()!==(kind==='rab_penuh')||await volume.isEnabled()!==(kind==='rab_penuh')||await first.isEnabled()!==(kind==='rab'))throw Error('Kunci kolom tidak mengikuti tab.');
  if(kind==='rab_tahap2'){
   const second=page.getByLabel('Jumlah Tahap 2: Panel surya dan baterai',{exact:true});
   if(!await second.isEnabled())throw Error('Tahap 2 terkunci pada tabnya sendiri.');
   await second.fill('0');
   if(await first.inputValue()!=='2')throw Error('Tahap 1 tidak mengikuti sisa Tahap 2.');
  }
  if(kind==='rab_penuh'){
   await volume.fill('1.992');
   if(await page.getByRole('button',{name:'Simpan perubahan',exact:true}).isEnabled())throw Error('Pecahan jumlah awal diterima.');
  }
  await page.getByRole('button',{name:'Batal',exact:true}).click();
 }
 await page.goto(base+'?butir=rab_penuh');
 await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
 const price=page.getByLabel('Harga satuan: Panel surya dan baterai',{exact:true});
 const original=await price.inputValue();
 await price.fill(String(Number(original)+4000000));
 await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();
 await page.getByRole('button',{name:'Edit RAB',exact:true}).waitFor();
 const approval=page.getByRole('button',{name:'Sesuai dengan Nilai SK',exact:true});
 await page.getByText(/Total RAB .* belum sesuai nilai SK .* Sesuaikan RAB sebelum menyetujui/).waitFor();
 if(await approval.isEnabled())throw Error('RAB melebihi SK masih dapat disetujui.');
 if(!await page.getByRole('button',{name:'Perlu revisi',exact:true}).isEnabled())throw Error('Permintaan revisi ikut terkunci.');
 await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
 await price.fill(original);
 await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();
 await page.getByRole('button',{name:'Edit RAB',exact:true}).waitFor();
 await page.reload();await page.getByRole('button',{name:'Edit RAB',exact:true}).waitFor();
 if(!await approval.isEnabled())throw Error('Persetujuan tetap terkunci setelah total dipulihkan.');
 return 'Kunci kolom ketiga tab, jumlah bulat, hitungan sisa Tahap 2, peringatan SK, larangan persetujuan, dan pemulihan setelah reload berhasil.';
}
