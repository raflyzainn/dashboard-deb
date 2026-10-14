import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from './http';
import { mapSession } from './mappers';
import { readPage } from './page-reads';
import type { PageView } from '../../page-data';
import { PreviewError } from './preview-error';
import { serverClient } from './server-client';
import { directory } from './pencairan';

export function pageEndpoint(view: PageView): RequestHandler {
  return event => previewEndpoint(event, async context => {
    const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
    const campus = event.url.searchParams.get('campus') || undefined;
    const question = event.url.searchParams.get('question') || undefined;
    for (const id of [campus, question]) if (id && !/^[a-z0-9]{15}$/.test(id)) throw new PreviewError(400, 'ID tidak valid.');
    const actor = mapSession(pb.authStore.record!);
    const feedPb = ['dashboard', 'campuses', 'campus-detail', 'map'].includes(view) && actor.role === 'admin' ? (await serverClient()).pb : undefined;
    const data = await readPage(pb, actor, { view, campus, question, period: event.url.searchParams.has('period') ? event.url.searchParams.get('period')! : undefined, tab: event.url.searchParams.get('tab') || undefined }, feedPb);
    if (feedPb) {
      const rows = await directory(feedPb);
      data.campusPayouts = Object.fromEntries(rows.filter(row => data.campuses?.some(c => c.id === row.campus.id)).map(row => [row.campus.id, row.progress]));
    }
    return json({ data, loadedAt: new Date().toISOString() });
  });
}
