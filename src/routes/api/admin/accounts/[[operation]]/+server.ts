import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { serverClient } from '$lib/server/deb/server-client';
import { executeAccount } from '$lib/server/deb/backend';
import { readJsonBody } from '$lib/server/deb/request-body';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const backend = await serverClient();
  return json(await executeAccount(backend.pb, backend.settings, pb.authStore.record, 'read', {}, event.getClientAddress(), Object.fromEntries(event.url.searchParams)));
});
export const POST: RequestHandler = event => previewEndpoint(event, async context => {
  if (!['save'].includes(event.params.operation || '')) return json({ message: 'Tidak ditemukan.' }, { status: 404 });
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const body=await readJsonBody(event.request,65536);
  const backend = await serverClient();
  return json(await executeAccount(backend.pb, backend.settings, pb.authStore.record, 'save', body, event.getClientAddress()));
});
