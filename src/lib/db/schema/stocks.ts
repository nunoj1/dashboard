import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const stockTickers = sqliteTable('stock_tickers', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	symbol: text('symbol').notNull(),
	name: text('name').notNull(),
	order: integer('order').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});
