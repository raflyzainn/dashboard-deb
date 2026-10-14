// Run through the Playwright browser tool on localhost:5176, signed in as campus-904.
// Uses the disposable Kampus QA Lokal 3 only. Never run this against another campus.
async page => {
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  assert(new URL(page.url()).hostname === '127.0.0.1', 'Local browser only');
  assert(await page.getByRole('heading', { name: 'Kampus QA Lokal 3', exact: true }).count() === 1, 'Use the disposable QA campus');
  await page.getByRole('button', { name: 'Data Program Draf', exact: true }).click();
  const form = page.getByRole('region', { name: 'Isi pengajuan', exact: true });
  await form.getByRole('textbox', { name: 'Alamat kampus', exact: false }).waitFor();
  assert(await form.getByRole('combobox', { name: 'Provinsi', exact: false }).count() === 1, 'Data Program must offer the province selector');
  const campus = form.getByRole('textbox', { name: 'Alamat kampus', exact: false });
  const originalCampus = await campus.inputValue();
  const full = form.getByRole('textbox', { name: 'Alamat lengkap lokasi program', exact: false });
  if (await full.isEnabled()) await full.fill('');
  const select = (name) => form.getByRole('combobox', { name, exact: false });
  await select('Provinsi').selectOption('31');
  await select('Kabupaten/Kota').selectOption('31.74');
  await select('Kecamatan').selectOption('31.74.01');
  await select('Desa/Kelurahan').selectOption('31.74.01.1001');
  const postal = form.getByRole('textbox', { name: 'Kode pos', exact: false });
  assert(await postal.inputValue() === '12820', 'Postal code must come from the selected village');
  assert((await full.inputValue()).includes('Tebet Timur'), 'Full address must be generated after selecting the village');
  assert(await campus.inputValue() === originalCampus, 'Program location must not change the campus address');
  const manual = 'Jl. Contoh QA No. 12, RT 001/RW 002, ' + await full.inputValue();
  await full.fill(manual);
  await select('Desa/Kelurahan').selectOption('31.74.01.1002');
  assert(await full.inputValue() === manual, 'Changing a village must preserve a manually edited address');
  assert(await postal.inputValue() === '12810', 'Postal code must follow the new village');
  await page.waitForFunction(async expected => {
    const response = await fetch('/api/pencairan/32859b9c98494e7/pengajuan');
    const data = await response.json();
    return data.journey?.fields.lokasiAlamatLengkap === expected && data.journey?.fields.lokasiDesaId === '31.74.01.1002';
  }, manual);
  await page.reload();
  await full.waitFor();
  assert(await full.inputValue() === manual, 'Manual address must survive a server reload');
  assert(await select('Desa/Kelurahan').inputValue() === '31.74.01.1002', 'Village ID must survive a server reload');
  const checks = await page.evaluate(async () => {
    const { buildMergeData } = await import('/src/lib/merge.ts');
    const { mergeInput } = await import('/src/lib/pengajuan/journey.ts');
    const { programLocationErrors } = await import('/src/lib/pengajuan/location.ts');
    const url = '/api/pencairan/32859b9c98494e7/pengajuan';
    const saved = await (await fetch(url)).json();
    const fields = saved.journey.fields;
    const merged = buildMergeData(mergeInput(saved.validation.campus, { journey: saved.journey, versions: [] }, {}));
    const invalid = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { lokasiKabupatenId: '32.01' }, revision: saved.journey.revision, expectedRevision: saved.serverRevision }) });
    const error = await invalid.json();
    return {
      separate: merged.alamatPerguruanTinggi === fields.alamat && merged.lokasiProgram === fields.lokasiAlamatLengkap,
      complete: programLocationErrors(fields, true).length === 0,
      rejected: invalid.status === 400 && error.message?.includes('tidak sesuai')
    };
  });
  assert(checks.separate, 'Document mapping must keep the campus and program addresses separate');
  assert(checks.complete, 'A full location must pass the shared submit validator');
  assert(checks.rejected, 'The backend must reject a regency from a different province');
  await form.getByRole('button', { name: 'Susun ulang dari wilayah', exact: true }).click();
  assert((await full.inputValue()).startsWith('Tebet Barat'), 'Explicit regeneration must use the current village');
  await select('Provinsi').selectOption('32');
  assert(await select('Kabupaten/Kota').inputValue() === '', 'Changing province must clear regency');
  assert(await select('Kecamatan').inputValue() === '', 'Changing province must clear district');
  assert(await select('Desa/Kelurahan').inputValue() === '', 'Changing province must clear village');
  assert(await postal.inputValue() === '', 'Changing province must clear postal code');
  assert(await full.inputValue() === '', 'An automatic address must clear when its hierarchy is incomplete');
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout must not overflow');
  await page.setViewportSize({ width: 1366, height: 900 });
  return { cascade: true, autoAddress: true, manualPreserved: true, backendReload: true, campusSeparate: true, documentsSeparate: true, serverValidation: true, mobile: true };
}
