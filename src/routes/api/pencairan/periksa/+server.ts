import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN } from '$lib/server/deb/access';
import { reviewQueue } from '$lib/server/deb/pencairan';

/** The review queue: every item across the funded campuses that waits for an admin, newest arrival first. */
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => ok({ rows: await reviewQueue(pb) }));
