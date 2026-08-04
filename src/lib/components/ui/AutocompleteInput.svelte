<script lang="ts">
	let {
		value = $bindable(),
		options = [],
		placeholder = 'Type or select...'
	} = $props<{
		value: string;
		options?: string[];
		placeholder?: string;
	}>();

	let open = $state(false);

	const filtered = $derived(
		options.filter((o: string) => o.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
	);

	function select(opt: string) {
		value = opt;
		open = false;
	}

	function handleBlur() {
		setTimeout(() => (open = false), 200);
	}
</script>

<div class="relative">
	<input
		type="text"
		bind:value
		{placeholder}
		onfocus={() => (open = true)}
		onblur={handleBlur}
		class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
	/>
	{#if open && filtered.length > 0 && value}
		<div
			class="absolute top-full right-0 left-0 z-20 mt-1 max-h-40 overflow-hidden overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl"
		>
			{#each filtered as opt (opt)}
				<button
					type="button"
					onclick={() => select(opt)}
					class="w-full px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-800"
				>
					{opt}
				</button>
			{/each}
		</div>
	{/if}
</div>
