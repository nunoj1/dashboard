import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { newsSources, newsArticles } from '$lib/db/schema/index';
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

	const mediaContent = itemXml.match(/<media:content[^>]+url="([^"]+)"[^>]*type="image\/[^"]*"/i);
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

async function fetchSourceRss(
	sourceUrl: string,
	sourceName: string,
	maxItems: number = 20
): Promise<RssItem[]> {
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
				const items = parseRss(xml, sourceName);
				return items.slice(0, maxItems);
			}
		} catch {
			continue;
		}
	}

	return [];
}

function parseRssDate(dateStr: string): Date | null {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	if (!isNaN(d.getTime())) return d;
	return null;
}

function isWithinTimeRange(pubDateStr: string, range: string): boolean {
	if (!pubDateStr || range === 'all') return true;
	const date = parseRssDate(pubDateStr);
	if (!date) return true;

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
		if (!ctx.user) return { sources: [] };
		const sources = await db
			.select()
			.from(newsSources)
			.where(eq(newsSources.userId, ctx.user.id))
			.orderBy(newsSources.order)
			.all();
		return { sources };
	}),

	addSource: t.procedure
		.input(z.object({ name: z.string().min(1), url: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const cleanUrl = input.url.replace(/\/$/, '');
			const existing = await db
				.select()
				.from(newsSources)
				.where(and(eq(newsSources.userId, ctx.user.id), eq(newsSources.url, cleanUrl)))
				.limit(1)
				.all();
			if (existing.length) throw new Error('Source already exists');
			const [created] = await db
				.insert(newsSources)
				.values({ userId: ctx.user.id, name: input.name, url: cleanUrl })
				.returning();
			return created;
		}),

	toggleSource: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
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

	removeSource: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		await db.delete(newsSources).where(eq(newsSources.id, input.id));
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

			const MAX_PER_SOURCE = 20;
			const allItems: RssItem[] = [];
			for (const source of sources) {
				const items = await fetchSourceRss(source.url, source.name, MAX_PER_SOURCE);
				allItems.push(...items);
			}

			const filtered = allItems
				.filter((item) => isWithinTimeRange(item.pubDate, input.timeRange))
				.sort((a, b) => {
					const da = parseRssDate(a.pubDate);
					const db_ = parseRssDate(b.pubDate);
					if (!da && !db_) return 0;
					if (!da) return 1;
					if (!db_) return -1;
					return db_.getTime() - da.getTime();
				});

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

	getSavedUrls: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const articles = await db
			.select({ url: newsArticles.url })
			.from(newsArticles)
			.where(eq(newsArticles.userId, ctx.user.id))
			.all();
		return articles.map((a) => a.url);
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

	unsave: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		await db
			.delete(newsArticles)
			.where(and(eq(newsArticles.id, input.id), eq(newsArticles.userId, ctx.user.id)));
		return { id: input.id };
	}),

	markRead: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		const [article] = await db
			.select()
			.from(newsArticles)
			.where(and(eq(newsArticles.id, input.id), eq(newsArticles.userId, ctx.user.id)))
			.limit(1)
			.all();
		if (!article) throw new Error('Article not found');
		await db.update(newsArticles).set({ read: !article.read }).where(eq(newsArticles.id, input.id));
		return { read: !article.read };
	})
});

export type NewsRouter = typeof newsRouter;
