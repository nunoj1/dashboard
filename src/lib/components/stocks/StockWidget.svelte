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
	<div class="flex flex-wrap gap-1">
		{#each ranges as r (r.value)}
			<button
				type="button"
				onclick={() => setRange(r.value)}
				class="rounded-md px-2 py-1 text-[11px] font-medium transition {selectedRange === r.value
					? 'bg-indigo-500 text-white'
					: 'text-zinc-500 hover:text-zinc-300'}"
			>
				{r.label}
			</button>
		{/each}
	</div>

	{#if tickers.length > 0}
		<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
			{#each tickers as t (t.id)}
				<div
					class="group relative rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-3 transition hover:border-zinc-700/50"
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
							<div class="min-w-0 flex-1">
								<svg
									viewBox="0 0 120 32"
									class="h-8 w-full {changeBg(t.changePercent)}"
									fill="none"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									preserveAspectRatio="none"
								>
									<path d={sparklinePath(t.chart)} vector-effect="non-scaling-stroke" />
								</svg>
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
				class="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
			/>
			<input
				type="text"
				bind:value={newName}
				placeholder="Label"
				class="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
			/>
		</div>
		<button
			type="submit"
			class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
		>
			Add
		</button>
	</form>

	{#if loading}
		<p class="text-center text-xs text-zinc-600">Updating prices...</p>
	{/if}
</div>