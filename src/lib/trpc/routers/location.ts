import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { todoLocations } from '$lib/db/schema/index';
import { t } from '../init';

export const locationRouter = t.router({
	getAll: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		return db.select().from(todoLocations).orderBy(todoLocations.name).all();
	}),

	create: t.procedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db.select().from(todoLocations)
				.where(eq(todoLocations.name, input.name)).get();
			if (existing) return existing;

			const [loc] = await db.insert(todoLocations).values({
				userId: ctx.user.id,
				name: input.name
			}).returning();
			return loc;
		})
});

export type LocationRouter = typeof locationRouter;