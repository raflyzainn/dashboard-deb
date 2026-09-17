import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { samplePdf } from '../../scripts/fixtures/pdf';

async function login(page: Page, key: string) {
  await page.goto('/login');
  if (key.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
  await expect(page).toHaveURL(/\/(campus|admin)\/dashboard$/);
}
const headers = (key: string) => ({ 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': key, 'Idempotency-Key': randomUUID() });
async function boot(page: Page, key: string) {
  const r = await page.request.get('/api/bootstrap', { headers: headers(key) });
  expect(r.status()).toBe(200); return r.json();
}

test('UI question, shared answer, likes, FAQ and private notifications persist', async ({ page, browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [admin, other, secondAdmin] = await Promise.all(contexts.map(c => c.newPage()));
  try {
    await login(page, 'campus-039'); await login(admin, 'admin-1'); await login(other, 'campus-040'); await login(secondAdmin, 'admin-2');
    await page.goto('/campus/questions');
    await page.getByRole('button', { name: 'Ajukan pertanyaan', exact: true }).click();
    await page.getByLabel('Judul pertanyaan').fill('QA P3 proposal lintas kampus');
    await page.getByLabel('Uraian pertanyaan').fill('Bagaimana mengunggah proposal terbaru?');
    await page.getByRole('checkbox', { name: 'Proposal', exact: true }).check();
    // A failed network write keeps form input for retry.
    await page.route('**/api/questions', route => route.abort());
    await page.getByRole('button', { name: 'Bagikan pertanyaan' }).click();
    await expect(page.getByLabel('Judul pertanyaan')).toHaveValue('QA P3 proposal lintas kampus');
    await page.unroute('**/api/questions');
    await page.getByRole('button', { name: 'Bagikan pertanyaan' }).click();
    await expect(page).toHaveURL(/\/campus\/questions\/[a-z0-9]{15}$/);
    const id = page.url().split('/').at(-1)!;
    await page.reload(); await expect(page.locator('h1')).toHaveText('QA P3 proposal lintas kampus');
    await other.goto('/campus/questions/' + id); await expect(other.locator('h1')).toHaveText('QA P3 proposal lintas kampus');
    await other.locator('.question-bottom .like-button').click();
    await expect(other.locator('.question-bottom .like-button')).toHaveAttribute('aria-pressed','true');
    await other.reload(); await expect(other.locator('.question-bottom .like-button')).toHaveAttribute('aria-pressed','true');
    await admin.goto('/admin/questions/' + id);
    await admin.getByLabel('Jawaban untuk semua kampus').fill('Jawaban QA: gunakan PDF terbaru melalui halaman Proposal.');
    await admin.getByRole('button',{name:'Simpan jawaban'}).click();
    await expect(admin.locator('.official-answer')).toContainText('Jawaban QA');
    await admin.getByRole('button',{name:'Jadikan FAQ'}).click();
    await expect(admin.getByRole('button',{name:'Sudah masuk FAQ'})).toBeDisabled();
    await page.goto('/campus/questions');
    await page.getByRole('textbox',{name:'Cari pertanyaan'}).fill('Jawaban QA');
    await expect(page.getByRole('link',{name:'QA P3 proposal lintas kampus'}).first()).toBeVisible();
    await page.goto('/campus/notifications');
    const notice=page.locator('.notification-list article').filter({hasText:'Admin menjawab pertanyaan Anda.'}).first();
    await notice.getByRole('link',{name:'Lihat detail'}).click();
    await expect(page).toHaveURL(new RegExp('/campus/questions/'+id+'$'));
    const own=(await boot(page,'campus-039')).data.notifications;
    expect(own.find((n:{href:string})=>n.href.endsWith(id)).readAt).toBeTruthy();
    await admin.goto('/admin/notifications'); await admin.getByRole('button',{name:'Tandai semua dibaca'}).click();
    await expect(admin.locator('.notification-top')).toContainText('0 belum dibaca');
    const untouched=(await boot(secondAdmin,'admin-2')).data.notifications;
    expect(untouched.some((n:{href:string;readAt:string|null})=>n.href.endsWith(id)&&!n.readAt)).toBe(true);
    await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'test-results/p3-question-mobile.png',fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  } finally { await Promise.all(contexts.map(c=>c.close())); }
});

test('UI uploads two real PDFs, rejects false PDF, downloads as admin and denies another campus', async ({page,browser}) => {
  const context=await browser.newContext(),admin=await context.newPage();
  try {
    await login(page,'campus-038'); await login(admin,'admin-1');
    await page.goto('/campus/proposal');
    await page.getByRole('button',{name:'Unggah versi baru'}).click();
    await page.getByLabel('File proposal PDF').setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});
    await page.getByLabel('Catatan perubahan').fill('QA invalid PDF');
    await page.getByRole('button',{name:'Ajukan versi baru'}).click();
    await expect(page.getByRole('dialog')).toContainText('File harus berupa PDF');
    await page.getByRole('button',{name:'Batal',exact:true}).click();
    for(const version of [1,2]) {
      await page.getByRole('button',{name:'Unggah versi baru'}).click();
      await page.getByLabel('File proposal PDF').setInputFiles({name:`qa-p3-${version}.pdf`,mimeType:'application/pdf',buffer:Buffer.from(await samplePdf('QA P3 Browser',version).arrayBuffer())});
      await page.getByLabel('Catatan perubahan').fill(`QA perubahan versi ${version}`);
      await page.getByRole('button',{name:'Ajukan versi baru'}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.version-list')).toContainText(`QA perubahan versi ${version}`);
    }
    await page.reload(); await expect(page.locator('.version-list')).toContainText('QA perubahan versi 2');
    await expect(page.locator('.comparison')).toContainText('Versi 2');
    await expect(page.locator('.comparison')).not.toContainText('Membaca teks PDF',{timeout:30000});
    const snapshot=await boot(page,'campus-038');
    const latest=snapshot.data.proposals.sort((a:{version:number},b:{version:number})=>b.version-a.version)[0];
    expect((await page.request.get(`/api/proposals/${latest.id}/file`,{headers:headers('campus-040')})).status()).toBe(404);
    await admin.goto('/admin/proposal');
    await admin.getByLabel('Pilih kampus proposal').selectOption(snapshot.session.campusId);
    await admin.getByRole('button',{name:'Lihat proposal',exact:true}).click();
    await expect(admin.locator('iframe')).toHaveAttribute('src',/^blob:/);
    const download=admin.waitForEvent('download');
    await admin.getByRole('link',{name:'Unduh PDF'}).click();
    expect((await download).suggestedFilename()).toBe('qa-p3-2.pdf');
    await page.screenshot({path:'test-results/p3-proposal-desktop.png',fullPage:true});
  } finally {await context.close();}
});

test('UI indicator and review cycle preserves history, locks pending and rejects forged APIs', async ({page,browser})=>{
  const context=await browser.newContext(),admin=await context.newPage();
  try {
    await login(page,'campus-037'); await login(admin,'admin-1');
    const snapshot=await boot(page,'campus-037');
    const indicator=snapshot.data.indicators[0], definition=snapshot.data.definitions.find((d:{id:string})=>d.id===indicator.definitionId);
    await page.goto('/campus/indicators');
    await page.getByRole('button',{name:'Lihat '+definition.name,exact:true}).click();
    await page.getByLabel('Nilai aktual').fill('12'); await page.getByLabel('Catatan perkembangan').fill('QA P3 awal');
    await page.getByRole('button',{name:'Simpan perubahan'}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button',{name:'Kirim untuk verifikasi',exact:true}).click();
    await page.getByRole('button',{name:'Kirim data DEB',exact:true}).click();
    await expect(page.getByRole('region',{name:'Status pengajuan DEB'})).toContainText('Menunggu verifikasi');
    await page.getByRole('button',{name:'Lihat '+definition.name,exact:true}).click();
    await expect(page.getByRole('button',{name:'Simpan perubahan'})).toBeDisabled(); await page.keyboard.press('Escape');
    const submitted=(await boot(page,'campus-037')).data.submissions[0];
    await admin.goto('/admin/verifikasi?submission='+submitted.id);
    await admin.getByLabel('Catatan keputusan').fill('QA perbaiki catatan');
    await admin.getByRole('button',{name:'Minta Revisi',exact:true}).click();
    await admin.getByRole('dialog').getByRole('button',{name:'Konfirmasi keputusan'}).click();
    await expect(admin.getByRole('dialog')).toHaveCount(0);
    await page.reload(); await expect(page.getByRole('region',{name:'Status pengajuan DEB'})).toContainText('Perlu revisi');
    await page.getByRole('button',{name:'Lihat '+definition.name,exact:true}).click();
    await page.getByLabel('Catatan perkembangan').fill('QA P3 sudah direvisi'); await page.getByRole('button',{name:'Simpan perubahan'}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button',{name:'Kirim ulang untuk verifikasi',exact:true}).click();
    await page.getByRole('button',{name:'Kirim data DEB',exact:true}).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
    const current=(await boot(page,'campus-037')).data.submissions.sort((a:{version:number},b:{version:number})=>b.version-a.version)[0];
    await admin.goto('/admin/verifikasi?submission='+current.id);
    // Seeded feedback is part of this campus too; approval correctly waits for it.
    while (await admin.locator('.comments-panel').getByRole('button',{name:'Tandai selesai'}).count()) {
      const close = admin.locator('.comments-panel').getByRole('button',{name:'Tandai selesai'}).first();
      await close.click();
      await expect(admin.getByRole('button',{name:'Muat ulang data',exact:true})).toBeEnabled();
    }
    await admin.getByRole('button',{name:'Konfirmasi data',exact:true}).click();
    await admin.getByRole('dialog').getByRole('button',{name:'Konfirmasi keputusan'}).click();
    await expect(admin.getByRole('dialog')).toHaveCount(0);
    await page.reload(); await expect(page.getByRole('region',{name:'Status pengajuan DEB'})).toContainText('Terverifikasi');
    expect((await page.request.patch('/api/indicators/'+indicator.id,{headers:headers('campus-040'),data:{current:999,note:'forged',role:'admin',campusId:snapshot.session.campusId}})).status()).toBe(404);
    expect((await page.request.post('/api/submissions/'+current.id+'/review',{headers:headers('campus-037'),data:{decision:'approved',note:''}})).status()).toBe(403);
    await admin.screenshot({path:'test-results/p3-review-desktop.png',fullPage:true});
  } finally {await context.close();}
});
