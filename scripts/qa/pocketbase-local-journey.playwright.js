// Jalankan dengan tool browser, bukan terminal. Hanya akun QA pada 127.0.0.1:5176.
// Checkpoint awal; memerlukan pengajuan QA 1 dapat diedit. Bukan skrip reset/idempoten.
// Sesi pertama berhenti menemukan bug; kelanjutan manual dicatat pada laporan QA.
async (page) => {
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const origin='http://127.0.0.1:5176',campus='d63eb34c38656b4';
 const login=async(p,key)=>{await p.goto(origin+'/login');await p.getByRole('combobox').selectOption(key);await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/*/dashboard');};
 const ctx=await page.context().browser().newContext();const admin=await ctx.newPage();
 try{
  await login(admin,'admin-1');await admin.goto(origin+'/admin/pencairan/'+campus+'?butir=pks');
  await admin.getByText('Data PKS yang diisi PF',{exact:true}).click();
  await admin.getByLabel('Nomor PKS PF (diisi PF)',{exact:true}).fill('PKS-PF/QA-LOKAL/2026');
  await admin.getByRole('button',{name:'Simpan data PF',exact:true}).click();
  await admin.getByText('Data PF tersimpan. Dokumen kampus perlu dibuat ulang.',{exact:true}).waitFor();
 }finally{await ctx.close();}
 await page.goto(origin+'/campus/pencairan?bagian=program&butir=program');
 await page.getByLabel('Nama kegiatan / program',{exact:true}).fill('Program Energi QA PocketBase '+Date.now());
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();
 await page.getByText('Draf tersimpan. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Lanjut: Pengajuan RAB',exact:true}).click();
 const rab=page.getByRole('region',{name:'Pengajuan RAB kampus',exact:true});
 await rab.getByRole('button',{name:'Lanjut',exact:true}).click();
 const inputs=page.getByRole('spinbutton');await inputs.first().waitFor();
 for(let i=0;i<4;i++)await inputs.nth(i).fill('6');
 await rab.getByRole('button',{name:'Lanjut',exact:true}).click();
 await page.waitForURL('**rabStep=term2');await rab.getByRole('button',{name:'Lanjut',exact:true}).click();
 for(const [label,value] of [['Nama bank','Bank QA Lokal'],['Nomor rekening','1234567890'],['Nama pemilik rekening','Kampus QA Lokal 1'],['Nama penandatangan kampus','Perwakilan Kampus QA'],['Jabatan penandatangan','Dosen'],['Kota tempat surat dibuat','Jakarta'],['Nomor surat permohonan','QA/001'],['Nomor invoice','QA/INV/001'],['Nomor kuitansi','QA/KWT/001']])await page.getByRole('textbox',{name:label,exact:true}).fill(value);
 for(const label of ['Tanggal surat permohonan','Tanggal invoice','Tanggal kuitansi'])await page.getByLabel(label,{exact:true}).fill('2026-09-30');
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();
 await page.getByText('Draf tersimpan. Belum dikirim ke PF.',{exact:true}).waitFor();
 await page.getByLabel('Bukti rekening',{exact:true}).setInputFiles('static/sk-dummy.pdf');await page.getByRole('link',{name:'sk-dummy.pdf',exact:true}).waitFor();
 await page.getByLabel('Kop surat kampus',{exact:true}).setInputFiles('static/logo-pf.png');await page.getByRole('img',{name:'Pratinjau kop surat kampus'}).waitFor();
 await page.getByRole('button',{name:'Lanjut: PKS',exact:true}).click();
 await page.getByLabel('Nomor PKS kampus',{exact:true}).fill('PKS-KAMPUS/QA/2026');
 assert(await page.getByLabel('Tanggal perjanjian',{exact:true}).inputValue()==='2026-06-17','Tanggal PKS');
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();await page.getByText('Draf tersimpan. Belum dikirim ke PF.',{exact:true}).waitFor();
 for(const label of ['PKS','Surat permohonan','Invois','Kuitansi']){
  await page.getByRole('button',{name:new RegExp('^(Buat|Buat ulang) '+label+'$')}).click();await page.getByRole('button',{name:'Pratinjau '+label,exact:true}).waitFor();
 }
 await page.getByRole('button',{name:'Pratinjau PKS',exact:true}).click();await page.getByText('Termin 1 (satu) sebesar 60%',{exact:false}).first().waitFor();
 const text=await page.locator('.docx-host').innerText();assert(text.includes('40%')&&text.includes('Program Energi QA PocketBase'),'PKS mengikuti data dan pembagian');
 await page.getByRole('button',{name:'Lanjut: Ringkasan',exact:true}).click();
 await page.getByRole('button',{name:'Ajukan untuk diperiksa',exact:true}).click();await page.getByText('Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.',{exact:true}).waitFor();
 return {localPocketBase:true,allocation:'60/40',documents:4,submitted:true};
}
