<script lang="ts">
	let { title, children } = $props();
</script>

<div class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
	{#if title}
		<h2 class="mb-4 text-sm font-medium tracking-wider text-zinc-400 uppercase">{title}</h2>
	{/if}
	{@render children()}
</div>
