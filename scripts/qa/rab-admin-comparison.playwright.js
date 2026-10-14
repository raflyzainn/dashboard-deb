// Tool browser_run_code_unsafe; akun admin pada RAB dengan data tersimpan.
// Menguji tampilan dan navigasi butir tanpa memberi keputusan.
async (page) => {
  const original = page.url();
  const region = page.getByRole('region', { name: 'Tabel perbandingan tiga RAB' });
  const search = page.getByRole('searchbox', { name: 'Cari pada perbandingan RAB' });
  try {
    for (const label of ['RAB 100%', 'RAB 70%', 'RAB 30%']) {
      await page.locator('button').filter({ hasText: new RegExp('^' + label) }).click();
      await page.waitForFunction((label) => document.querySelector('[aria-label="Tabel perbandingan tiga RAB"] thead th[aria-current="true"]')?.textContent?.includes(label), label);
      const selected = await region.locator('thead th[aria-current="true"]').innerText();
      if (!selected.includes('Sedang diperiksa')) throw Error('Fokus keputusan tidak diberi label.');
    }
    const total = await region.locator('tfoot').innerText();
    const title = await region.locator('tbody th p').nth(1).innerText();
    await search.fill(title);
    if (await region.locator('tfoot').innerText() !== total) throw Error('Filter mengubah total.');
    return 'Klik ketiga butir mengubah fokus pemeriksaan; total tetap saat pencarian.';
  } finally {
    await search.fill('');
    await page.goto(original);
  }
}
