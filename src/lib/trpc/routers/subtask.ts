import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { todoSubtasks } from '$lib/db/schema/index';
import { t } from '../init';

export const subtaskRouter = t.router({
	toggle: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			const st = await db.select().from(todoSubtasks).where(eq(todoSubtasks.id, input.id)).get();
			if (!st) throw new Error('Not found');
			await db.update(todoSubtasks).set({ done: !st.done }).where(eq(todoSubtasks.id, input.id));
			return { id: input.id, done: !st.done };
		}),

	delete: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(todoSubtasks).where(eq(todoSubtasks.id, input.id));
			return { id: input.id };
		})
});

export type SubtaskRouter = typeof subtaskRouter;