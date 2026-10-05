// Tool browser_run_code_unsafe; admin pada RAB menunggu pemeriksaan.
// Tidak mengirim catatan atau memberi keputusan.
async (page) => {
  const result = [];
  for (const [label, index] of [['RAB 100%', 1], ['RAB 70%', 2], ['RAB 30%', 3]]) {
    await page.locator('button').filter({ hasText: new RegExp('^' + label) }).click();
    await page.waitForFunction(index => document.querySelector('[aria-label="Ringkasan nilai sebelum keputusan"]')?.children[index]?.classList.contains('bg-blue-100'), index);
    const summary = page.locator('[aria-label="Ringkasan nilai sebelum keputusan"]');
    const values = await summary.locator(':scope > div > dd:first-of-type').allTextContents();
    const totals = await page.locator('[aria-label="Tabel perbandingan tiga RAB"] tfoot td').allTextContents();
    if (values.slice(1).join('|') !== totals.join('|')) throw Error('Ringkasan keputusan berbeda dari total RAB.');
    const aligned = await page.evaluate(() => {
      const a = document.querySelector('.review-actions textarea').getBoundingClientRect();
      const b = document.querySelector('.document-notes textarea').getBoundingClientRect();
      return Math.abs(a.left-b.left)<1 && Math.abs(a.right-b.right)<1 && Math.abs(a.height-b.height)<1;
    });
    if (!aligned) throw Error('Kolom catatan tidak sejajar.');
    result.push({ label, values });
  }
  return result;
}
