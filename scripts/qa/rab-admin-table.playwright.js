// Tool browser_run_code_unsafe; akun admin pada butir RAB yang memiliki data.
// Hanya mengubah filter tampilan, tanpa memberi keputusan.
async (page) => {
  await page.getByText('Lihat rincian RAB 100% dari Excel', { exact: true }).click();
  const region = page.getByRole('region', { name: 'Rincian sumber RAB 100%' });
  const search = page.getByRole('searchbox', { name: 'Cari item atau kode' });
  const groups = page.getByRole('checkbox', { name: 'Tampilkan kelompok kegiatan' });
  await search.fill('');
  await groups.uncheck();
  const count = await region.locator('tbody tr').count();
  const total = await region.locator('tfoot').innerText();
  const code = await region.locator('tbody th span').first().innerText();
  try {
    await search.fill(code);
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="Rincian sumber RAB 100%"] tbody tr').length === 1);
    if (await region.locator('tfoot').innerText() !== total) throw Error('Filter mengubah total RAB.');
    await search.fill('');
    await groups.check();
    if (await region.locator('tbody tr').count() <= count) throw Error('Kelompok kegiatan tidak tampil.');
    return 'Pencarian kode menampilkan item, total tetap, dan kelompok dapat dibuka.';
  } finally {
    await search.fill('');
    await groups.uncheck();
  }
}
