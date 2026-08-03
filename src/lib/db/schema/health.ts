import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const habits = sqliteTable('habits', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
	color: text('color').default('indigo'),
	targetType: text('target_type').default('daily'), // daily, weekly, monthly, none
	targetCount: integer('target_count'),
	order: integer('order').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const habitEntries = sqliteTable('habit_entries', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	habitId: integer('habit_id', { mode: 'number' }).notNull(),
	date: text('date').notNull(),
	completed: integer('completed', { mode: 'boolean' }).default(true),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});