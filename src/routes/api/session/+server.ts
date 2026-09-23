import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { mapSession } from '$lib/server/deb/mappers';
import { readNavigation } from '$lib/server/deb/page-reads';
import { serverClient } from '$lib/server/deb/server-client';
import { writeAudit } from '$lib/server/deb/audit';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const selected = event.request.headers.get('x-deb-preview-account');
  const pb = await context.account(selected);
  const session = mapSession(pb.authStore.record!);
  const readOnly = Boolean(session.passwordChangeRequired);
  const navigation = readOnly ? { pendingCount: 0, revisionCount: 0, unreadCount: 0 } : await readNavigation(pb, session);
  if (!event.locals.pb && selected && event.cookies.get('deb_local_preview') !== selected && session.role === 'campus') {
    const { pb: backend } = await serverClient();
    await writeAudit(backend, { actor: pb.authStore.record!, action: 'masuk ke aplikasi', context: `kampus:${session.campusId}/akses`, collection: 'users', record: session.id, campus: session.campusId });
  }
  return json({ session, capabilities: { readOnly }, navigation });
});
