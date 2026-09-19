import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ANY } from '$lib/server/deb/access';
import { directory } from '$lib/server/deb/pencairan';

/** Directory of the funded campuses with their document statuses. Campus accounts only see their own row. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ actor, pb }) => {
  const rows = await directory(pb);
  return ok({ rows: actor.admin ? rows : rows.filter(r => r.campus.id === actor.campusId) });
});
