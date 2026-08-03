import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

export const youtubeWatched = sqliteTable(
	'youtube_watched',
	{
		id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
		userId: text('user_id').notNull(),
		videoId: text('video_id').notNull(),
		watchedAt: integer('watched_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
	},
	(table) => [unique('youtube_watched_user_video').on(table.userId, table.videoId)]
);