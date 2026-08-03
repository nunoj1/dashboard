<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';

	interface Ticker {
		id: number;
		symbol: string;
		name: string;
		price: number | null;
		change: number | null;
		changePercent: number | null;
		currency: string | null;
		chart: number[];
		timestamps: number[];
	}

	const ranges = [
		{ value: '1d' as const, label: '1D' },
		{ value: '5d' as const, label: '5D' },
		{ value: '1m' as const, label: '1M' },
		{ value: '6m' as const, label: '6M' },
		{ value: 'ytd' as const, label: 'YTD' },
		{ value: '1y' as const, label: '1Y' },
		{ value: '5y' as const, label: '5Y' },
		{ value: 'all' as const, label: 'All' }
	];

	let tickers = $state<Ticker[]>([]);
	let newSymbol = $state('');
	let newName = $state('');
	let loading = $state(false);
	let selectedRange = $state<'1d' | '5d' | '1m' | '6m' | 'ytd' | '1y' | '5y' | 'all'>('1d');

	let hoveredTickerId = $state<number | null>(null);
	let hoverData = $state<{
		x: number;
		y: number;
		price: number;
		date: string;
	} | null>(null);

	onMount(loadTickers);

	async function loadTickers() {
		loading = true;
		tickers = await trpc().stock.getAll.query({ range: selectedRange });
		loading = false;
	}

	function setRange(range: typeof selectedRange) {
		selectedRange = range;
		loadTickers();
	}

	async function addTicker(e: Event) {
		e.preventDefault();
		if (!newSymbol.trim()) return;
		await trpc().stock.add.mutate({
			symbol: newSymbol.trim(),
			name: newName.trim() || newSymbol.trim().toUpperCase()
		});
		newSymbol = '';
		newName = '';
		await loadTickers();
	}

	async function remove(id: number) {
		await trpc().stock.remove.mutate({ id });
		await loadTickers();
	}

	function sparklinePath(data: number[]) {
		if (data.length < 2) return '';
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const w = 120;
		const h = 32;
		const step = w / (data.length - 1);
		return data
			.map((v, i) => {
				const x = i * step;
				const y = h - ((v - min) / range) * h;
				return `${i === 0 ? 'M' : 'L'}${x},${y}`;
			})
			.join(' ');
	}

	function getPointCoords(data: number[], idx: number) {
		if (data.length < 2) return { x: 0, y: 0 };
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const w = 120;
		const h = 32;
		const step = w / (data.length - 1);
		const x = idx * step;
		const y = h - ((data[idx] - min) / range) * h;
		return { x, y };
	}

	function formatHoverDate(ts: number, range: string): string {
		const d = new Date(ts * 1000);
		if (range === '1d')
			return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		if (range === '5d')
			return d.toLocaleDateString('en-US', {
				weekday: 'short',
				hour: '2-digit',
				minute: '2-digit'
			});
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function handleChartMove(e: MouseEvent, t: Ticker) {
		if (t.chart.length < 2 || !t.timestamps?.length) return;
		const svg = e.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		const ratio = (e.clientX - rect.left) / rect.width;
		const idx = Math.round(ratio * (t.chart.length - 1));
		const clamped = Math.max(0, Math.min(idx, t.chart.length - 1));
		const coords = getPointCoords(t.chart, clamped);
		hoverData = {
			x: coords.x,
			y: coords.y,
			price: t.chart[clamped],
			date: formatHoverDate(t.timestamps[clamped], selectedRange)
		};
		hoveredTickerId = t.id;
	}

	function handleChartLeave() {
		hoveredTickerId = null;
		hoverData = null;
	}

	function changeColor(p: number | null) {
		if (p === null) return 'text-zinc-500';
		return p >= 0 ? 'text-emerald-400' : 'text-red-400';
	}

	function changeBg(p: number | null) {
		if (p === null) return 'stroke-zinc-600';
		return p >= 0 ? 'stroke-emerald-500' : 'stroke-red-500';
	}
</script>

<div class="space-y-3">
	<div class="min-w-0">
		<div class="flex flex-wrap gap-1 card-inner p-1">
			{#each ranges as r (r.value)}
				<button
					type="button"
					onclick={() => setRange(r.value)}
					class={selectedRange === r.value ? 'btn-toggle-active' : 'btn-toggle-inactive'}
				>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	{#if tickers.length > 0}
		<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
			{#each tickers as t (t.id)}
				<div
					class="group relative card-inner p-3 transition hover:border-zinc-700/50"
				>
					<button
						type="button"
						onclick={() => remove(t.id)}
						class="absolute top-2 right-2 text-xs text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
						aria-label="Remove {t.symbol}"
					>
						✕
					</button>

					<div class="mb-2 flex items-center justify-between pr-5">
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold text-zinc-200">{t.name}</div>
							<div class="text-xs text-zinc-600">{t.symbol}</div>
						</div>
						{#if t.price !== null}
							<div class="ml-3 shrink-0 text-right">
								<div class="text-sm font-medium text-zinc-100">{t.price.toFixed(2)}</div>
								<div class="text-[10px] text-zinc-500">{t.currency}</div>
							</div>
						{:else}
							<span class="shrink-0 text-xs text-zinc-600">—</span>
						{/if}
					</div>

					<div class="flex items-center justify-between gap-3">
						{#if t.changePercent !== null}
							<span class="shrink-0 text-xs font-semibold {changeColor(t.changePercent)}">
								{t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
							</span>
						{:else}
							<span class="shrink-0 text-xs text-zinc-600">—</span>
						{/if}

						{#if t.chart.length > 1}
							<div class="relative min-w-0 flex-1">
								<svg
									viewBox="0 0 120 32"
									class="h-8 w-full cursor-crosshair {changeBg(t.changePercent)}"
									fill="none"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									preserveAspectRatio="none"
									onmousemove={(e) => handleChartMove(e, t)}
									onmouseleave={handleChartLeave}
								>
									<path d={sparklinePath(t.chart)} vector-effect="non-scaling-stroke" />
									{#if hoveredTickerId === t.id && hoverData}
										<line
											x1={hoverData.x}
											y1="0"
											x2={hoverData.x}
											y2="32"
											stroke="#71717a"
											stroke-width="0.5"
											stroke-dasharray="2,2"
											vector-effect="non-scaling-stroke"
										/>
										<line
											x1="0"
											y1={hoverData.y}
											x2="120"
											y2={hoverData.y}
											stroke="#71717a"
											stroke-width="0.5"
											stroke-dasharray="2,2"
											vector-effect="non-scaling-stroke"
										/>
										<circle cx={hoverData.x} cy={hoverData.y} r="1.5" fill="white" />
									{/if}
								</svg>

								{#if hoveredTickerId === t.id && hoverData}
									<div
										class="pointer-events-none absolute z-10 -mt-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-100 shadow-xl"
										style="left: {Math.min(
											Math.max((hoverData.x / 120) * 100, 5),
											75
										)}%; transform: translateY(-100%);"
									>
										<span class="font-semibold">{hoverData.price.toFixed(2)}</span>
										<span class="ml-1 text-zinc-500">{t.currency}</span>
										<span class="ml-2 text-zinc-400">{hoverData.date}</span>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="py-6 text-center text-sm text-zinc-600">No tickers yet. Add one below.</p>
	{/if}

	<form onsubmit={addTicker} class="flex flex-col gap-2 border-t border-zinc-800/50 pt-3">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={newSymbol}
				placeholder="Symbol (e.g. BTC-USD)"
				class="min-w-0 flex-1 input"
			/>
			<input
				type="text"
				bind:value={newName}
				placeholder="Label"
				class="min-w-0 flex-1 input"
			/>
		</div>
		<button type="submit" class="btn-primary">Add</button>
	</form>

	{#if loading}
		<p class="text-center text-xs text-zinc-600">Updating prices...</p>
	{/if}
</div>
