<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';

	interface Subtask {
		id: number;
		title: string;
		done: boolean | null;
	}

	let {
		subtasks,
		ontoggle,
		disabled = false
	} = $props<{
		subtasks: Subtask[];
		ontoggle: (id: number) => void;
		disabled?: boolean;
	}>();

	const completedCount = $derived(subtasks.filter((s: Subtask) => s.done).length);
	const total = $derived(subtasks.length);
</script>

<div class="mt-3 space-y-1.5 pl-8">
	{#if total > 0}
		<div class="mb-2 flex items-center gap-2">
			<div class="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
				<div
					class="h-full rounded-full bg-indigo-500 transition-all"
					style="width: {(completedCount / total) * 100}%"
				></div>
			</div>
			<span class="label">{completedCount}/{total}</span>
		</div>
	{/if}

	{#each subtasks as st (st.id)}
		<div class="group/sub flex items-center gap-2">
			<Checkbox checked={!!st.done} onchange={() => ontoggle(st.id)} {disabled} />
			<span class="text-sm {st.done ? 'text-zinc-600 line-through' : 'text-zinc-300'}"
				>{st.title}</span
			>
		</div>
	{/each}
</div>
