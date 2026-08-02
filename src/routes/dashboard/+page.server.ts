import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionToken = cookies.get('__session');
	if (!sessionToken) {
		throw redirect(303, '/');
	}
	return {};
};