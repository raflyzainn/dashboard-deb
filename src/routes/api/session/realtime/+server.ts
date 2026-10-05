import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN } from '$lib/server/deb/access';

/**
 * A short lived PocketBase token for the signed in admin, used by the browser for one thing only: subscribing to the change
 * feed (the audit collection, whose list and view rules admit active admins). Every read and write of data still goes
 * through this server. The token is the admin's own PocketBase identity, minted by the server.
 */
const LIFETIME_SECONDS = 2 * 60 * 60;

export const GET: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb, settings }) => {
  const client = await pb.collection('users').impersonate(actor.record.id, LIFETIME_SECONDS);
  return ok({ url: new URL(settings.PB_URL).origin, token: client.authStore.token, expiresAt: new Date(Date.now() + LIFETIME_SECONDS * 1000).toISOString() });
});
