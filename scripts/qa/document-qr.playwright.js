// Jalankan lewat tool Playwright, bukan terminal. Membaca dokumen lokal yang sudah ada;
// hanya representasi QR dan catatan verifikasinya yang dibuat, tanpa mengubah keputusan/data pengajuan.
async page => {
 const browser=page.context().browser(),context=await browser.newContext(),publicContext=await browser.newContext();
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 try{
  const p=await context.newPage();await p.goto('http://127.0.0.1:5176/login');
  await p.locator('option[value="admin-1"]').waitFor({state:'attached'});
  await p.getByRole('combobox').selectOption('admin-1');await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/admin/dashboard');
  // Decoder hanya dimuat dalam browser QA, tidak menjadi dependency aplikasi atau menerima berkas.
  await p.addScriptTag({url:'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'});
  const results=await p.evaluate(async()=>{
   const Zip=(await import('/node_modules/.vite/deps/pizzip.js')).default;
   const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const out=[];
   for(const campus of ['pvejbzdevqcmyhp','zymrw7btvq3dyf5'])for(const kind of ['pks','permohonan','invois','kuitansi']){
    const url='/api/pencairan/'+campus+'/pengajuan/dokumen/'+kind,response=await fetch(url);
    if(!response.ok)throw Error(kind+': HTTP '+response.status);
    const bytes=await response.arrayBuffer(),zip=new Zip(bytes),png=zip.file('word/media/qr-monev.png').asUint8Array();
    const bitmap=await createImageBitmap(new Blob([png],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const decoded=window.jsQR(pixels.data,pixels.width,pixels.height);if(!decoded)throw Error('QR tidak terbaca: '+kind);
    const code=decoded.data.split('/').at(-1),verification=await(await fetch('/api/verifikasi/'+code)).json();
    const hash=await digest(bytes),again=await(await fetch(url)).arrayBuffer();
    out.push({campus,kind,code,url:decoded.data,status:verification.status,local:verification.local,hashMatches:hash===verification.sha256,stable:hash===await digest(again)});
   }
   return out;
  });
  for(const r of results){assert(r.hashMatches&&r.stable&&r.local,'Hash/cache tidak cocok: '+r.kind);assert(r.url.startsWith('http://127.0.0.1:5176/verifikasi/'),'Origin QR salah');}
  const publicPage=await publicContext.newPage();await publicPage.goto(results[0].url);
  await publicPage.getByRole('heading',{name:'Dokumen ini diterbitkan oleh sistem MonevDEB'}).waitFor();
  assert(await publicPage.getByText('Lingkungan lokal untuk simulasi.',{exact:false}).isVisible(),'Keterangan lokal hilang');
  await publicPage.goto('http://127.0.0.1:5176/verifikasi/DEB-UNKNOWN-T1-PKS-0000');
  await publicPage.getByRole('heading',{name:'Kode tidak dikenal'}).waitFor();
  return {documents:results,publicWithoutLogin:true,unknownRejected:true};
 }finally{await context.close();await publicContext.close();}
}
