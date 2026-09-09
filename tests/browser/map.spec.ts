import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role: 'campus' | 'admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: role === 'campus' ? 'Masuk sebagai Kampus' : 'Masuk sebagai Admin PF' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
}

test('admin explores the campus map while campus cannot open an admin-only view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'admin');
  await page.goto('/admin/sebaran');
  await expect(page.getByRole('heading', { name: 'Peta Persebaran Kampus' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Peta Indonesia dengan 40 titik kampus mitra' })).toBeVisible();
  await expect(page.locator('.map-dot')).toHaveCount(40);
  await page.getByRole('button', { name: 'Perbesar peta' }).click();
  await expect(page.getByRole('status', { name: 'Tingkat pembesaran' })).toContainText('130%');
  await page.getByRole('button', { name: 'Atur ulang pembesaran' }).click();
  await expect(page.getByRole('status', { name: 'Tingkat pembesaran' })).toContainText('100%');
  const mapStage = page.locator('.map-stage');
  await mapStage.scrollIntoViewIfNeeded();
  const mapBounds = await mapStage.boundingBox();
  expect(mapBounds).not.toBeNull();
  if (!mapBounds) throw new Error('Map bounds are unavailable');
  const centerX = mapBounds.x + mapBounds.width / 2;
  const centerY = mapBounds.y + mapBounds.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -240);
  await expect(page.getByRole('status', { name: 'Tingkat pembesaran' })).toContainText('120%');
  const transformBeforeDrag = await page.locator('.map-world').getAttribute('style');
  await page.mouse.down();
  await page.mouse.move(centerX + 60, centerY + 35, { steps: 4 });
  await page.mouse.up();
  const transformAfterDrag = await page.locator('.map-world').getAttribute('style');
  expect(transformAfterDrag).not.toBe(transformBeforeDrag);
  expect(transformAfterDrag).toContain('--pan-x:');
  await page.getByRole('button', { name: 'Atur ulang pembesaran' }).click();
  await expect(page.locator('.map-world')).toHaveAttribute('style', /--zoom:\s*1;\s*--pan-x:\s*0px;\s*--pan-y:\s*0px/);
  const boundaryWheelWasPrevented = await mapStage.evaluate(element => {
    const event = new WheelEvent('wheel', { deltaY: 120, ctrlKey: true, bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(boundaryWheelWasPrevented).toBe(true);
  await page.getByLabel('Cari kampus di peta').fill('UNHAS');
  await expect(page.locator('.map-dot')).toHaveCount(1);
  await expect(page.locator('.map-dot[title="Universitas Hasanuddin"]')).toBeVisible();
  await page.locator('.map-dot[title="Universitas Hasanuddin"]').click();
  await expect(page.locator('.map-card')).toContainText('Universitas Hasanuddin');
  await expect(page.locator('.map-card').getByRole('link', { name: 'Lihat detail kampus' })).toHaveAttribute('href', '/admin/campuses/campus-028');
  await page.getByRole('button', { name: 'Tutup detail titik' }).click();
  await expect(page.locator('.map-card')).toHaveCount(0);
  await page.getByLabel('Cari kampus di peta').fill('');
  await page.getByLabel('Filter wilayah peta').selectOption('Papua');
  await expect(page.locator('.map-dot')).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Peta Persebaran Kampus' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await page.locator('.mobile-drawer').getByRole('button', { name: 'Keluar / ganti peran' }).click();
  await login(page, 'campus');
  await expect(page.locator('.sidebar').getByRole('link', { name: 'Peta Persebaran' })).toHaveCount(0);
  await page.goto('/admin/sebaran');
  await expect(page).toHaveURL(/\/campus\/dashboard$/);
  expect(errors).toEqual([]);
});
