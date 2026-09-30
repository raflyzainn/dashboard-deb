// Run through the Playwright browser tool, not the terminal. Uses only local dummy accounts.
async page => {
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 if(!page.url().endsWith('/login')){
  if(await page.locator('button.sidebar-action:visible').count())await page.locator('button.sidebar-action:visible').filter({hasText:'Keluar'}).click();
  else {await page.locator('summary[aria-label="Buka menu akun"]').click();await page.getByRole('menuitem',{name:'Keluar'}).click();}
 }
 await page.waitForURL('**/login');
 await page.getByRole('combobox',{name:'Masuk sebagai akun lokal'}).selectOption({label:'Universitas Hasanuddin - SoBI Demo'});
 await page.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await page.waitForURL('**/campus/dashboard');
 await page.goto('http://127.0.0.1:5182/campus/pencairan?butir=sk');
 await page.getByRole('button',{name:'Lanjut: Data Program',exact:true}).click();
 await page.getByLabel('Nama kegiatan / program',{exact:true}).fill('Program Energi QA Hasanuddin');
 await page.getByLabel('Kabupaten / kota',{exact:true}).fill('Makassar');
 await page.getByRole('button',{name:'Lanjut: Pengajuan RAB',exact:true}).click();
 const rab=page.getByRole('region',{name:'Pengajuan RAB kampus',exact:true});
 const upload=rab.getByLabel('Unggah Excel RAB 100%',{exact:true});
 await Promise.race([upload.waitFor(),rab.getByRole('button',{name:'Kembali',exact:true}).waitFor()]);
 if(!await upload.count()){
  const revise=page.getByRole('button',{name:'Buat draf perbaikan dari versi ini',exact:true});if(await revise.count())await revise.click();
  await rab.getByRole('button',{name:'Kembali',exact:true}).click();
 }
 await upload.setInputFiles('static/contoh-rab/01_RAB_10_Unit.xlsx');
 await page.getByRole('button',{name:'Lanjut',exact:true}).click();
 const quantities=page.getByRole('spinbutton');
 await quantities.first().fill('1.5');assert(await page.getByRole('button',{name:'Lanjut',exact:true}).isDisabled(),'Pecahan harus diblokir');
 for(let i=0;i<4;i++)await quantities.nth(i).fill('10');assert(await page.getByRole('button',{name:'Lanjut',exact:true}).isDisabled(),'Total melebihi 70% harus diblokir');
 for(let i=0;i<4;i++)await quantities.nth(i).fill('7');
 await page.getByText('Draf RAB tersimpan',{exact:true}).waitFor();
 await page.reload();await quantities.first().waitFor();assert(await quantities.first().inputValue()==='7','Pembagian tidak bertahan setelah reload');
 for(let i=0;i<4;i++)await quantities.nth(i).fill('6');
 await page.getByRole('button',{name:'Lanjut',exact:true}).click();
 await page.getByRole('button',{name:'Lanjut',exact:true}).click();
 for(const [label,value] of [['Nama bank','Bank Dummy QA'],['Nomor rekening','1234567890'],['Nama pemilik rekening','Universitas Hasanuddin'],['Nama penandatangan kampus','Rektor Dummy QA'],['Jabatan penandatangan','Rektor'],['Kota tempat surat dibuat','Makassar'],['Nomor surat permohonan','QA/001'],['Nomor invoice','QA/INV/001'],['Nomor kuitansi','QA/KWT/001']])await page.getByRole('textbox',{name:label,exact:true}).fill(value);
 for(const label of ['Tanggal surat permohonan','Tanggal invoice','Tanggal kuitansi'])await page.getByLabel(label,{exact:true}).fill('2026-09-30');
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('input[aria-label="Bukti rekening"]').disabled);
 await page.getByLabel('Bukti rekening',{exact:true}).setInputFiles('static/sk-dummy.pdf');await page.getByRole('link',{name:'sk-dummy.pdf',exact:true}).waitFor();
 await page.getByLabel('Kop surat kampus',{exact:true}).setInputFiles('static/logo-pf.png');await page.getByRole('img',{name:'Pratinjau kop surat kampus'}).waitFor();
 await page.getByRole('button',{name:'Lanjut: PKS',exact:true}).click();
 await page.getByLabel('Nomor PKS kampus',{exact:true}).fill('PKS-KAMPUS/QA/2026');assert(await page.getByLabel('Tanggal perjanjian',{exact:true}).inputValue()==='2026-06-17','Tanggal PKS harus tetap');
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();
 for(const label of ['PKS','Surat permohonan','Invois','Kuitansi']){
  const create=page.getByRole('button',{name:new RegExp('^(Buat|Buat ulang) '+label+'$')});await create.click();await page.getByRole('button',{name:'Pratinjau '+label,exact:true}).waitFor();
 }
 await page.getByRole('button',{name:'Pratinjau PKS',exact:true}).click();await page.getByText('Termin 1 (satu) sebesar 60%',{exact:false}).first().waitFor();
 const pks=await page.locator('.docx-host').innerText();assert(pks.includes('40%')&&pks.includes('Program Energi QA Hasanuddin')&&pks.includes('DRAF'),'PKS tidak mengikuti data/pembagian');
 await page.getByRole('button',{name:'Lanjut: Ringkasan',exact:true}).click();
 assert(!await page.getByRole('button',{name:'Ajukan untuk diperiksa',exact:true}).isDisabled(),'Pengajuan lengkap masih diblokir');
 await page.getByRole('button',{name:'Ajukan untuk diperiksa',exact:true}).click();await page.getByText('Pengajuan terkirim. PF akan memeriksa RAB dan dokumen Anda.',{exact:true}).waitFor();
 await page.getByRole('complementary',{name:'Butir'}).getByRole('button',{name:/Administrasi/}).click();await page.getByRole('textbox',{name:'Nama bank',exact:true}).waitFor();assert(await page.getByRole('textbox',{name:'Nama bank',exact:true}).isDisabled(),'Isian menunggu PF harus terkunci');
 return {campus:'campus-016',result:'Upload, draf/reload, validasi, mail merge 60/40 dan pengajuan akhir berhasil'};
}
