import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('__session');

	// Phase 0: Simple cookie check. In Phase 1 we'll verify the JWT properly.
	if (sessionToken) {
		// For now, just mark as potentially authenticated.
		// We'll populate real user data via tRPC + Clerk backend SDK later.
		event.locals.user = { id: 'pending', email: 'pending', name: 'pending' };
	}

	// Protect /dashboard routes
	if (event.url.pathname.startsWith('/dashboard')) {
		if (!sessionToken) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};
