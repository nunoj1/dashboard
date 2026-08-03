import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { youtubeWatched, youtubeSubscriptionToggles } from '$lib/db/schema/index';
import { t } from '../init';
import {
	fetchYouTube,
	buildYouTubeUrl,
	getGoogleAccessToken,
	getPublishedAfter,
	getApiKey,
	requireYouTubeAuth
} from './youtube/helpers';

interface VideoItem {
	videoId: string;
	title: string;
	thumbnailUrl: string | null;
	publishedAt: string;
	channelName: string;
	channelId: string;
}

async function fetchChannelUploads(
	channelId: string,
	channelName: string,
	accessToken: string,
	maxPerChannel: number,
	publishedAfter?: string
): Promise<VideoItem[]> {
	const chData = await fetchYouTube<{
		items?: Array<{
			contentDetails: { relatedPlaylists: { uploads: string } };
		}>;
	}>(
		buildYouTubeUrl('/channels', {
			part: 'contentDetails',
			id: channelId
		}),
		accessToken
	);

	const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
	if (!uploadsId) return [];

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
		buildYouTubeUrl('/playlistItems', {
			part: 'snippet',
			playlistId: uploadsId,
			maxResults: maxPerChannel,
			...(publishedAfter ? { publishedAfter } : {})
		}),
		accessToken
	);

	return (data.items || []).map((item) => ({
		videoId: item.snippet.resourceId.videoId,
		title: item.snippet.title,
		thumbnailUrl:
			item.snippet.thumbnails?.medium?.url ||
			item.snippet.thumbnails?.default?.url ||
			null,
		publishedAt: item.snippet.publishedAt,
		channelName,
		channelId
	}));
}

export const youtubeRouter = t.router({
	getSubscriptions: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const accessToken = await getGoogleAccessToken(ctx.user.id);
		if (!accessToken) return [];

		try {
			const data = await fetchYouTube<{
				items?: Array<{
					snippet: {
						title: string;
						resourceId: { channelId: string };
						thumbnails: { default?: { url: string }; medium?: { url: string } };
					};
				}>;
			}>(
				buildYouTubeUrl('/subscriptions', {
					part: 'snippet',
					mine: 'true',
					maxResults: 50,
					order: 'alphabetical'
				}),
				accessToken
			);

			const subscriptions = (data.items || []).map((item) => ({
				channelId: item.snippet.resourceId.channelId,
				channelName: item.snippet.title,
				thumbnailUrl:
					item.snippet.thumbnails?.medium?.url ||
					item.snippet.thumbnails?.default?.url ||
					null
			}));

			const toggles = await db
				.select()
				.from(youtubeSubscriptionToggles)
				.where(eq(youtubeSubscriptionToggles.userId, ctx.user.id))
				.all();

			const hiddenSet = new Set(toggles.filter((t) => t.hidden).map((t) => t.channelId));
			return subscriptions.map((sub) => ({ ...sub, hidden: hiddenSet.has(sub.channelId) }));
		} catch {
			return [];
		}
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
					timeFilter: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
					page: z.number().min(1).default(1),
					limit: z.number().min(1).max(20).default(5)
				})
				.default({ timeFilter: 'week', page: 1, limit: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return { items: [], total: 0, page: 1, totalPages: 0 };

			const accessToken = await getGoogleAccessToken(ctx.user.id);
			if (!accessToken) return { items: [], total: 0, page: 1, totalPages: 0 };

			const subData = await fetchYouTube<{
				items?: Array<{ snippet: { resourceId: { channelId: string }; title: string } }>;
			}>(
				buildYouTubeUrl('/subscriptions', {
					part: 'snippet',
					mine: 'true',
					maxResults: 50
				}),
				accessToken
			);

			const allSubs = (subData.items || []).map((item) => ({
				channelId: item.snippet.resourceId.channelId,
				channelName: item.snippet.title
			}));

			if (allSubs.length === 0) return { items: [], total: 0, page: 1, totalPages: 0 };

			const toggles = await db
				.select()
				.from(youtubeSubscriptionToggles)
				.where(eq(youtubeSubscriptionToggles.userId, ctx.user.id))
				.all();
			const hiddenSet = new Set(toggles.filter((t) => t.hidden).map((t) => t.channelId));
			const activeSubs = allSubs.filter((s) => !hiddenSet.has(s.channelId));

			if (activeSubs.length === 0) return { items: [], total: 0, page: 1, totalPages: 0 };

			// Fetch videos from each channel in parallel, but cap per channel
			const publishedAfter = getPublishedAfter(input.timeFilter);
			const maxPerChannel = Math.min(10, input.limit * 2);

			const videoArrays = await Promise.all(
				activeSubs.map((sub) =>
					fetchChannelUploads(
						sub.channelId,
						sub.channelName,
						accessToken,
						maxPerChannel,
						publishedAfter
					).catch(() => [])
				)
			);

			const allVideos = videoArrays.flat();
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
			const apiKey = getApiKey();
			const auth = requireYouTubeAuth(accessToken, apiKey);

			if (!input.query.trim()) return [];
			const q = input.query.trim();

			const searchParams: Record<string, string | number> = {
				part: 'snippet',
				type: 'channel',
				q,
				maxResults: input.maxResults
			};
			if (!auth.isOAuth) searchParams.key = auth.token;

			const searchData = await fetchYouTube<{
				items?: Array<{
					id: { channelId: string };
					snippet: {
						title: string;
						thumbnails: { default?: { url: string }; medium?: { url: string } };
						description: string;
					};
				}>;
			}>(buildYouTubeUrl('/search', searchParams), auth.isOAuth ? auth.token : undefined);

			const channelIds = (searchData.items || [])
				.map((item) => item.id.channelId)
				.filter(Boolean);
			if (channelIds.length === 0) return [];

			const channelParams: Record<string, string | number> = {
				part: 'snippet',
				id: channelIds.join(',')
			};
			if (!auth.isOAuth) channelParams.key = auth.token;

			const channelsData = await fetchYouTube<{
				items?: Array<{
					id: string;
					snippet: {
						title: string;
						thumbnails: { default?: { url: string }; medium?: { url: string } };
						description: string;
					};
				}>;
			}>(buildYouTubeUrl('/channels', channelParams), auth.isOAuth ? auth.token : undefined);

			return (channelsData.items || []).map((ch) => ({
				channelId: ch.id,
				channelName: ch.snippet.title,
				thumbnailUrl:
					ch.snippet.thumbnails?.medium?.url ||
					ch.snippet.thumbnails?.default?.url ||
					null,
				description: ch.snippet.description
			}));
		}),

	getChannelVideos: t.procedure
		.input(
			z
				.object({
					channelId: z.string().min(1),
					timeFilter: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
					page: z.number().min(1).default(1),
					limit: z.number().min(1).max(20).default(5)
				})
				.default({ channelId: '', timeFilter: 'week', page: 1, limit: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return { items: [], total: 0, page: 1, totalPages: 0 };

			const accessToken = await getGoogleAccessToken(ctx.user.id);
			const apiKey = getApiKey();
			const auth = requireYouTubeAuth(accessToken, apiKey);

			const chData = await fetchYouTube<{
				items?: Array<{
					contentDetails: { relatedPlaylists: { uploads: string } };
					snippet: { title: string };
				}>;
			}>(
				buildYouTubeUrl('/channels', {
					part: 'snippet,contentDetails',
					id: input.channelId,
					...(!auth.isOAuth ? { key: auth.token } : {})
				}),
				auth.isOAuth ? auth.token : undefined
			);

			const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
			const channelName = chData.items?.[0]?.snippet?.title || '';
			if (!uploadsId) return { items: [], total: 0, page: 1, totalPages: 0 };

			const publishedAfter = getPublishedAfter(input.timeFilter);
			const playlistParams: Record<string, string | number> = {
				part: 'snippet',
				playlistId: uploadsId,
				maxResults: 50
			};
			if (publishedAfter) playlistParams.publishedAfter = publishedAfter;
			if (!auth.isOAuth) playlistParams.key = auth.token;

			const data = await fetchYouTube<{
				items?: Array<{
					snippet: {
						resourceId: { videoId: string };
						title: string;
						thumbnails: { medium?: { url: string }; default?: { url: string } };
						publishedAt: string;
					};
				}>;
			}>(buildYouTubeUrl('/playlistItems', playlistParams), auth.isOAuth ? auth.token : undefined);

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

	markWatched: t.procedure
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

			if (existing.length) return { watched: true };

			await db.insert(youtubeWatched).values({
				userId: ctx.user.id,
				videoId: input.videoId
			});
			return { watched: true };
		})
});

export type YoutubeRouter = typeof youtubeRouter;