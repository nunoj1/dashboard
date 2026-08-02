import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { todoCategories } from '$lib/db/schema/index';
import { t } from '../init';

export const categoryRouter = t.router({
	getAll: t.procedure.query(async () => {
		return db.select().from(todoCategories).orderBy(todoCategories.name).all();
	}),

	create: t.procedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ input }) => {
			const existing = await db.select().from(todoCategories).where(eq(todoCategories.name, input.name)).get();
			if (existing) return existing;

			const [cat] = await db.insert(todoCategories).values({
				userId: 'temp',
				name: input.name
			}).returning();
			return cat;
		})
});

export type CategoryRouter = typeof categoryRouter;