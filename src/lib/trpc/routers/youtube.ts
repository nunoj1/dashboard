import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { youtubeWatched } from '$lib/db/schema/index';
import { t } from '../init';
import { env } from '$env/dynamic/private';

async function fetchYouTube<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
	return res.json();
}

function getPublishedAfter(filter: string): string | undefined {
	const now = new Date();
	switch (filter) {
		case 'day':
			now.setDate(now.getDate() - 1);
			break;
		case 'week':
			now.setDate(now.getDate() - 7);
			break;
		case 'month':
			now.setMonth(now.getMonth() - 1);
			break;
		case 'year':
			now.setFullYear(now.getFullYear() - 1);
			break;
		default:
			return undefined;
	}
	return now.toISOString();
}

export const youtubeRouter = t.router({
	searchChannels: t.procedure
		.input(
			z
				.object({
					query: z.string().min(1),
					maxResults: z.number().min(1).max(10).default(5)
				})
				.default({ query: '', maxResults: 5 })
		)
		.query(async ({ input }) => {
			if (!env.YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');
			if (!input.query.trim()) return [];

			const q = input.query.trim();
			let searchUrl: string;

			if (q.startsWith('@')) {
				const handle = q.slice(1);
				const data = await fetchYouTube<{
					items?: Array<{
						id: string;
						snippet: {
							title: string;
							thumbnails: { default?: { url: string }; medium?: { url: string } };
							description: string;
						};
					}>;
				}>(
					`https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${env.YOUTUBE_API_KEY}`
				);
				return (data.items || []).map((ch) => ({
					channelId: ch.id,
					channelName: ch.snippet.title,
					thumbnailUrl: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url || null,
					description: ch.snippet.description
				}));
			}

			if (q.startsWith('#')) {
				const tag = q.slice(1);
				searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(tag)}&maxResults=${input.maxResults}&key=${env.YOUTUBE_API_KEY}`;
			} else {
				searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=${input.maxResults}&key=${env.YOUTUBE_API_KEY}`;
			}

			const searchData = await fetchYouTube<{
				items?: Array<{
					id: { channelId: string };
					snippet: {
						title: string;
						thumbnails: { default?: { url: string }; medium?: { url: string } };
						description: string;
					};
				}>;
			}>(searchUrl);

			const channelIds = (searchData.items || [])
				.map((item) => item.id.channelId)
				.filter(Boolean);

			if (channelIds.length === 0) return [];

			const channelsData = await fetchYouTube<{
				items?: Array<{
					id: string;
					snippet: {
						title: string;
						thumbnails: { default?: { url: string }; medium?: { url: string } };
						description: string;
					};
				}>;
			}>(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}&key=${env.YOUTUBE_API_KEY}`
			);

			return (channelsData.items || []).map((ch) => ({
				channelId: ch.id,
				channelName: ch.snippet.title,
				thumbnailUrl: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url || null,
				description: ch.snippet.description
			}));
		}),

	getChannelVideos: t.procedure
		.input(
			z
				.object({
					channelId: z.string().min(1),
					timeFilter: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
					maxResults: z.number().min(1).max(50).default(10)
				})
				.default({ channelId: '', timeFilter: 'all', maxResults: 10 })
		)
		.query(async ({ input }) => {
			if (!env.YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

			const channelData = await fetchYouTube<{
				items?: Array<{
					contentDetails: { relatedPlaylists: { uploads: string } };
				}>;
			}>(
				`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${input.channelId}&key=${env.YOUTUBE_API_KEY}`
			);

			const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			if (!uploadsPlaylistId) return [];

			const publishedAfter = getPublishedAfter(input.timeFilter);
			let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${input.maxResults}&key=${env.YOUTUBE_API_KEY}`;
			if (publishedAfter) {
				url += `&publishedAfter=${publishedAfter}`;
			}

			const data = await fetchYouTube<{
				items?: Array<{
					snippet: {
						resourceId: { videoId: string };
						title: string;
						thumbnails: { medium?: { url: string }; default?: { url: string } };
						publishedAt: string;
						channelTitle: string;
					};
				}>;
			}>(url);

			return (data.items || []).map((item) => ({
				videoId: item.snippet.resourceId.videoId,
				title: item.snippet.title,
				thumbnailUrl:
					item.snippet.thumbnails?.medium?.url ||
					item.snippet.thumbnails?.default?.url ||
					null,
				publishedAt: item.snippet.publishedAt,
				channelName: item.snippet.channelTitle
			}));
		}),

	getWatched: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		return db
			.select()
			.from(youtubeWatched)
			.where(eq(youtubeWatched.userId, ctx.user.id))
			.orderBy(desc(youtubeWatched.watchedAt))
			.all();
	}),

	toggleWatched: t.procedure
		.input(z.object({ videoId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(youtubeWatched)
				.where(
					and(
						eq(youtubeWatched.userId, ctx.user.id),
						eq(youtubeWatched.videoId, input.videoId)
					)
				)
				.limit(1)
				.all();

			if (existing.length) {
				await db
					.delete(youtubeWatched)
					.where(
						and(
							eq(youtubeWatched.userId, ctx.user.id),
							eq(youtubeWatched.videoId, input.videoId)
						)
					);
				return { watched: false };
			}

			await db.insert(youtubeWatched).values({
				userId: ctx.user.id,
				videoId: input.videoId
			});
			return { watched: true };
		})
});

export type YoutubeRouter = typeof youtubeRouter;