import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PATCH: RequestHandler = event => workflow(event, 'saveFaq', ["question","answer"], {});
export const DELETE: RequestHandler = event => workflow(event, 'deleteFaq', [], {});
