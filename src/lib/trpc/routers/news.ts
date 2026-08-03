import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/db';
import { newsRegions, newsTags, newsArticles } from '$lib/db/schema/index';
import { t } from '../init';

interface RssItem {
	title: string;
	link: string;
	pubDate: string;
	source: string;
}

function parseRss(xml: string): RssItem[] {
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

		const title = titleMatch?.[1]?.trim() || '';
		const link = linkMatch?.[1]?.trim() || '';
		const pubDate = pubDateMatch?.[1]?.trim() || '';
		const source = sourceMatch?.[1]?.trim() || 'Google News';

		if (title && link) {
			items.push({ title, link, pubDate, source });
		}
	}

	return items;
}

function buildSearchUrl(region: string | null, activeTags: string[]): string {
	const parts: string[] = [];
	if (region?.trim()) parts.push(region.trim());

	const tags = activeTags.filter((t) => t.trim());
	if (tags.length) {
		parts.push(`(${tags.join(' OR ')})`);
	}

	const q = parts.join(' ');
	if (!q.trim()) {
		return 'https://news.google.com/rss?hl=en&gl=US&ceid=US:en';
	}

	return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en&gl=US&ceid=US:en`;
}

async function fetchNews(region: string | null, activeTags: string[]): Promise<RssItem[]> {
	const url = buildSearchUrl(region, activeTags);
	const res = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
		}
	});
	if (!res.ok) throw new Error(`Google News error: ${res.status}`);
	const xml = await res.text();
	return parseRss(xml);
}

export const newsRouter = t.router({
	getConfig: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return { region: null, tags: [] };
		const [region] = await db
			.select()
			.from(newsRegions)
			.where(eq(newsRegions.userId, ctx.user.id))
			.limit(1)
			.all();
		const tags = await db
			.select()
			.from(newsTags)
			.where(eq(newsTags.userId, ctx.user.id))
			.orderBy(newsTags.order)
			.all();
		return { region: region ?? null, tags };
	}),

	setRegion: t.procedure
		.input(z.object({ region: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const existing = await db
				.select()
				.from(newsRegions)
				.where(eq(newsRegions.userId, ctx.user.id))
				.limit(1)
				.all();
			if (existing.length) {
				await db
					.update(newsRegions)
					.set({ region: input.region })
					.where(eq(newsRegions.id, existing[0].id));
				return { id: existing[0].id };
			}
			const [created] = await db
				.insert(newsRegions)
				.values({ userId: ctx.user.id, region: input.region })
				.returning();
			return created;
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
					region: z.string().nullable().default(null),
					tags: z.array(z.string()).default([])
				})
				.default({ region: null, tags: [] })
		)
		.query(async ({ input }) => {
			const activeTags = input.tags.filter((t) => t.trim());
			return fetchNews(input.region, activeTags);
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