<script lang="ts">
	let {
		checked = $bindable(),
		onchange,
		disabled = false
	} = $props<{
		checked?: boolean;
		onchange?: () => void;
		disabled?: boolean;
	}>();
</script>

<button
	type="button"
	onclick={onchange}
	{disabled}
	class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition
		{checked ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'}
		{disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-zinc-500'}"
>
	{#if checked}
		<svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
		</svg>
	{/if}
</button>
