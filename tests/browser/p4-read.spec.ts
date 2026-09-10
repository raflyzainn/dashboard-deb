import {test,expect,type Page} from '@playwright/test';
import type {Bootstrap} from '../../src/lib/types';

test('page APIs isolate payloads, ignore late navigation results and reload only the edited page', async ({page}) => {
  const traffic:string[]=[];
  page.on('request', request => { const path=new URL(request.url()).pathname; if(path.startsWith('/api/'))traffic.push(path); });
  await login(page,'admin-1');
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/views/faq',async route=>{await gate;await route.fulfill({json:{data:{faq:[]},loadedAt:new Date().toISOString()}});});
  await page.getByRole('link',{name:'Pusat bantuan',exact:true}).first().click();
  await page.getByRole('link',{name:'Proposal',exact:true}).first().click();
  await expect(page.locator('.proposal-selector')).toBeVisible();
  release();
  await expect(page.locator('.proposal-selector')).toBeVisible();
  await expect(page.locator('.faq-header')).toHaveCount(0);
  await page.unroute('**/api/views/faq');
  const faqResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/views/faq');
  await page.getByRole('link',{name:'Pusat bantuan',exact:true}).first().click();
  expect(Object.keys((await (await faqResponse).json()).data)).toEqual(['faq']);
  await expect(page.getByRole('button',{name:'Tambah FAQ',exact:true})).toBeEnabled();
  const before=traffic.length;
  await page.route('**/api/faq',route=>route.fulfill({json:{ok:true}}));
  await page.route('**/api/views/faq',route=>route.fulfill({json:{data:{faq:[{id:'mock-faq',question:'QA page refresh only',answer:'Simulated response; no database write.',order:0}]},loadedAt:new Date().toISOString()}}));
  await page.getByRole('button',{name:'Tambah FAQ',exact:true}).click();
  await page.getByLabel('Pertanyaan FAQ').fill('QA page refresh only');
  await page.getByLabel('Jawaban FAQ').fill('Simulated response; no database write.');
  await page.getByRole('button',{name:'Simpan FAQ',exact:true}).click();
  await expect(page.locator('.faq-entry summary')).toContainText('QA page refresh only');
  expect(traffic.slice(before).filter(p=>p.startsWith('/api/views/'))).toEqual(['/api/views/faq']);
  expect(traffic).not.toContain('/api/bootstrap');
});

async function login(page:Page,key:string):Promise<Bootstrap>{
  await page.goto('/login?qa=1');
  if(key.startsWith('admin'))await page.getByRole('button',{name:/Administrator/}).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  const response=page.waitForResponse(r=>new URL(r.url()).pathname === '/api/views/dashboard'&&r.status()===200);
  await page.getByRole('button',{name:'Buka ruang kerja',exact:true}).click();
  const data=await (await response).json();
  await expect(page).toHaveURL(/\/(admin|campus)\/dashboard$/);
  await expect(page.locator('main.content')).toBeVisible();
  await expect(page.locator('.hero-banner')).toBeVisible();
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
  let mapData: Bootstrap['data'] = data;
  page.on('response', async response => { if (new URL(response.url()).pathname === '/api/views/map' && response.ok()) mapData = (await response.json()).data; });
  for(const route of ['campuses','verifikasi','proposal','questions','faq','notifications','sebaran']){
    await page.goto('/admin/'+route);
    await expect(page.locator('main.content')).toBeVisible();
    await expect(page.locator('main.content .loading-screen')).toHaveCount(0);
    await expect(page.locator('.global-error')).toHaveCount(0);
  }
  const valid=mapData.locations!.filter(l=>l.latitude!==null&&l.longitude!==null&&l.latitude>=-11.5&&l.latitude<=6.5&&l.longitude>=94.5&&l.longitude<=141.5);
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
        await expect(page.locator('main.content')).toBeVisible();
    await expect(page.locator('main.content .loading-screen')).toHaveCount(0);
        await expect(page.locator('.global-error')).toHaveCount(0);
      }
    }
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('page failure shows retry instead of another page data and recovers without mutations',async({page})=>{
  await login(page,'admin-1');
  await page.route('**/api/views/faq',route=>route.abort('failed'));
  await page.getByRole('link',{name:'Pusat bantuan',exact:true}).first().click();
  await expect(page.getByText('Data belum dapat dimuat',{exact:true})).toBeVisible();
  await expect(page.locator('.hero-banner')).toHaveCount(0);
  await page.unroute('**/api/views/faq');
  await page.getByRole('button',{name:'Coba muat ulang',exact:true}).click();
  await expect(page.getByRole('button',{name:'Tambah FAQ',exact:true})).toBeEnabled();
  await expect(page.locator('.global-error')).toHaveCount(0);
});
test('Beranda label and audit search include deleted master values, no-result state and pagination',async({page})=>{
  await login(page,'admin-1');
  await expect(page.getByRole('link',{name:'Beranda',exact:true}).first()).toBeVisible();
  await page.goto('/admin/master-indicators');
  const audit=page.getByRole('region',{name:'Riwayat perubahan master',exact:true});
  const input=page.getByLabel('Cari perubahan master',{exact:true});
  await input.fill('hapus indikator');
  await expect(audit.locator('summary').first()).toBeVisible();
  for(const summary of await audit.locator('summary').all())await expect(summary).toContainText('Hapus indikator');
  await input.fill('qa-no-audit-result-1234567890');
  await expect(audit.getByText('Tidak ada perubahan yang cocok',{exact:true})).toBeVisible();
  await input.fill('');
  await expect(audit.getByText('Tidak ada perubahan yang cocok',{exact:true})).toHaveCount(0);
  // Controlled API pages prove navigation beyond the old 50-record UI cap, without writing audit fixtures.
  await page.route('**/api/admin/master-audit?*',async route=>{
    const n=Number(new URL(route.request().url()).searchParams.get('page'));
    await route.fulfill({json:{page:n,totalItems:65,totalPages:4,items:[{id:'audit-page-'+n,actor:'qa',entity:'indicator_definitions',entityId:'qa',operation:'masterSaveDefinition',before:null,after:{name:'QA page '+n},created:'2026-09-10T00:00:00Z'}]}});
  });
  await input.fill('QA page');
  await expect(audit.locator('summary')).toContainText('QA page 1');
  for(let n=2;n<=4;n++){await audit.getByRole('button',{name:'Berikutnya',exact:true}).click();await expect(audit.locator('summary')).toContainText('QA page '+n);}
  await expect(audit.getByRole('button',{name:'Berikutnya',exact:true})).toBeDisabled();
  await input.fill('QA page reset');
  await expect(audit.locator('summary')).toContainText('QA page 1');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
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
  await page.route('**/api/views/*',async route=>{
    const response=await route.fetch();const body=await response.json();
    for(const key of Object.keys(body.data))if(Array.isArray(body.data[key]))body.data[key]=[];
    body.locations=[];await route.fulfill({response,json:body});
  });
  await page.goto('/admin/dashboard');
  await expect(page.locator('main.content')).toBeVisible();
  await expect(page.locator('.hero-banner')).toContainText('0 kampus');
  await expect(page.locator('main')).not.toContainText('NaN');
  await expect(page.getByText('Belum ada aktivitas',{exact:true})).toBeVisible();
  await page.goto('/admin/sebaran');
  await expect(page.locator('main.content')).toBeVisible();
  await expect(page.locator('.map-stage')).toBeVisible();
  await expect(page.locator('.map-dot')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('NaN');
});
