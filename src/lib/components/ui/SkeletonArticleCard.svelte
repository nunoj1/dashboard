<script lang="ts">
	import Skeleton from './Skeleton.svelte';
</script>

<div class="flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2">
	<Skeleton class="h-20 w-28 shrink-0 rounded-md" />
	<div class="min-w-0 flex-1 space-y-2 py-1">
		<Skeleton class="h-3.5 w-5/6" />
		<Skeleton class="h-2.5 w-1/4" />
		<Skeleton class="h-2.5 w-full" />
		<Skeleton class="h-2.5 w-2/3" />
	</div>
</div>
