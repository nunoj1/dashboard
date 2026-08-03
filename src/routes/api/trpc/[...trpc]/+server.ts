import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { router } from '$lib/trpc/router';
import { createContext } from '$lib/trpc/context';
import type { RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = async (event) => {
	return fetchRequestHandler({
		endpoint: '/api/trpc',
		req: event.request,
		router,
		createContext: () => createContext(event)
	});
};

export const GET = handler;
export const POST = handler;
