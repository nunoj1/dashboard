import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { stockTickers } from '$lib/db/schema/index';
import { t } from '../init';

async function fetchYahooData(symbol: string) {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
		}
	});
	if (!res.ok) throw new Error(`Yahoo error ${res.status}`);
	const json = await res.json();
	const result = json.chart?.result?.[0];
	if (!result) throw new Error('No data');

	const meta = result.meta;
	const prices = result.indicators?.quote?.[0]?.close?.filter((x: number | null) => x !== null) || [];

	return {
		price: meta.regularMarketPrice as number,
		previousClose: (meta.previousClose || meta.chartPreviousClose) as number,
		currency: meta.currency as string,
		chart: prices as number[]
	};
}

export const stockRouter = t.router({
	getAll: t.procedure.query(async ({ ctx }) => {
		if (!ctx.user) return [];
		const tickers = await db.select().from(stockTickers).orderBy(stockTickers.order).all();

		const enriched = await Promise.all(
			tickers.map(async (ticker) => {
				try {
					const data = await fetchYahooData(ticker.symbol);
					const change = data.price - data.previousClose;
					const changePercent = (change / data.previousClose) * 100;
					return {
						...ticker,
						price: data.price,
						change,
						changePercent,
						currency: data.currency,
						chart: data.chart
					};
				} catch {
					return { ...ticker, price: null, change: null, changePercent: null, currency: null, chart: [] as number[] };
				}
			})
		);

		return enriched;
	}),

	add: t.procedure
		.input(z.object({
			symbol: z.string().min(1),
			name: z.string().min(1)
		}))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [ticker] = await db.insert(stockTickers).values({
				userId: ctx.user.id,
				symbol: input.symbol.toUpperCase(),
				name: input.name
			}).returning();
			return ticker;
		}),

	remove: t.procedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			await db.delete(stockTickers).where(eq(stockTickers.id, input.id));
			return { id: input.id };
		})
});

export type StockRouter = typeof stockRouter;