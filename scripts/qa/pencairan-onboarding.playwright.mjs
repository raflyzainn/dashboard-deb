import {chromium, expect} from '@playwright/test';
import fs from 'node:fs/promises';
const origin=process.env.QA_ORIGIN||'http://127.0.0.1:5191';
const root='.qa/onboarding';await fs.mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false,slowMo:150});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss();});
try{
 await page.goto(origin+'/login');await page.getByRole('combobox').selectOption('campus-001');
 await page.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await page.waitForURL('**/campus/dashboard');
 await page.goto(origin+'/campus/pencairan?butir=ringkasan');
 const checklist=page.getByRole('region',{name:'Kelengkapan pengajuan'});
 await expect(checklist).toBeVisible();await expect(checklist.locator('details[open]')).toHaveCount(0);
 await checklist.getByRole('button',{name:'Lengkapi Identitas Surat dan Kop',exact:true}).click();
 await expect(page.getByLabel('Kop surat kampus',{exact:true})).toBeVisible();
 for(const [butir,label,value] of [['administrasi','Nama bank','Bank Autosave QA'],['penandatangan','Nama penandatangan kampus','Penandatangan Autosave QA'],['surat','Nomor invoice','INV-AUTOSAVE-QA'],['pks','Nomor PKS kampus','PKS-AUTOSAVE-QA']]){
  await page.goto(origin+'/campus/pencairan?butir='+butir);
  await page.getByRole('textbox',{name:new RegExp('^'+label+'(?: .*)?$')}).fill(value);
  // Pindah segera, sebelum debounce: navigasi harus menunggu save, tanpa popup.
  await page.getByRole('button',{name:/^Data Program/}).first().click();
  await expect(page.getByLabel('Alamat kampus',{exact:false})).toBeVisible();
  await page.goto(origin+'/campus/pencairan?butir='+butir);
  await expect(page.getByRole('textbox',{name:new RegExp('^'+label+'(?: .*)?$')})).toHaveValue(value);
  await page.reload();await expect(page.getByRole('textbox',{name:new RegExp('^'+label+'(?: .*)?$')})).toHaveValue(value);
 }
 await page.goto(origin+'/campus/pencairan?butir=pks');
 await expect(page.getByRole('definition').filter({hasText:'masih menunggu surat dari PF'})).toBeVisible();
 const result=await page.evaluate(async()=>{const v=await(await fetch('/api/pencairan/campus-001/pengajuan')).json();return {pf:v.pf.nomorPksPf,blockers:v.blockers};});
 expect(result.pf).toBe('');expect(result.blockers.some(b=>b.text.includes('Klik Minta PF'))).toBe(false);
 expect(dialogs).toEqual([]);expect(errors).toEqual([]);
await page.goto(origin+'/campus/pencairan?butir=administrasi');const field=page.getByRole('textbox',{name:/^Nama bank/});await field.waitFor();
const prior=await field.inputValue();await page.evaluate(async()=>{const {dataService}=await import('/src/lib/data/service.ts');const api=dataService.api;const real=api.patch;let fail=true;api.patch=async(...args)=>{if(fail&&args[0]==='/api/pencairan/campus-001/pengajuan'&&args[1]?.fields){fail=false;throw Error('QA: koneksi penyimpanan terputus');}return real(...args);};});
await field.fill('Bank Tidak Hilang QA');await page.getByRole('button',{name:/^Data Program/}).first().click();await expect(page.getByRole('button',{name:'Coba simpan lagi',exact:true})).toBeVisible();await expect(field).toHaveValue('Bank Tidak Hilang QA');expect(page.url()).toContain('butir=administrasi');
const saved=await page.evaluate(async()=>(await(await fetch('/api/pencairan/campus-001/pengajuan')).json()).journey.fields.namaBank);expect(saved).toBe(prior);
await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).click();await expect(page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.',{exact:true})).toBeVisible();await page.reload();await expect(field).toHaveValue('Bank Tidak Hilang QA');

 await page.screenshot({path:root+'/autosave-pks.png',fullPage:true});
 await page.goto(origin+'/campus/pencairan?butir=ringkasan');await expect(checklist).toBeVisible();await page.screenshot({path:root+'/kelengkapan.png',fullPage:true});
 console.log('PASS: grouped validation, correct letterhead link, autosave four forms, navigation, reload, PF placeholder.');
 await fs.writeFile(root+'/results.json',JSON.stringify({passed:true,failureRetry:true,errors,dialogs,result},null,2));
}catch(e){await page.screenshot({path:root+'/failure.png',fullPage:true});await fs.writeFile(root+'/results.json',JSON.stringify({passed:false,error:e.message,errors,dialogs},null,2));throw e;}
finally{await browser.close();}
