import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { CLERK_SECRET_KEY } from '$env/static/private';

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('__session');

	if (sessionToken) {
		try {
			const verified = await verifyToken(sessionToken, {
				secretKey: CLERK_SECRET_KEY
			});
			const user = await clerk.users.getUser(verified.sub);
			event.locals.user = {
				id: user.id,
				email: user.emailAddresses[0]?.emailAddress || '',
				name: user.firstName || user.username || 'User',
				imageUrl: user.imageUrl || undefined
			};
		} catch (e) {
			console.log('[Auth] verifyToken failed:', e instanceof Error ? e.message : e);
			event.cookies.delete('__session', { path: '/' });
		}
	}

	if (event.url.pathname.startsWith('/dashboard')) {
		if (!event.locals.user) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};
