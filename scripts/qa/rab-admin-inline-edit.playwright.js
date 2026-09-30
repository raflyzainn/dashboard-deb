// Jalankan melalui tool browser_run_code_unsafe, pada admin RAB mockup belum dibayar.
// Membuat dua versi koreksi dummy; koreksi kedua mengembalikan nilai awal.
async (page) => {
 const table=page.getByRole('region',{name:'Tabel perbandingan tiga RAB'});
 const title=await table.locator('tbody th p').nth(1).innerText();
 const originalRow=await table.locator('tbody tr').first().innerText();
 const originalTotal=await table.locator('tfoot').innerText();
 const decision=page.getByRole('button',{name:'Sesuai: jadikan nominal Tahap 1',exact:true});
 await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
 if(await page.getByRole('dialog').count())throw Error('Mode edit membuka popup.');
 if(await decision.isEnabled())throw Error('Keputusan masih aktif saat edit.');
 const volume=page.getByLabel('Jumlah awal: '+title,{exact:true});
 const price=page.getByLabel('Harga satuan: '+title,{exact:true});
 const first=page.getByLabel('Jumlah Tahap 1: '+title,{exact:true});
 const values={volume:await volume.inputValue(),price:await price.inputValue(),first:await first.inputValue()};
 await first.fill(String(Number(values.volume)+1));
 if(await page.getByRole('button',{name:'Simpan perubahan',exact:true}).isEnabled())throw Error('Jumlah di atas volume diterima.');
 await volume.fill('2');await first.fill('0.5');
 if(await page.getByRole('button',{name:'Simpan perubahan',exact:true}).isEnabled())throw Error('Pecahan pada volume bulat diterima.');
 await page.getByRole('button',{name:'Batal',exact:true}).click();
 if(await table.locator('tbody tr').first().innerText()!==originalRow)throw Error('Batal mengubah data.');
 for(const restore of [false,true]){
  await page.getByRole('button',{name:'Edit RAB',exact:true}).click();
  await volume.fill(restore?values.volume:String(Number(values.volume)*2));
  await price.fill(restore?values.price:String(Number(values.price)/2));
  await first.fill(restore?values.first:String(Number(values.first)*2));
  if(await table.locator('tfoot').innerText()!==originalTotal)throw Error('Total preview tidak konsisten.');
  await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();
  await page.getByRole('button',{name:'Edit RAB',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Edit RAB',exact:true}).waitFor();
  if(await table.locator('tfoot').innerText()!==originalTotal)throw Error('Total tersimpan berbeda.');
 }
 if(await table.locator('tbody tr').first().innerText()!==originalRow)throw Error('Nilai awal gagal dipulihkan.');
 return 'Edit langsung tanpa popup; keputusan terkunci; jumlah invalid ditolak; batal, preview, simpan, dan reload sesuai.';
}
