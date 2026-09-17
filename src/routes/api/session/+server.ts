import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { mapSession } from '$lib/server/deb/mappers';
import { readNavigation } from '$lib/server/deb/page-reads';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const session = mapSession(pb.authStore.record!);
  return json({ session, capabilities: { readOnly: false }, navigation: await readNavigation(pb, session) });
});
