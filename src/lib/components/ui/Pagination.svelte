<script lang="ts">
	interface Props {
		current: number;
		total: number;
		onChange: (page: number) => void;
	}

	let { current, total, onChange }: Props = $props();

	function visiblePages(curr: number, tot: number): (number | string)[] {
		if (tot <= 7) return Array.from({ length: tot }, (_, i) => i + 1);

		const pages: (number | string)[] = [1];
		if (curr > 4) pages.push('...');

		const start = Math.max(2, curr - 2);
		const end = Math.min(tot - 1, curr + 2);
		for (let i = start; i <= end; i++) pages.push(i);

		if (curr < tot - 3) pages.push('...');
		pages.push(tot);

		return pages;
	}
</script>

{#if total > 1}
	<div class="flex items-center justify-center gap-1">
		<button
			onclick={() => onChange(current - 1)}
			disabled={current <= 1}
			class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
		>
			&lt;
		</button>
		{#each visiblePages(current, total) as p (p)}
			{#if p === '...'}
				<span class="px-1 text-xs text-zinc-600">...</span>
			{:else}
				<button
					onclick={() => onChange(p as number)}
					class="min-w-7 rounded-md px-1.5 py-1 text-xs font-medium transition {current === p
						? 'bg-violet-700 text-white'
						: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}"
				>
					{p}
				</button>
			{/if}
		{/each}
		<button
			onclick={() => onChange(current + 1)}
			disabled={current >= total}
			class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
		>
			&gt;
		</button>
	</div>
{/if}
