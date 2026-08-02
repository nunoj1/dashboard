import type { RequestEvent } from '@sveltejs/kit';

export async function createContext(event: RequestEvent) {
	return {
		user: event.locals.user
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;