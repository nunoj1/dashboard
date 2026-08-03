import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const youtubeChannels = sqliteTable('youtube_channels', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	userId: text('user_id').notNull(),
	channelId: text('channel_id').notNull(),
	channelName: text('channel_name').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	order: integer('order').default(0)
});

export const youtubeVideos = sqliteTable('youtube_videos', {
	id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
	channelId: text('channel_id').notNull(),
	videoId: text('video_id').notNull().unique(),
	title: text('title').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	publishedAt: text('published_at'),
	watched: integer('watched', { mode: 'boolean' }).default(false),
	fetchedAt: integer('fetched_at', { mode: 'timestamp' })
});