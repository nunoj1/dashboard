<script lang="ts">
	let { priority } = $props<{ priority: 'low' | 'medium' | 'high' }>();

	const color: Record<string, string> = {
		low: 'bg-emerald-500',
		medium: 'bg-amber-500',
		high: 'bg-red-500'
	};

	const resolved = $derived(color[priority] ?? 'bg-zinc-500');
</script>

<div class="h-2 w-2 rounded-full {resolved}" title="Priority: {priority}"></div>
