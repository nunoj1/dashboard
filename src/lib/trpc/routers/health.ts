import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/db';
import { habits, habitEntries } from '$lib/db/schema/index';
import { t } from '../init';

function calculateCurrentStreak(entries: { date: string; completed: boolean }[]): number {
	const completedDates = new Set(entries.filter((e) => e.completed).map((e) => e.date));
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	let streak = 0;
	const check = new Date(today);
	while (true) {
		const str = check.toISOString().split('T')[0];
		if (completedDates.has(str)) {
			streak++;
			check.setDate(check.getDate() - 1);
		} else {
			break;
		}
	}
	return streak;
}

function calculateLongestStreak(entries: { date: string; completed: boolean }[]): number {
	const dates = entries
		.filter((e) => e.completed)
		.map((e) => new Date(e.date))
		.sort((a, b) => a.getTime() - b.getTime());
	if (dates.length === 0) return 0;
	let longest = 1;
	let current = 1;
	for (let i = 1; i < dates.length; i++) {
		const prev = new Date(dates[i - 1]);
		prev.setDate(prev.getDate() + 1);
		if (prev.toISOString().split('T')[0] === dates[i].toISOString().split('T')[0]) {
			current++;
			longest = Math.max(longest, current);
		} else {
			current = 1;
		}
	}
	return longest;
}

export const healthRouter = t.router({
	getHabits: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const allHabits = await db
			.select()
			.from(habits)
			.where(eq(habits.userId, ctx.user.id))
			.orderBy(habits.order)
			.all();
		const allEntries = await db
			.select()
			.from(habitEntries)
			.all();
		return allHabits.map((h) => {
			const habitEntriesList = allEntries.filter((e) => e.habitId === h.id);
			return {
				...h,
				currentStreak: calculateCurrentStreak(habitEntriesList),
				longestStreak: calculateLongestStreak(habitEntriesList),
				totalCompletions: habitEntriesList.filter((e) => e.completed).length
			};
		});
	}),

	getEntries: t.procedure
		.input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return [];
			const userHabits = await db
				.select({ id: habits.id })
				.from(habits)
				.where(eq(habits.userId, ctx.user.id))
				.all();
			const habitIds = userHabits.map((h) => h.id);
			if (habitIds.length === 0) return [];
			return db
				.select()
				.from(habitEntries)
				.where(
					and(
						sql`${habitEntries.date} LIKE ${input.month + '%'}`,
						sql`${habitEntries.habitId} IN ${habitIds}`
					)
				)
				.all();
		}),

	createHabit: t.procedure
		.input(
			z.object({
				name: z.string().min(1),
				color: z.enum(['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet']).default('indigo')
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [habit] = await db
				.insert(habits)
				.values({
					userId: ctx.user.id,
					name: input.name,
					color: input.color
				})
				.returning();
			return habit;
		}),

	toggleEntry: t.procedure
		.input(
			z.object({
				habitId: z.number(),
				date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(habitEntries)
				.where(and(eq(habitEntries.habitId, input.habitId), eq(habitEntries.date, input.date)))
				.get();
			if (existing) {
				await db.delete(habitEntries).where(eq(habitEntries.id, existing.id));
				return { habitId: input.habitId, date: input.date, completed: false };
			} else {
				const [entry] = await db
					.insert(habitEntries)
					.values({
						habitId: input.habitId,
						date: input.date,
						completed: true
					})
					.returning();
				return { habitId: input.habitId, date: input.date, completed: true, entry };
			}
		}),

	deleteHabit: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db.delete(habitEntries).where(eq(habitEntries.habitId, input.id));
			await db.delete(habits).where(eq(habits.id, input.id));
			return { id: input.id };
		}),

	getStats: t.procedure
		.input(z.object({ period: z.enum(['7d', '30d', '90d', '1y']).default('30d') }))
		.query(async ({ ctx }) => {
			if (!ctx.user) return { habits: [] };
			const allHabits = await db.select().from(habits).all();
			const allEntries = await db.select().from(habitEntries).all();
			const habitStats = allHabits.map((h) => {
				const list = allEntries.filter((e) => e.habitId === h.id);
				return {
					...h,
					currentStreak: calculateCurrentStreak(list),
					longestStreak: calculateLongestStreak(list),
					totalCompletions: list.filter((e) => e.completed).length
				};
			});
			return { habits: habitStats };
		})
});

export type HealthRouter = typeof healthRouter;