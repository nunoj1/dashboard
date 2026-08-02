import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/db';
import { todos, todoSubtasks } from '$lib/db/schema/index';
import { t } from '../init';

export const todoRouter = t.router({
	getActive: t.procedure.query(async () => {
		const allTodos = await db.select().from(todos).where(eq(todos.done, false)).orderBy(todos.createdAt).all();
		const allSubtasks = await db.select().from(todoSubtasks).all();
		return allTodos.map(t => ({
			...t,
			subtasks: allSubtasks.filter(s => s.todoId === t.id)
		}));
	}),

	getHistory: t.procedure
		.input(z.object({
			page: z.number().min(1).default(1),
			limit: z.number().min(1).max(50).default(10),
			search: z.string().optional()
		}))
		.query(async ({ input }) => {
			const offset = (input.page - 1) * input.limit;
			const conditions = [eq(todos.done, true)];

			if (input.search) {
				conditions.push(sql`${todos.title} LIKE ${'%' + input.search + '%'}`);
			}

			const items = await db.select().from(todos)
				.where(and(...conditions))
				.limit(input.limit)
				.offset(offset)
				.orderBy(sql`${todos.completedAt} DESC`)
				.all();

			const countResult = await db.select({ count: sql<number>`count(*)` })
				.from(todos)
				.where(and(...conditions))
				.get();

			const allSubtasks = await db.select().from(todoSubtasks).all();

			return {
				items: items.map(t => ({
					...t,
					subtasks: allSubtasks.filter(s => s.todoId === t.id)
				})),
				total: Number(countResult?.count ?? 0),
				page: input.page,
				limit: input.limit
			};
		}),

	create: t.procedure
		.input(z.object({
			title: z.string().min(1),
			description: z.string().optional(),
			priority: z.enum(['low', 'medium', 'high']).default('medium'),
			dueDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
			category: z.string().optional(),
			location: z.string().optional(),
			subtaskTitles: z.array(z.string().min(1)).default([])
		}))
		.mutation(async ({ input }) => {
			const [todo] = await db.insert(todos).values({
				userId: 'temp',
				title: input.title,
				description: input.description,
				priority: input.priority,
				dueDate: input.dueDate,
				category: input.category,
				location: input.location
			}).returning();

			if (input.subtaskTitles.length > 0) {
				await db.insert(todoSubtasks).values(
					input.subtaskTitles.map(title => ({ todoId: todo.id, title }))
				);
			}

			const todoSubts = await db.select().from(todoSubtasks).where(eq(todoSubtasks.todoId, todo.id)).all();
			return { ...todo, subtasks: todoSubts };
		}),

	toggle: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			const todo = await db.select().from(todos).where(eq(todos.id, input.id)).get();
			if (!todo) throw new Error('Not found');

			const newDone = !todo.done;
			await db.update(todos).set({
				done: newDone,
				completedAt: newDone ? new Date() : null
			}).where(eq(todos.id, input.id));

			return { id: input.id, done: newDone, completedAt: newDone ? new Date() : null };
		}),

	delete: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input }) => {
			await db.delete(todoSubtasks).where(eq(todoSubtasks.todoId, input.id));
			await db.delete(todos).where(eq(todos.id, input.id));
			return { id: input.id };
		})
});

export type TodoRouter = typeof todoRouter;