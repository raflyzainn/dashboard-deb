import {test,expect,type Page} from '@playwright/test';
import type {Bootstrap} from '../../src/lib/types';

async function login(page:Page,key:string):Promise<Bootstrap>{
  await page.goto('/login');
  if(key.startsWith('admin'))await page.getByRole('button',{name:/Administrator/}).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/bootstrap')&&r.status()===200);
  await page.getByRole('button',{name:'Buka ruang kerja',exact:true}).click();
  const data=await (await response).json();
  await expect(page).toHaveURL(/\/(admin|campus)\/dashboard$/);
  await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
  return data;
}

test('P4 admin masters, dynamic dashboard and all admin read routes',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const {data}=await login(page,'admin-1');
  await expect(page.locator('.hero-banner')).toContainText(`${data.campuses.length} kampus`);
  const expectedAverage=data.campuses.reduce((sum,c)=>{
    const rows=data.indicators.filter(i=>i.campusId===c.id);
    return sum+(rows.length?rows.reduce((n,i)=>n+Math.min(i.current/i.target*100,100),0)/rows.length:0);
  },0)/(data.campuses.length||1);
  await expect(page.locator('.stats-grid').first()).toContainText(`${Math.round(expectedAverage)}%`);
  await page.getByRole('link',{name:'Master indikator',exact:true}).first().click();
  await expect(page.locator('.master-table').first()).toBeVisible();
  await expect(page.locator('.master-panel').first()).toContainText(`${data.definitions.length} aktif`);
  await expect(page.getByRole('button',{name:'Tambah indikator',exact:true})).toBeEnabled();
  for(const route of ['campuses','verifikasi','proposal','questions','faq','notifications','sebaran']){
    await page.goto('/admin/'+route);
    await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
    await expect(page.locator('.global-error')).toHaveCount(0);
  }
  const valid=data.locations!.filter(l=>l.latitude!==null&&l.longitude!==null&&l.latitude>=-11.5&&l.latitude<=6.5&&l.longitude>=94.5&&l.longitude<=141.5);
  await expect(page.locator('.map-dot')).toHaveCount(valid.length);
  expect(errors).toEqual([]);
});

test('P4 two campuses share targets, hide drafts and master management',async({browser})=>{
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  try{
    const pages=await Promise.all(contexts.map(c=>c.newPage()));
    const [a,b]=await Promise.all(pages.map((p,i)=>login(p,i?'campus-002':'campus-001')));
    expect(a.data.definitions).toEqual(b.data.definitions);
    expect(a.data.indicators.length).toBeGreaterThan(0);
    for(const row of a.data.indicators){const other=b.data.indicators.find(i=>i.definitionId===row.definitionId)!;expect([row.baseline,row.target]).toEqual([other.baseline,other.target]);}
    for(const page of pages){
      await expect(page.getByRole('link',{name:'Master indikator',exact:true})).toHaveCount(0);
      for(const route of ['indicators','proposal','questions','faq','notifications']){
        await page.goto('/campus/'+route);
        await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
        await expect(page.locator('.global-error')).toHaveCount(0);
      }
    }
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('P4 stale response keeps existing data and retry recovers without mutations',async({page})=>{
  const initial=await login(page,'admin-1');
  await page.route('**/api/bootstrap',route=>route.abort('failed'));
  await page.getByRole('button',{name:'Muat ulang data',exact:true}).click();
  await expect(page.locator('.backend-notice')).toContainText('Pembaruan gagal');
  await expect(page.locator('.hero-banner')).toContainText(`${initial.data.campuses.length} kampus`);
  await page.unroute('**/api/bootstrap');
  await page.getByRole('button',{name:'Muat ulang data',exact:true}).click();
  await expect(page.locator('.backend-notice')).not.toContainText('Pembaruan gagal');
  await expect(page.locator('.global-error')).toHaveCount(0);
});

test('P4 empty backend response renders no fabricated data and master mobile stays within viewport',async({page})=>{
  await login(page,'admin-1');
  await page.goto('/admin/master-indicators');
  await expect(page.locator('.master-table').first()).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Tambah indikator',exact:true}).click();
  await expect(page.getByLabel('Baseline bersama',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.route('**/api/bootstrap',async route=>{
    const response=await route.fetch();const body=await response.json();
    for(const key of Object.keys(body.data))if(Array.isArray(body.data[key]))body.data[key]=[];
    body.locations=[];await route.fulfill({response,json:body});
  });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
  await expect(page.locator('.hero-banner')).toContainText('0 kampus');
  await expect(page.locator('main')).not.toContainText('NaN');
  await expect(page.getByText('Belum ada aktivitas',{exact:true})).toBeVisible();
  await page.goto('/admin/sebaran');
  await expect(page.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
  await expect(page.locator('.map-dot')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('NaN');
});
