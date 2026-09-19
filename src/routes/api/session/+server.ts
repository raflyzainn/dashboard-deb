import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { mapSession } from '$lib/server/deb/mappers';
import { readNavigation } from '$lib/server/deb/page-reads';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const session = mapSession(pb.authStore.record!);
  if (session.passwordChangeRequired) return json({ session, capabilities: { readOnly: true }, navigation: { pendingCount: 0, revisionCount: 0, unreadCount: 0 } });
  return json({ session, capabilities: { readOnly: false }, navigation: await readNavigation(pb, session) });
});
