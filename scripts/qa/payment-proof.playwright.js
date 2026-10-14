// Jalankan melalui tool Playwright pada halaman kampus lokal yang sudah dibayar.
async page => {
 const base='/api/pencairan/zymrw7btvq3dyf5/pembayaran/bukti';
 if(!/^http:\/\/127\.0\.0\.1:5176\/campus\/pencairan/.test(page.url()))throw Error('Buka pencairan Sorong lokal.');
 await page.reload();
 await page.getByText('Dana Tahap 1 sudah ditransfer', {exact:false}).waitFor();
 await page.getByText('Lihat seluruh proses pencairan', {exact:false}).click();
 const steps=page.getByLabel('Linimasa proses pencairan').locator('li');
 if(await steps.filter({hasText:'✓'}).count()!==7)throw Error('Ketujuh langkah harus dicentang.');
 if(!(await steps.last().locator('span').first().getAttribute('class')).includes('text-green-700'))throw Error('Langkah terakhir harus hijau.');
 return page.evaluate(async base=>{
  const proof=await fetch(base),forbidden=await fetch(base,{method:'POST'});
  if(![200,404].includes(proof.status)||forbidden.status!==403)throw Error('Akses bukti transfer tidak sesuai.');
  if(proof.ok&&!['application/pdf','image/png','image/jpeg'].includes(proof.headers.get('content-type')))throw Error('Format bukti tidak sesuai.');
  return {steps:7,proofStatus:proof.status,campusUploadStatus:forbidden.status};
 },base);
}
