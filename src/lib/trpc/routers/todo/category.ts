import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { todoCategories } from '$lib/db/schema/index';
import { t } from '../../init';

export const categoryRouter = t.router({
	getAll: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		return db.select().from(todoCategories).orderBy(todoCategories.name).all();
	}),

	create: t.procedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(todoCategories)
				.where(eq(todoCategories.name, input.name))
				.get();
			if (existing) return existing;

			const [cat] = await db
				.insert(todoCategories)
				.values({
					userId: ctx.user.id,
					name: input.name
				})
				.returning();
			return cat;
		})
});

export type CategoryRouter = typeof categoryRouter;
