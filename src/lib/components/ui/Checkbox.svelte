<script lang="ts">
	let { checked = $bindable(), onchange, disabled = false } = $props<{
		checked?: boolean;
		onchange?: () => void;
		disabled?: boolean;
	}>();
</script>

<button
	type="button"
	onclick={onchange}
	{disabled}
	class="w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0
		{checked ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}
		{disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-zinc-500'}"
>
	{#if checked}
		<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
		</svg>
	{/if}
</button>