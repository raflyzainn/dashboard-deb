import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { samplePdf } from '../../scripts/fixtures/pdf';
const headers = (account: string) => ({ Origin: 'http://127.0.0.1:5177', 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': account, 'Idempotency-Key': randomUUID() });
async function login(page: Page, account: string) {
  await page.goto('/login?qa=1');
  if (account.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${account}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
test('proposal versions preview automatically and admin responses persist with campus isolation', async ({ page, browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext(); const admin = await context.newPage();
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); admin.on('pageerror', e => errors.push(e.message));
  try {
    await login(page, 'campus-010');
    const uploaded: string[] = [];
    for (const version of [1,2]) {
      const response = await page.request.post('/api/proposals', { headers: headers('campus-010'), multipart: {
        file: { name: `proposal-qa-${version}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(await samplePdf('Proposal QA',version).arrayBuffer()) }, changes: 'Catatan QA '+version
      }});
      expect(response.status(), await response.text()).toBe(200); uploaded.push((await response.json()).id);
    }
    await page.goto('/campus/proposal');
    await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
    await expect(page.getByRole('button', { name:'Lihat proposal',exact:true })).toHaveCount(0);
    await expect(page.getByRole('region', { name:'Perbandingan proposal' })).toHaveCount(0);
    await expect(page.locator('iframe')).toHaveAttribute('title','Pratinjau proposal-qa-2.pdf');
    await expect(page.locator('iframe')).toHaveCount(1);
    await expect(page.getByRole('heading',{name:'Proposal terbaru',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Riwayat versi',exact:true})).toBeVisible();
    await expect(page.locator('iframe')).toHaveCSS('height','300px');
    const data = await (await page.request.get('/api/views/proposals', {headers:headers('campus-010')})).json();
    const latest = data.data.proposals.find((p:any)=>p.id===uploaded[1]);
    const previous = data.data.proposals.find((p:any)=>p.id===uploaded[0]);
    expect((await page.request.post(`/api/proposals/${latest.id}/review`, {headers:headers('campus-010'),data:{note:'forged',revision:0}})).status()).toBe(403);
    expect((await page.request.get(`/api/proposals/${latest.id}/file`, {headers:headers('campus-011')})).status()).toBe(404);
    await login(admin,'admin-1'); await admin.goto('/admin/proposal');
    await admin.getByLabel('Pilih kampus proposal').selectOption(latest.campusId);
    await expect(admin.locator('iframe')).toHaveAttribute('title','Pratinjau proposal-qa-2.pdf');
    await expect(admin.locator('iframe')).toHaveAttribute('src',/^blob:/);
    const note = 'Mohon lengkapi jadwal kegiatan. <script>literal</script>';
    await admin.getByLabel('Isi tanggapan admin').fill(note);
    await admin.getByRole('button',{name:'Simpan tanggapan',exact:true}).click();
    await expect(admin.getByRole('region',{name:'Tanggapan admin'}).getByText(note,{exact:true})).toBeVisible();
    await admin.reload();
    await admin.getByLabel('Pilih kampus proposal').selectOption(latest.campusId);
    await expect(admin.getByLabel('Isi tanggapan admin')).toHaveValue(note);
    expect((await admin.request.post(`/api/proposals/${latest.id}/review`, {headers:headers('admin-1'),data:{note:'stale',revision:0}})).status()).toBe(409);
    await page.reload();
    await expect(page.getByRole('region',{name:'Tanggapan admin'}).getByText(note,{exact:true})).toBeVisible();
    await expect(page.getByLabel('Isi tanggapan admin')).toHaveCount(0);
    await page.getByLabel('Pilih versi proposal').selectOption(previous.id);
    await expect(page.locator('iframe')).toHaveAttribute('title','Pratinjau proposal-qa-1.pdf');
    await expect(page.getByRole('region',{name:'Tanggapan admin'})).toContainText('Belum ada tanggapan');
    await page.goto('/campus/proposal?version='+latest.id);
    await expect(page.locator('iframe')).toHaveAttribute('title','Pratinjau proposal-qa-2.pdf');
    await page.route(`**/api/proposals/${latest.id}/file`, route => route.abort());
    await page.reload(); await expect(page.getByRole('button',{name:'Coba lagi',exact:true})).toBeVisible();
    await page.unroute(`**/api/proposals/${latest.id}/file`);
    await page.getByRole('button',{name:'Coba lagi',exact:true}).click();
    await expect(page.locator('iframe')).toHaveAttribute('src',/^blob:/);
    const download=page.waitForEvent('download');await page.getByRole('link',{name:'Unduh PDF',exact:true}).click();expect((await download).suggestedFilename()).toBe('proposal-qa-2.pdf');
    await page.screenshot({path:'.qa/proposal-versions-campus-desktop.png',fullPage:true});
    await admin.screenshot({path:'.qa/proposal-versions-admin-desktop.png',fullPage:true});
    for(const p of [page,admin]) {await p.setViewportSize({width:390,height:844});expect(await p.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);}
    await page.screenshot({path:'.qa/proposal-versions-campus-mobile.png',fullPage:true});
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
