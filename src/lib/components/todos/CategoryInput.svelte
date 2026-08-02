<script lang="ts">
	let { value = $bindable(), categories = [] } = $props<{
		value: string;
		categories?: string[];
	}>();

	let open = $state(false);
	let inputRef: HTMLInputElement;

	const filtered = $derived(
		categories
			.filter((c: string) => c.toLowerCase().includes(value.toLowerCase()))
			.slice(0, 6)
	);

	function select(cat: string) {
		value = cat;
		open = false;
	}

	function handleBlur() {
		setTimeout(() => open = false, 200);
	}
</script>

<div class="relative">
	<input
		bind:this={inputRef}
		type="text"
		bind:value
		placeholder="Category or type new..."
		onfocus={() => open = true}
		onblur={handleBlur}
		class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
	/>
	{#if open && filtered.length > 0 && value}
		<div class="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden z-20 shadow-xl max-h-40 overflow-y-auto">
			{#each filtered as cat}
				<button
					type="button"
					onclick={() => select(cat)}
					class="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
				>
					{cat}
				</button>
			{/each}
		</div>
	{/if}
</div>