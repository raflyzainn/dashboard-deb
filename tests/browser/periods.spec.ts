import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function login(page: Page, account: string) {
  if (page.url().startsWith('http')) await page.evaluate(() => sessionStorage.removeItem('deb-pocketbase-preview-account'));
  await page.goto('/login?qa=1');
  if (account === 'admin-1') await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${account}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
const headers = (account: string) => ({ Origin:'http://127.0.0.1:5177', 'X-DEB-Preview':'1', 'X-DEB-Preview-Account':account, 'Idempotency-Key':randomUUID() });

test('admin opens a copied period; campus fills fresh values and can only read the archive', async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page,'admin-1');
  const before = await (await page.request.get('/api/views/indicators', { headers:headers('campus-001') })).json();
  const oldPeriod = before.data.period.id;
  const oldRows = before.data.indicators;
  const masters = await (await page.request.get('/api/admin/masters', { headers:headers('admin-1') })).json();
  const source = masters.definitions.find((d:any) => d.period === oldPeriod && d.status === 'active');
  const denied = await page.request.post('/api/admin/periods',{ headers:headers('campus-001'),data:{name:'Forbidden'} });
  expect(denied.status()).toBe(403);
  await page.goto('/admin/master-indicators');
  await page.getByRole('button',{name:'Periode baru',exact:true}).click();
  const name = 'QA Periode ' + Date.now();
  await page.getByLabel('Nama periode',{exact:true}).fill(name);
  await page.getByRole('button',{name:'Buat draft periode',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Kelola periode')).toHaveValue(name);
  const row = page.getByRole('row').filter({has:page.getByText(source.name,{exact:true})});
  await row.getByRole('button',{name:'Edit',exact:true}).click();
  await expect(page.getByLabel('Baseline bersama')).toHaveValue(String(source.baseline));
  await expect(page.getByLabel('Target bersama')).toHaveValue(String(source.target));
  await page.getByLabel('Target bersama').fill(String(source.target + 5));
  await page.getByRole('button',{name:'Simpan indikator',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const review = await (await page.request.get('/api/views/review',{headers:headers('admin-1')})).json();
  const pending = review.data.submissions.filter((s:any)=>s.status === 'pending');
  if (pending.length) {
    const blocked = await page.request.post('/api/admin/periods/open',{headers:headers('admin-1'),data:{period:name}});
    expect(blocked.status()).toBe(409);
  }
  // Finish fixture reviews through the actual API; never delete submission history.
  for (const s of pending) {
    const decision = await page.request.post(`/api/submissions/${s.id}/review`,{headers:headers('admin-1'),data:{decision:'revision',note:'QA pergantian periode'}});
    expect(decision.status()).toBe(200);
  }
  await page.reload();
  await page.getByLabel('Kelola periode').selectOption(name);
  await page.getByRole('button',{name:'Buka periode',exact:true}).click();
  await page.getByRole('button',{name:'Ya, buka periode',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({width:1440,height:1000});
  await expect(page.locator('aside.sidebar')).toHaveCSS('width', '224px');
  await page.screenshot({path:'.qa/period-admin-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Buka navigasi',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Master indikator',exact:true})).toBeVisible();
  await page.screenshot({path:'.qa/period-admin-mobile-sidebar.png'});
  await page.getByRole('button',{name:'Tutup navigasi',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});
  const after = await (await page.request.get('/api/views/indicators',{headers:headers('campus-001')})).json();
  expect(after.data.period.id).toBe(name);
  expect(after.data.indicators).toHaveLength(oldRows.length);
  expect(after.data.indicators.every((i:any)=>i.unfilled && i.note === '')).toBe(true);
  expect(after.data.submissions).toHaveLength(0);
  const incomplete = await page.request.post('/api/submissions',{headers:headers('campus-001'),data:{}});
  expect(incomplete.status()).toBe(400);
  const copied = after.data.definitions.find((d:any)=>d.name===source.name);
  expect(after.data.indicators.find((i:any)=>i.definitionId===copied.id).target).toBe(source.target+5);
  const archive = await (await page.request.get('/api/views/indicators?period='+encodeURIComponent(oldPeriod),{headers:headers('campus-001')})).json();
  expect(archive.data.indicators).toEqual(oldRows);
  const editOld = await page.request.patch('/api/indicators/'+oldRows[0].id,{headers:headers('campus-001'),data:{current:999,note:'forbidden'}});
  expect(editOld.status()).toBe(409);
  await login(page,'campus-001');
  await page.goto('/campus/indicators');
  const first = page.getByRole('article',{name:/^Indikator:/}).first();
  await expect(first.getByRole('spinbutton')).toHaveValue('');
  await expect(page.getByRole('button',{name:/^Kirim( ulang)? untuk verifikasi$/})).toBeDisabled();
  await first.getByRole('spinbutton').fill('0');
  await first.getByRole('textbox').fill('Capaian nol periode baru');
  await expect(page.getByRole('status',{name:'Status penyimpanan'})).toContainText('Semua perubahan tersimpan',{timeout:15000});
  await page.reload();
  await expect(first.getByRole('spinbutton')).toHaveValue('0');
  await expect(first.getByRole('textbox')).toHaveValue('Capaian nol periode baru');
  await page.getByLabel('Periode penilaian',{exact:true}).selectOption(oldPeriod);
  await expect(first.getByRole('spinbutton')).toBeDisabled();
  await expect(page.getByText('Arsip · hanya baca',{exact:true})).toBeVisible();
  await page.getByLabel('Periode penilaian',{exact:true}).selectOption(name);
  await expect(first.getByRole('spinbutton')).toBeEnabled();
  const saved = await (await page.request.get('/api/views/indicators',{headers:headers('campus-001')})).json();
  for (const i of saved.data.indicators.filter((i:any)=>i.unfilled)) {
    const fill = await page.request.patch('/api/indicators/'+i.id,{headers:headers('campus-001'),data:{current:0,note:''}});
    expect(fill.status()).toBe(200);
  }
  await page.reload();
  await page.getByRole('button',{name:'Kirim untuk verifikasi',exact:true}).click();
  await page.getByRole('button',{name:'Kirim data DEB',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(first.getByRole('spinbutton')).toBeDisabled();
  const submitted = await (await page.request.get('/api/views/indicators',{headers:headers('campus-001')})).json();
  expect(submitted.data.submissions[0].period).toBe(name);
  expect(submitted.data.submissions[0].version).toBe(1);
  const reviewed = await page.request.post(`/api/submissions/${submitted.data.submissions[0].id}/review`,{headers:headers('admin-1'),data:{decision:'revision',note:'QA selesai'}});
  expect(reviewed.status()).toBe(200);
  await page.reload();
  await page.screenshot({path:'.qa/period-campus-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Buka navigasi',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:'Indikator DEB',exact:true})).toBeVisible();
  await page.screenshot({path:'.qa/period-campus-mobile-sidebar.png'});
  await page.getByRole('button',{name:'Tutup navigasi',exact:true}).click();
  await page.setViewportSize({width:320,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
