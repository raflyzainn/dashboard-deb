import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PATCH: RequestHandler = event => workflow(event, 'updateIndicator', ["current","note"], {});
