import type { RequestHandler } from './$types';
import { journeyRequest } from '$lib/server/deb/journey';
export const GET:RequestHandler=event=>journeyRequest(event,true);
