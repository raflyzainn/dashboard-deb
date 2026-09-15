import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.use({ hasTouch: true });

async function checkTargets(page: Page) {
  const targets = await page.locator('.map-dot').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height };
  }));
  expect(targets.length).toBeGreaterThan(0);
  for (let i = 0; i < targets.length; i++) {
    expect(targets[i].width).toBeCloseTo(24, 0);
    for (let j = i + 1; j < targets.length; j++) expect(Math.hypot(targets[i].x - targets[j].x, targets[i].y - targets[j].y)).toBeGreaterThanOrEqual(25.9);
  }
}

for (const width of [390, 320, 1280]) test(`mobile map keeps ITB and Unpad selectable at ${width}px`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/login?qa=1');
  await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator('input[name="preview-account"][value="admin-1"]').check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/, { timeout: 30000 });
  await page.goto('/admin/sebaran');
  await expect(page.locator('.map-dot')).toHaveCount(40, { timeout: 30000 });
  await expect(page.locator('.map-cluster')).toHaveCount(0);
  await checkTargets(page);
  await page.locator('.map-stage').scrollIntoViewIfNeeded();
  expect(await page.locator('.map-dot').evaluateAll(nodes => nodes.every(node => {
    const box = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }))).toBe(true);
  await mkdir('.qa/mobile-map', { recursive: true });
  await page.locator('.map-panel').screenshot({ path: `.qa/mobile-map/map-${width}.png` });
  await page.getByTitle('Institut Teknologi Bandung', { exact: true }).tap();
  await expect(page.locator('.map-card')).toContainText('Institut Teknologi Bandung');
  await page.getByTitle('Universitas Padjadjaran', { exact: true }).tap();
  await expect(page.locator('.map-card')).toContainText('Universitas Padjadjaran');
  await page.locator('.map-panel').screenshot({ path: `.qa/mobile-map/unpad-${width}.png` });
  await page.getByRole('button', { name: 'Tutup detail titik' }).tap();
  await page.getByRole('button', { name: 'Perbesar peta' }).tap();
  await expect(page.getByRole('status', { name: 'Tingkat pembesaran' })).toHaveText('130%');
  await expect.poll(async () => (await page.locator('.map-dot').first().boundingBox())!.width).toBeCloseTo(24, 0);
  await checkTargets(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('button', { name: 'Atur ulang pembesaran' }).tap();
  await expect(page.getByRole('status', { name: 'Tingkat pembesaran' })).toHaveText('100%');
  await expect.poll(async () => (await page.locator('.map-dot').first().boundingBox())!.width).toBeCloseTo(24, 0);
  await checkTargets(page);
  await page.setViewportSize({ width, height: 844 });
  await page.getByLabel('Cari kampus di peta').fill('Institut Teknologi Bandung');
  await expect(page.locator('.map-dot')).toHaveCount(1);
  const aligned = await page.locator('.map-dot').evaluate(node => {
    const marker = node as HTMLElement, svg = document.querySelector('.archipelago') as SVGSVGElement;
    const local = svg.createSVGPoint(); local.x = parseFloat(marker.style.left) * 10; local.y = parseFloat(marker.style.top) * 5.2;
    const projected = local.matrixTransform(svg.getScreenCTM()!);
    const box = marker.getBoundingClientRect();
    return Math.hypot(projected.x - box.x - box.width / 2, projected.y - box.y - box.height / 2);
  });
  expect(aligned).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
