import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { newsSources, newsTags, newsArticles } from '$lib/db/schema/index';
import { t } from '../init';

interface RssItem {
	title: string;
	link: string;
	pubDate: string;
	source: string;
	imageUrl: string | null;
	description: string | null;
}

function extractImageFromXml(itemXml: string): string | null {
	const enclosure = itemXml.match(/<enclosure[^>]+url="([^"]+)"/i);
	if (enclosure) return enclosure[1];

	const mediaContent = itemXml.match(
		/<media:content[^>]+url="([^"]+)"[^>]*type="image\/[^"]*"/i
	);
	if (mediaContent) return mediaContent[1];

	const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
	if (mediaThumbnail) return mediaThumbnail[1];

	const imgInDesc = itemXml.match(/<description[^>]*>.*<img[^>]+src="([^"]+)"/i);
	if (imgInDesc) return imgInDesc[1];

	const imgInContent = itemXml.match(/<content:encoded[^>]*>.*<img[^>]+src="([^"]+)"/is);
	if (imgInContent) return imgInContent[1];

	return null;
}

function parseRss(xml: string, sourceName: string): RssItem[] {
	const items: RssItem[] = [];
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let match: RegExpExecArray | null;

	while ((match = itemRegex.exec(xml)) !== null) {
		const itemXml = match[1];
		const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
		const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
		const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
		const sourceMatch = itemXml.match(
			/<source(?:\s+url="[^"]*")?\s*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/source>/
		);
		const descMatch = itemXml.match(
			/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/
		);

		const title = titleMatch?.[1]?.trim() || '';
		const link = linkMatch?.[1]?.trim() || '';
		const pubDate = pubDateMatch?.[1]?.trim() || '';
		const source = sourceMatch?.[1]?.trim() || sourceName;
		const description = descMatch?.[1]?.trim() || null;

		if (title && link) {
			items.push({
				title,
				link,
				pubDate,
				source,
				imageUrl: extractImageFromXml(itemXml),
				description
			});
		}
	}

	return items;
}

async function fetchSourceRss(sourceUrl: string, sourceName: string): Promise<RssItem[]> {
	const feedPaths = ['/rss.xml', '/feed', '/feed/', '/rss', '/index.xml', '/atom.xml'];
	const base = sourceUrl.replace(/\/$/, '');

	for (const path of feedPaths) {
		try {
			const res = await fetch(base + path, {
				headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
				signal: AbortSignal.timeout(5000)
			});
			if (res.ok) {
				const xml = await res.text();
				return parseRss(xml, sourceName);
			}
		} catch {
			continue;
		}
	}

	return [];
}

function isWithinTimeRange(pubDateStr: string, range: string): boolean {
	if (!pubDateStr || range === 'all') return true;
	const date = new Date(pubDateStr);
	if (isNaN(date.getTime())) return true;

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffHour = diffMs / (1000 * 60 * 60);

	switch (range) {
		case 'hour':
			return diffHour <= 1;
		case 'day':
			return diffHour <= 24;
		case 'week':
			return diffHour <= 24 * 7;
		case 'month':
			return diffHour <= 24 * 30;
		default:
			return true;
	}
}

export const newsRouter = t.router({
	getConfig: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return { sources: [], tags: [] };
		const sources = await db
			.select()
			.from(newsSources)
			.where(eq(newsSources.userId, ctx.user.id))
			.orderBy(newsSources.order)
			.all();
		const tags = await db
			.select()
			.from(newsTags)
			.where(eq(newsTags.userId, ctx.user.id))
			.orderBy(newsTags.order)
			.all();
		return { sources, tags };
	}),

	addSource: t.procedure
		.input(z.object({ name: z.string().min(1), url: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const cleanUrl = input.url.replace(/\/$/, '');
			const existing = await db
				.select()
				.from(newsSources)
				.where(
					and(eq(newsSources.userId, ctx.user.id), eq(newsSources.url, cleanUrl))
				)
				.limit(1)
				.all();
			if (existing.length) throw new Error('Source already exists');
			const [created] = await db
				.insert(newsSources)
				.values({ userId: ctx.user.id, name: input.name, url: cleanUrl })
				.returning();
			return created;
		}),

	toggleSource: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [source] = await db
				.select()
				.from(newsSources)
				.where(eq(newsSources.id, input.id))
				.limit(1)
				.all();
			if (!source) throw new Error('Source not found');
			await db
				.update(newsSources)
				.set({ active: !source.active })
				.where(eq(newsSources.id, input.id));
			return { active: !source.active };
		}),

	removeSource: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db.delete(newsSources).where(eq(newsSources.id, input.id));
			return { id: input.id };
		}),

	addTag: t.procedure
		.input(z.object({ tag: z.string().min(1).max(30) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(newsTags)
				.where(and(eq(newsTags.userId, ctx.user.id), eq(newsTags.tag, input.tag)))
				.limit(1)
				.all();
			if (existing.length) throw new Error('Tag already exists');
			const [created] = await db
				.insert(newsTags)
				.values({ userId: ctx.user.id, tag: input.tag, active: true })
				.returning();
			return created;
		}),

	toggleTag: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [tag] = await db
				.select()
				.from(newsTags)
				.where(eq(newsTags.id, input.id))
				.limit(1)
				.all();
			if (!tag) throw new Error('Tag not found');
			await db
				.update(newsTags)
				.set({ active: !tag.active })
				.where(eq(newsTags.id, input.id));
			return { active: !tag.active };
		}),

	removeTag: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db.delete(newsTags).where(eq(newsTags.id, input.id));
			return { id: input.id };
		}),

	fetch: t.procedure
		.input(
			z
				.object({
					timeRange: z.enum(['hour', 'day', 'week', 'month', 'all']).default('all'),
					page: z.number().min(1).default(1),
					limit: z.number().min(1).max(20).default(5)
				})
				.default({ timeRange: 'all', page: 1, limit: 5 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return { items: [], total: 0, page: 1, totalPages: 0 };

			const sources = await db
				.select()
				.from(newsSources)
				.where(and(eq(newsSources.userId, ctx.user.id), eq(newsSources.active, true)))
				.all();

			if (sources.length === 0) return { items: [], total: 0, page: 1, totalPages: 0 };

			const allItems: RssItem[] = [];
			for (const source of sources) {
				const items = await fetchSourceRss(source.url, source.name);
				allItems.push(...items);
			}

			const filtered = allItems
				.filter((item) => isWithinTimeRange(item.pubDate, input.timeRange))
				.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

			const total = filtered.length;
			const totalPages = Math.ceil(total / input.limit);
			const offset = (input.page - 1) * input.limit;
			const pageItems = filtered.slice(offset, offset + input.limit);

			return {
				items: pageItems.map((item) => ({
					title: item.title,
					source: item.source,
					url: item.link,
					publishedAt: item.pubDate,
					imageUrl: item.imageUrl,
					description: item.description
				})),
				total,
				page: input.page,
				totalPages
			};
		}),

	getSaved: t.procedure
		.input(
			z
				.object({
					includeRead: z.boolean().default(true),
					limit: z.number().min(1).max(100).default(50)
				})
				.default({ includeRead: true, limit: 50 })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return [];
			const conditions = [eq(newsArticles.userId, ctx.user.id)];
			if (!input.includeRead) {
				conditions.push(eq(newsArticles.read, false));
			}
			return db
				.select()
				.from(newsArticles)
				.where(and(...conditions))
				.orderBy(desc(newsArticles.savedAt))
				.limit(input.limit)
				.all();
		}),

	save: t.procedure
		.input(
			z.object({
				source: z.string(),
				title: z.string(),
				description: z.string().nullable(),
				url: z.string(),
				imageUrl: z.string().nullable(),
				publishedAt: z.string().nullable()
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db
				.insert(newsArticles)
				.values({
					userId: ctx.user.id,
					source: input.source,
					title: input.title,
					description: input.description,
					url: input.url,
					imageUrl: input.imageUrl,
					publishedAt: input.publishedAt,
					read: false
				})
				.onConflictDoNothing();
			return { saved: true };
		}),

	unsave: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db
				.delete(newsArticles)
				.where(and(eq(newsArticles.id, input.id), eq(newsArticles.userId, ctx.user.id)));
			return { id: input.id };
		}),

	markRead: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [article] = await db
				.select()
				.from(newsArticles)
				.where(and(eq(newsArticles.id, input.id), eq(newsArticles.userId, ctx.user.id)))
				.limit(1)
				.all();
			if (!article) throw new Error('Article not found');
			await db
				.update(newsArticles)
				.set({ read: !article.read })
				.where(eq(newsArticles.id, input.id));
			return { read: !article.read };
		})
});

export type NewsRouter = typeof newsRouter;