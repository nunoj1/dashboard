import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	name: text('name'),
	avatar: text('avatar_url'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});