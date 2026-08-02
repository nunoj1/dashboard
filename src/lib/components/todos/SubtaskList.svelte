<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	interface Subtask {
		id: number;
		title: string;
		done: boolean | null;
	}

	let { subtasks, ontoggle, ondelete } = $props<{
		subtasks: Subtask[];
		ontoggle: (id: number) => void;
		ondelete: (id: number) => void;
	}>();

	const completedCount = $derived(subtasks.filter((s: Subtask) => s.done).length);
	const total = $derived(subtasks.length);
</script>

<div class="mt-3 pl-8 space-y-1.5">
	{#if total > 0}
		<div class="flex items-center gap-2 mb-2">
			<div class="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden">
				<div class="h-full bg-indigo-500 rounded-full transition-all" style="width: {(completedCount / total) * 100}%"></div>
			</div>
			<span class="text-xs text-zinc-500">{completedCount}/{total}</span>
		</div>
	{/if}

	{#each subtasks as st (st.id)}
		<div class="flex items-center gap-2 group/sub">
			<Checkbox checked={!!st.done} onchange={() => ontoggle(st.id)} />
			<span class="text-sm {st.done ? 'text-zinc-600 line-through' : 'text-zinc-300'}">{st.title}</span>
			<button
				onclick={() => ondelete(st.id)}
				class="text-zinc-700 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition text-xs ml-auto"
			>
				Remove
			</button>
		</div>
	{/each}
</div>