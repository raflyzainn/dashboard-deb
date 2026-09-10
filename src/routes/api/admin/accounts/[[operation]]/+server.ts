import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  return json(await pb.send('/api/deb/accounts' + event.url.search, { method: 'GET' }));
});
export const POST: RequestHandler = event => previewEndpoint(event, async context => {
  if (!['save'].includes(event.params.operation || '')) return json({ message: 'Tidak ditemukan.' }, { status: 404 });
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const body = await event.request.json();
  return json(await pb.send('/api/deb/accounts/' + event.params.operation, { method: 'POST', body, headers: { 'Idempotency-Key': event.request.headers.get('idempotency-key') || '' } }));
});
