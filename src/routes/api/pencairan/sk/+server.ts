import type { RequestHandler } from '@sveltejs/kit';
import { secured, ANY } from '$lib/server/deb/access';
import { storage } from '$lib/server/deb/r2';
import { skFileResponse } from '$lib/server/deb/pencairan';

/** The SK scan, one file for all funded campuses. Signed in users only; the viewer opens it on the Lampiran I page. */
export const GET: RequestHandler = event => secured(event, ANY, async ({ pb, settings }) => skFileResponse(pb, storage(settings)));
