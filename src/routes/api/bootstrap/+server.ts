import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { previewEndpoint } from '$lib/server/deb/http';
import { createDebRepository } from '$lib/server/deb/repository';
import { mapSession } from '$lib/server/deb/mappers';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const repository = createDebRepository(pb);
  const [data, locations] = await Promise.all([repository.load(), repository.locations()]);
  return json({ session: mapSession(pb.authStore.record!), data: { ...data, locations }, locations, capabilities: { readOnly: true }, loadedAt: new Date().toISOString() });
});
