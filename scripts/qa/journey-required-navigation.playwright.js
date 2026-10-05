// Jalankan melalui tool Playwright pada salinan demo 5186 yang sudah login kampus.
// Kabupaten/kota dipulihkan sesudah pemeriksaan; tidak ditujukan untuk produksi.
async (page) => {
  if (new URL(page.url()).origin !== 'http://127.0.0.1:5186') throw Error('Gunakan salinan demo 5186.');
  await page.goto('http://127.0.0.1:5186/campus/pencairan?bagian=program');
  const field = page.getByLabel('Kabupaten / kota', { exact: true });
  const next = page.getByRole('button', { name: 'Lanjut: Pengajuan RAB', exact: true });
  const saved = await field.inputValue();
  try {
    await field.fill('   '); await field.blur();
    await page.waitForTimeout(1500);
    if (!await next.isDisabled()) throw Error('Isian spasi tidak boleh mengaktifkan Lanjut.');
    await page.getByRole('button', { name: /^RAB 100%/ }).click();
    await page.waitForTimeout(500);
    if (!page.url().includes('bagian=program')) throw Error('Menu samping melewati validasi.');
    const marker = await field.evaluate(el => ({
      edge: getComputedStyle(el.closest('label'), '::after').content,
      caption: getComputedStyle(el.closest('label').querySelector('.field-caption'), '::after').content
    }));
    if (marker.edge !== 'none' || !marker.caption.includes('*')) throw Error('Posisi bintang wajib salah.');
    return { emptyBlocked: true, sidebarBlocked: true, markerBesideLabel: true };
  } finally { await field.fill(saved); await field.blur(); await page.waitForTimeout(1500); }
}
