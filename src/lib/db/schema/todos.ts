import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	done: integer('done', { mode: 'boolean' }).default(false),
	dueDate: integer('due_date', { mode: 'timestamp' }),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	priority: text('priority').default('medium'),
	category: text('category'),
	location: text('location'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const todoCategories = sqliteTable('todo_categories', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const todoSubtasks = sqliteTable('todo_subtasks', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	todoId: integer('todo_id', { mode: 'number' }).notNull(),
	title: text('title').notNull(),
	done: integer('done', { mode: 'boolean' }).default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});