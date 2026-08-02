import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import superjson from 'superjson';
import { db } from '$lib/db';
import { users } from '$lib/db/schema';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
	transformer: superjson
});

export const router = t.router({
	hello: t.procedure.query(async () => {
		const count = await db.select().from(users).all();
		return { message: 'tRPC is alive', userCount: count.length };
	}),

	user: t.procedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const result = await db.select().from(users).where(eq(users.id, input.id)).get();
			return result ?? null;
		})
});

export type Router = typeof router;