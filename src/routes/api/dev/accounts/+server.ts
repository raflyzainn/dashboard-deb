import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { previewEndpoint } from '$lib/server/deb/http';
export const GET: RequestHandler = event => previewEndpoint(event, async context => json({ accounts: await context.accounts() }));
