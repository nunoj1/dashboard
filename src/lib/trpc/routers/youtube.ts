import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { youtubeChannels, youtubeVideos } from '$lib/db/schema/index';
import { t } from '../init';
import { env } from '$env/dynamic/private';

async function fetchYouTube<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
	return res.json();
}

async function resolveChannel(query: string) {
	let data = await fetchYouTube<{
		items?: Array<{
			id: string;
			snippet: Record<string, unknown>;
			contentDetails: Record<string, unknown>;
		}>;
	}>(
		`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(query)}&key=${env.YOUTUBE_API_KEY}`
	);
	if (data.items?.length) return data.items[0];

	data = await fetchYouTube<{
		items?: Array<{
			id: string;
			snippet: Record<string, unknown>;
			contentDetails: Record<string, unknown>;
		}>;
	}>(
		`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${encodeURIComponent(query)}&key=${env.YOUTUBE_API_KEY}`
	);
	if (data.items?.length) return data.items[0];

	const search = await fetchYouTube<{
		items?: Array<{ id: { channelId: string }; snippet: Record<string, unknown> }>;
	}>(
		`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${env.YOUTUBE_API_KEY}`
	);
	if (!search.items?.length) throw new Error('Channel not found');

	const channelId = search.items[0].id.channelId;
	data = await fetchYouTube<{
		items?: Array<{
			id: string;
			snippet: Record<string, unknown>;
			contentDetails: Record<string, unknown>;
		}>;
	}>(
		`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${env.YOUTUBE_API_KEY}`
	);
	if (!data.items?.length) throw new Error('Channel not found');
	return data.items[0];
}

async function fetchLatestVideos(uploadsPlaylistId: string) {
	const data = await fetchYouTube<{
		items?: Array<{
			snippet: {
				resourceId: { videoId: string };
				title: string;
				thumbnails: { medium?: { url: string }; default?: { url: string } };
				publishedAt: string;
			};
		}>;
	}>(
		`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${env.YOUTUBE_API_KEY}`
	);
	return (data.items || []).map((item) => ({
		videoId: item.snippet.resourceId.videoId,
		title: item.snippet.title,
		thumbnailUrl:
			item.snippet.thumbnails?.medium?.url ||
			item.snippet.thumbnails?.default?.url ||
			null,
		publishedAt: item.snippet.publishedAt
	}));
}

export const youtubeRouter = t.router({
	getChannels: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		return db.select().from(youtubeChannels).orderBy(youtubeChannels.order).all();
	}),

	getVideos: t.procedure
		.input(
			z
				.object({
					limit: z.number().min(1).max(50).default(20),
					includeWatched: z.boolean().default(true)
				})
				.default({ limit: 20, includeWatched: true })
		)
		.query(async ({ input }) => {
			const where = input.includeWatched
				? undefined
				: eq(youtubeVideos.watched, false);
			return db
				.select()
				.from(youtubeVideos)
				.where(where)
				.orderBy(desc(youtubeVideos.publishedAt))
				.limit(input.limit)
				.all();
		}),

	addChannel: t.procedure
		.input(z.object({ query: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			if (!env.YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

			const channel = await resolveChannel(input.query);
			const snippet = channel.snippet as {
				title: string;
				thumbnails: { default?: { url: string } };
			};
			const contentDetails = channel.contentDetails as {
				relatedPlaylists: { uploads: string };
			};

			const existing = await db
				.select()
				.from(youtubeChannels)
				.where(
					and(
						eq(youtubeChannels.userId, ctx.user.id),
						eq(youtubeChannels.channelId, channel.id)
					)
				)
				.all();
			if (existing.length) throw new Error('Channel already added');

			await db.insert(youtubeChannels).values({
				userId: ctx.user.id,
				channelId: channel.id,
				channelName: snippet.title,
				thumbnailUrl: snippet.thumbnails?.default?.url || null
			});

			const videos = await fetchLatestVideos(contentDetails.relatedPlaylists.uploads);
			for (const v of videos) {
				await db
					.insert(youtubeVideos)
					.values({
						channelId: channel.id,
						videoId: v.videoId,
						title: v.title,
						thumbnailUrl: v.thumbnailUrl,
						publishedAt: v.publishedAt,
						fetchedAt: new Date()
					})
					.onConflictDoNothing();
			}

			return { channelId: channel.id };
		}),

	removeChannel: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [ch] = await db
				.select()
				.from(youtubeChannels)
				.where(eq(youtubeChannels.id, input.id))
				.all();
			if (!ch) throw new Error('Not found');
			await db.delete(youtubeVideos).where(eq(youtubeVideos.channelId, ch.channelId));
			await db.delete(youtubeChannels).where(eq(youtubeChannels.id, input.id));
			return { id: input.id };
		}),

	markWatched: t.procedure
		.input(z.object({ videoId: z.string() }))
		.mutation(async ({ input }) => {
			const [video] = await db
				.select()
				.from(youtubeVideos)
				.where(eq(youtubeVideos.videoId, input.videoId))
				.all();
			if (!video) throw new Error('Video not found');
			await db
				.update(youtubeVideos)
				.set({ watched: !video.watched })
				.where(eq(youtubeVideos.videoId, input.videoId));
			return { watched: !video.watched };
		}),

	refresh: t.procedure.mutation(async ({ ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		if (!env.YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

		const channels = await db
			.select()
			.from(youtubeChannels)
			.where(eq(youtubeChannels.userId, ctx.user.id))
			.all();

		for (const ch of channels) {
			const data = await fetchYouTube<{
				items?: Array<{
					contentDetails: { relatedPlaylists: { uploads: string } };
				}>;
			}>(
				`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ch.channelId}&key=${env.YOUTUBE_API_KEY}`
			);
			const uploadsPlaylistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			if (!uploadsPlaylistId) continue;

			const videos = await fetchLatestVideos(uploadsPlaylistId);
			for (const v of videos) {
				await db
					.insert(youtubeVideos)
					.values({
						channelId: ch.channelId,
						videoId: v.videoId,
						title: v.title,
						thumbnailUrl: v.thumbnailUrl,
						publishedAt: v.publishedAt,
						fetchedAt: new Date()
					})
					.onConflictDoNothing();
			}
		}

		return { refreshed: channels.length };
	})
});

export type YoutubeRouter = typeof youtubeRouter;