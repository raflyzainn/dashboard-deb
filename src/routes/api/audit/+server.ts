import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ANY } from '$lib/server/deb/access';
import { readAudit } from '$lib/server/deb/audit';

/** History for one page context. Campus accounts only see contexts of their own campus. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const context = event.url.searchParams.get('context') || '';
  if (!/^[a-z0-9:_/.-]{1,120}$/i.test(context)) fail(400, 'Konteks riwayat tidak valid.');
  if (!actor.admin) {
    const own = actor.campusId && context.startsWith('kampus:' + actor.campusId);
    if (!own) fail(403, 'Riwayat ini bukan milik kampus Anda.');
  }
  const page = Math.max(1, Number(event.url.searchParams.get('page') || 1) || 1);
  return ok(await readAudit(pb, context, page, 20));
});
