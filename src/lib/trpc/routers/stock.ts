import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { stockTickers } from '$lib/db/schema/index';
import { t } from '../init';

const rangeMap: Record<string, { interval: string; range: string; label: string }> = {
	'1d': { interval: '5m', range: '1d', label: '1D' },
	'5d': { interval: '15m', range: '5d', label: '5D' },
	'1m': { interval: '1d', range: '1mo', label: '1M' },
	'6m': { interval: '1d', range: '6mo', label: '6M' },
	ytd: { interval: '1d', range: 'ytd', label: 'YTD' },
	'1y': { interval: '1d', range: '1y', label: '1Y' },
	'5y': { interval: '1wk', range: '5y', label: '5Y' },
	all: { interval: '1mo', range: 'max', label: 'All' }
};

type RangeKey = keyof typeof rangeMap;

async function fetchYahooData(symbol: string, range: RangeKey) {
	const cfg = rangeMap[range];
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
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
	const prices =
		result.indicators?.quote?.[0]?.close?.filter((x: number | null) => x !== null) || [];
	const price = meta.regularMarketPrice as number;
	const previousClose = (meta.previousClose || meta.chartPreviousClose) as number;
	const firstPrice = prices[0];

	let change: number;
	let changePercent: number;

	if (range === '1d') {
		change = price - previousClose;
		changePercent = previousClose ? (change / previousClose) * 100 : 0;
	} else {
		const basePrice = firstPrice || previousClose || price;
		change = price - basePrice;
		changePercent = basePrice ? (change / basePrice) * 100 : 0;
	}

	const timestampsRaw = result.timestamp || [];
	const closesRaw = result.indicators?.quote?.[0]?.close || [];
	const valid: { time: number; price: number }[] = [];
	for (let i = 0; i < timestampsRaw.length; i++) {
		if (timestampsRaw[i] !== null && closesRaw[i] !== null) {
			valid.push({ time: timestampsRaw[i] as number, price: closesRaw[i] as number });
		}
	}

	return {
		price: meta.regularMarketPrice as number,
		previousClose: (meta.previousClose || meta.chartPreviousClose) as number,
		currency: meta.currency as string,
		chart: valid.map((v) => v.price),
		timestamps: valid.map((v) => v.time),
		changePercent,
		change
	};
}

export const stockRouter = t.router({
	getAll: t.procedure
		.input(
			z
				.object({
					range: z.enum(['1d', '5d', '1m', '6m', 'ytd', '1y', '5y', 'all']).default('1d')
				})
				.default({ range: '1d' })
		)
		.query(async ({ input, ctx }) => {
			if (!ctx.user) return [];
			const tickers = await db.select().from(stockTickers).orderBy(stockTickers.order).all();

			const enriched = await Promise.all(
				tickers.map(async (ticker) => {
					try {
						const data = await fetchYahooData(ticker.symbol, input.range);
						return {
							...ticker,
							price: data.price,
							change: data.change,
							changePercent: data.changePercent,
							currency: data.currency,
							chart: data.chart,
							timestamps: data.timestamps
						};
					} catch {
						return {
							...ticker,
							price: null,
							change: null,
							changePercent: null,
							currency: null,
							chart: [] as number[],
							timestamps: [] as number[]
						};
					}
				})
			);

			return enriched;
		}),

	add: t.procedure
		.input(
			z.object({
				symbol: z.string().min(1),
				name: z.string().min(1)
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (!ctx.user) throw new Error('Unauthorized');
			const [ticker] = await db
				.insert(stockTickers)
				.values({
					userId: ctx.user.id,
					symbol: input.symbol.toUpperCase(),
					name: input.name
				})
				.returning();
			return ticker;
		}),

	remove: t.procedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
		if (!ctx.user) throw new Error('Unauthorized');
		await db.delete(stockTickers).where(eq(stockTickers.id, input.id));
		return { id: input.id };
	})
});

export type StockRouter = typeof stockRouter;
