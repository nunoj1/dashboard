import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { youtubeWatched, youtubeSubscriptionToggles } from '$lib/db/schema/index';
import { t } from '../init';
import { createClerkClient } from '@clerk/backend';
import { CLERK_SECRET_KEY } from '$env/static/private';

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

async function fetchYouTube<T>(url: string, accessToken?: string): Promise<T> {
	const headers: Record<string, string> = {};
	if (accessToken) {
		headers['Authorization'] = `Bearer ${accessToken}`;
	}
	const res = await fetch(url, { headers });
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`YouTube API error ${res.status}: ${text}`);
	}
	return res.json();
}

async function getGoogleAccessToken(userId: string): Promise<string> {
	const tokens = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');
	const token = tokens.data[0];
	if (!token?.token) throw new Error('No Google OAuth token. Make sure YouTube scope is enabled in Clerk.');
	return token.token;
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

interface VideoItem {
	videoId: string;
	title: string;
	thumbnailUrl: string | null;
	publishedAt: string;
	channelName: string;
	channelId: string;
}

export const youtubeRouter = t.router({
	getSubscriptions: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const accessToken = await getGoogleAccessToken(ctx.user.id);

		const data = await fetchYouTube<{
			items?: Array<{
				snippet: {
					title: string;
					resourceId: { channelId: string };
					thumbnails: { default?: { url: string }; medium?: { url: string } };
				};
			}>;
			nextPageToken?: string;
		}>(
			'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical',
			accessToken
		);

		const subscriptions = (data.items || []).map((item) => ({
			channelId: item.snippet.resourceId.channelId,
			channelName: item.snippet.title,
			thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null
		}));

		const toggles = await db
			.select()
			.from(youtubeSubscriptionToggles)
			.where(eq(youtubeSubscriptionToggles.userId, ctx.user.id))
			.all();

		const hiddenSet = new Set(toggles.filter((t) => t.hidden).map((t) => t.channelId));

		return subscriptions.map((sub) => ({
			...sub,
			hidden: hiddenSet.has(sub.channelId)
		}));
	}),

	toggleSubscription: t.procedure
		.input(z.object({ channelId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(youtubeSubscriptionToggles)
				.where(
					and(
						eq(youtubeSubscriptionToggles.userId, ctx.user.id),
						eq(youtubeSubscriptionToggles.channelId, input.channelId)
					)
				)
				.limit(1)
				.all();

			if (existing.length) {
				const nextHidden = !existing[0].hidden;
				await db
					.update(youtubeSubscriptionToggles)
					.set({ hidden: nextHidden })
					.where(eq(youtubeSubscriptionToggles.id, existing[0].id));
				return { hidden: nextHidden };
			}

			await db.insert(youtubeSubscriptionToggles).values({
				userId: ctx.user.id,
				channelId: input.channelId,
				hidden: true
			});
			return { hidden: true };
		}),

	getSubscriptionVideos: t.procedure
		.input(
			z
				.object({
					timeFilter: z.enum(['day', 'week', 'month', 'year', 'all']).default('all'),
					page: z.number().min(1).default(1),
					limit: z.number().min(1).max(20).default(5)
				})
				.default({ timeFilter: 'all', page: 1, limit: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return { items: [], total: 0, page: 1, totalPages: 0 };

			const accessToken = await getGoogleAccessToken(ctx.user.id);

			const subData = await fetchYouTube<{
				items?: Array<{ snippet: { resourceId: { channelId: string } } }>;
			}>(
				'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
				accessToken
			);

			const allSubChannelIds = (subData.items || []).map(
				(item) => item.snippet.resourceId.channelId
			);

			if (allSubChannelIds.length === 0) {
				return { items: [], total: 0, page: 1, totalPages: 0 };
			}

			const toggles = await db
				.select()
				.from(youtubeSubscriptionToggles)
				.where(eq(youtubeSubscriptionToggles.userId, ctx.user.id))
				.all();
			const hiddenSet = new Set(toggles.filter((t) => t.hidden).map((t) => t.channelId));
			const activeChannelIds = allSubChannelIds.filter((id) => !hiddenSet.has(id));

			if (activeChannelIds.length === 0) {
				return { items: [], total: 0, page: 1, totalPages: 0 };
			}

			const channelsData = await fetchYouTube<{
				items?: Array<{
					id: string;
					contentDetails: { relatedPlaylists: { uploads: string } };
					snippet: { title: string };
				}>;
			}>(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${activeChannelIds.join(',')}`,
				accessToken
			);

			const allVideos: VideoItem[] = [];
			const publishedAfter = getPublishedAfter(input.timeFilter);

			for (const ch of channelsData.items || []) {
				const uploadsId = ch.contentDetails?.relatedPlaylists?.uploads;
				if (!uploadsId) continue;

				let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=10`;
				if (publishedAfter) {
					url += `&publishedAfter=${publishedAfter}`;
				}

				try {
					const data = await fetchYouTube<{
						items?: Array<{
							snippet: {
								resourceId: { videoId: string };
								title: string;
								thumbnails: { medium?: { url: string }; default?: { url: string } };
								publishedAt: string;
							};
						}>;
					}>(url, accessToken);

					for (const item of data.items || []) {
						allVideos.push({
							videoId: item.snippet.resourceId.videoId,
							title: item.snippet.title,
							thumbnailUrl:
								item.snippet.thumbnails?.medium?.url ||
								item.snippet.thumbnails?.default?.url ||
								null,
							publishedAt: item.snippet.publishedAt,
							channelName: ch.snippet.title,
							channelId: ch.id
						});
					}
				} catch {
					continue;
				}
			}

			allVideos.sort(
				(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
			);

			const total = allVideos.length;
			const totalPages = Math.ceil(total / input.limit);
			const offset = (input.page - 1) * input.limit;
			const pageItems = allVideos.slice(offset, offset + input.limit);

			return { items: pageItems, total, page: input.page, totalPages };
		}),

	searchChannels: t.procedure
		.input(
			z
				.object({
					query: z.string().min(1),
					maxResults: z.number().min(1).max(10).default(5)
				})
				.default({ query: '', maxResults: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const accessToken = await getGoogleAccessToken(ctx.user.id);

			if (!input.query.trim()) return [];

			const q = input.query.trim();

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
					`https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(handle)}`,
					accessToken
				);
				return (data.items || []).map((ch) => ({
					channelId: ch.id,
					channelName: ch.snippet.title,
					thumbnailUrl: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url || null,
					description: ch.snippet.description
				}));
			}

			const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=${input.maxResults}`;
			const searchData = await fetchYouTube<{
				items?: Array<{
					id: { channelId: string };
					snippet: {
						title: string;
						thumbnails: { default?: { url: string }; medium?: { url: string } };
						description: string;
					};
				}>;
			}>(searchUrl, accessToken);

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
				`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}`,
				accessToken
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
					page: z.number().min(1).default(1),
					limit: z.number().min(1).max(20).default(5)
				})
				.default({ channelId: '', timeFilter: 'all', page: 1, limit: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return { items: [], total: 0, page: 1, totalPages: 0 };
			const accessToken = await getGoogleAccessToken(ctx.user.id);

			const channelData = await fetchYouTube<{
				items?: Array<{
					contentDetails: { relatedPlaylists: { uploads: string } };
					snippet: { title: string };
				}>;
			}>(
				`https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${input.channelId}`,
				accessToken
			);

			const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			const channelName = channelData.items?.[0]?.snippet?.title || '';
			if (!uploadsPlaylistId) return { items: [], total: 0, page: 1, totalPages: 0 };

			const publishedAfter = getPublishedAfter(input.timeFilter);
			let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50`;
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
					};
				}>;
			}>(url, accessToken);

			const allVideos = (data.items || []).map((item) => ({
				videoId: item.snippet.resourceId.videoId,
				title: item.snippet.title,
				thumbnailUrl:
					item.snippet.thumbnails?.medium?.url ||
					item.snippet.thumbnails?.default?.url ||
					null,
				publishedAt: item.snippet.publishedAt,
				channelName,
				channelId: input.channelId
			}));

			const total = allVideos.length;
			const totalPages = Math.ceil(total / input.limit);
			const offset = (input.page - 1) * input.limit;
			const pageItems = allVideos.slice(offset, offset + input.limit);

			return { items: pageItems, total, page: input.page, totalPages };
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