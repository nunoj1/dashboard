<script lang="ts">
	let { value = $bindable(), categories = [] } = $props<{
		value: string;
		categories?: string[];
	}>();

	let open = $state(false);
	let inputRef: HTMLInputElement;

	const filtered = $derived(
		categories.filter((c: string) => c.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
	);

	function select(cat: string) {
		value = cat;
		open = false;
	}

	function handleBlur() {
		setTimeout(() => (open = false), 200);
	}
</script>

<div class="relative">
	<input
		bind:this={inputRef}
		type="text"
		bind:value
		placeholder="Category or type new..."
		onfocus={() => (open = true)}
		onblur={handleBlur}
		class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
	/>
	{#if open && filtered.length > 0 && value}
		<div
			class="absolute top-full right-0 left-0 z-20 mt-1 max-h-40 overflow-hidden overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
		>
			{#each filtered as cat (cat)}
				<button
					type="button"
					onclick={() => select(cat)}
					class="w-full px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800"
				>
					{cat}
				</button>
			{/each}
		</div>
	{/if}
</div>
