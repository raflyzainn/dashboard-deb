import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PUT: RequestHandler = event => workflow(event, 'setLike', [], {"liked":true});
export const DELETE: RequestHandler = event => workflow(event, 'setLike', [], {"liked":false});
