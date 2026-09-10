import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from './http';
import { mapSession } from './mappers';
import { readPage } from './page-reads';
import type { PageView } from '../../page-data';
import { PreviewError } from './preview-error';

export function pageEndpoint(view: PageView): RequestHandler {
  return event => previewEndpoint(event, async context => {
    const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
    const campus = event.url.searchParams.get('campus') || undefined;
    const question = event.url.searchParams.get('question') || undefined;
    for (const id of [campus, question]) if (id && !/^[a-z0-9]{15}$/.test(id)) throw new PreviewError(400, 'ID tidak valid.');
    const data = await readPage(pb, mapSession(pb.authStore.record!), { view, campus, question, tab: event.url.searchParams.get('tab') || undefined });
    return json({ data, loadedAt: new Date().toISOString() });
  });
}
