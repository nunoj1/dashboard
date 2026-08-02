import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { Router } from './router';

let browserClient: ReturnType<typeof createTRPCClient<Router>> | undefined;

export function trpc() {
	const isBrowser = typeof window !== 'undefined';
	if (isBrowser && browserClient) return browserClient;

	const client = createTRPCClient<Router>({
		links: [
			httpBatchLink({
				url: '/api/trpc',
				transformer: superjson
			})
		]
	});

	if (isBrowser) browserClient = client;
	return client;
}