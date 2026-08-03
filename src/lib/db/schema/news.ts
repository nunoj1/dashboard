import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

export const newsRegions = sqliteTable('news_regions', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	region: text('region').notNull(),
	order: integer('order').default(0)
});

export const newsTags = sqliteTable('news_tags', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	tag: text('tag').notNull(),
	active: integer('active', { mode: 'boolean' }).default(true),
	order: integer('order').default(0)
});

export const newsArticles = sqliteTable(
	'news_articles',
	{
		id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
		userId: text('user_id').notNull(),
		source: text('source').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		url: text('url').notNull(),
		publishedAt: text('published_at'),
		read: integer('read', { mode: 'boolean' }).default(false),
		savedAt: integer('saved_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
	},
	(table) => [unique('news_articles_user_url').on(table.userId, table.url)]
);