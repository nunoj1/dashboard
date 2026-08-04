import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/db';
import { habits, habitEntries } from '$lib/db/schema/index';
import { t } from '../init';

type HabitEntry = { date: string; completed: boolean | null };

function calculateCurrentStreak(entries: HabitEntry[]): number {
	const completedDates = new Set(entries.filter((e) => e.completed === true).map((e) => e.date));
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

function calculateLongestStreak(entries: HabitEntry[]): number {
	const dates = entries
		.filter((e) => e.completed === true)
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

function countLastNDays(entries: HabitEntry[], n: number) {
	const now = new Date();
	let count = 0;
	for (let i = 0; i < n; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		const str = d.toISOString().split('T')[0];
		if (entries.some((e) => e.date === str)) count++;
	}
	return count;
}

function getTargetStatus(
	entries: HabitEntry[],
	targetType: string | null,
	targetCount: number | null
) {
	const completed = entries.filter((e) => e.completed === true);
	const now = new Date();

	switch (targetType) {
		case 'daily':
			return { expected: 7, actual: countLastNDays(completed, 7), label: 'last 7 days' };
		case 'weekly':
			return {
				expected: targetCount ?? 1,
				actual: countLastNDays(completed, 7),
				label: 'last 7 days'
			};
		case 'monthly': {
			const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
			const count = completed.filter((e) => e.date.startsWith(monthStr)).length;
			return { expected: targetCount ?? 1, actual: count, label: 'this month' };
		}
		case 'none':
		default:
			return { expected: 0, actual: completed.length, label: 'all time' };
	}
}

export const healthRouter = t.router({
	getHabits: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const userHabits = await db
			.select()
			.from(habits)
			.where(eq(habits.userId, ctx.user.id))
			.orderBy(habits.order)
			.all();
		if (userHabits.length === 0) return [];
		const habitIds = userHabits.map((h) => h.id);
		const allEntries = await db.select().from(habitEntries).all();
		const userEntries = allEntries.filter((e) => habitIds.includes(e.habitId));
		return userHabits.map((h) => {
			const habitEntriesList = userEntries.filter((e) => e.habitId === h.id);
			const status = getTargetStatus(habitEntriesList, h.targetType, h.targetCount);
			return {
				...h,
				currentStreak: calculateCurrentStreak(habitEntriesList),
				longestStreak: calculateLongestStreak(habitEntriesList),
				totalCompletions: habitEntriesList.filter((e) => e.completed === true).length,
				targetStatus: status
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
			const allEntries = await db
				.select()
				.from(habitEntries)
				.where(sql`${habitEntries.date} LIKE ${input.month + '%'}`)
				.all();
			return allEntries.filter((e) => habitIds.includes(e.habitId));
		}),

	createHabit: t.procedure
		.input(
			z.object({
				name: z.string().min(1),
				color: z.enum(['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet']).default('indigo'),
				targetType: z.enum(['daily', 'weekly', 'monthly', 'none']).default('daily'),
				targetCount: z.number().min(1).optional()
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [habit] = await db
				.insert(habits)
				.values({
					userId: ctx.user.id,
					name: input.name,
					color: input.color,
					targetType: input.targetType,
					targetCount:
						input.targetType === 'none' || input.targetType === 'daily' ? null : input.targetCount
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

	deleteHabit: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		await db.delete(habitEntries).where(eq(habitEntries.habitId, input.id));
		await db.delete(habits).where(eq(habits.id, input.id));
		return { id: input.id };
	})
});

export type HealthRouter = typeof healthRouter;
