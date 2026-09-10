import {test,expect,type Page} from '@playwright/test';
async function login(page:Page,key:string){
  await page.goto('/login');
  if(key.startsWith('admin'))await page.getByRole('button',{name:/Administrator/}).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  await page.getByRole('button',{name:'Buka ruang kerja'}).click();
  await expect(page).toHaveURL(/\/(campus|admin)\/dashboard$/);
  await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
}
test('5176 campus uses live bootstrap, navigates and exposes writable controls',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await login(page,'campus-001');
  await page.getByRole('link',{name:'Forum Q&A',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Ajukan pertanyaan',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Ajukan pertanyaan',exact:true}).click();
  await page.getByLabel('Judul pertanyaan').fill('QA form only - never submitted');
  await expect(page.getByLabel('Judul pertanyaan')).toHaveValue('QA form only - never submitted');
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.getByRole('link',{name:'Proposal',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Unggah versi baru'})).toBeEnabled();
  await expect(page.locator('.version-list')).toBeVisible();
  await page.reload();await expect(page.locator('.version-list')).toBeVisible();
  expect(errors).toEqual([]);
});
test('5176 admin navigation and review notes survive input and refresh',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await login(page,'admin-1');
  await page.goto('/admin/verifikasi');
  if(await page.getByLabel('Catatan keputusan').count()){
    await page.getByLabel('Catatan keputusan').fill('QA input only - never submitted');
    await expect(page.getByRole('button',{name:'Minta Revisi',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Muat ulang data',exact:true}).click();
    await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
    await expect(page.getByLabel('Catatan keputusan')).toHaveValue('QA input only - never submitted');
  }
  await page.getByRole('link',{name:'Pusat bantuan',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'Tambah FAQ',exact:true})).toBeEnabled();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
