<script lang="ts">
	let { title, children } = $props();
</script>

<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
	{#if title}
		<h2 class="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">{title}</h2>
	{/if}
	{@render children()}
</div>