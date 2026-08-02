<script lang="ts">
	import TodoItem from './TodoItem.svelte';
	import { getUrgency, type Urgency } from '$lib/utils/date';

	interface Subtask {
		id: number;
		title: string;
		done: boolean | null;
	}

	interface Todo {
		id: number;
		title: string;
		description: string | null;
		done: boolean | null;
		priority: string | null;
		dueDate: Date | null;
		createdAt: Date | null;
		completedAt: Date | null;
		category: string | null;
		location: string | null;
		subtasks: Subtask[];
	}

	let { todos, groupBy, sortByUrgency, ontoggle, onconfirmDone, onsubtaskToggle, onsubtaskDelete } = $props<{
		todos: Todo[];
		groupBy?: 'category' | 'location' | null;
		sortByUrgency?: boolean;
		ontoggle: (id: number) => void;
		onconfirmDone: (id: number) => void;
		onsubtaskToggle: (id: number) => void;
		onsubtaskDelete: (id: number) => void;
	}>();

	const urgencyOrder: Record<Urgency, number> = {
		critical: 0,
		urgent: 1,
		soon: 2,
		high: 3,
		normal: 4,
		low: 5,
		done: 6
	};

	function sortItems(items: Todo[]) {
		return items.slice().sort((a, b) => {
			const ua = getUrgency(a.dueDate, !!a.done, a.priority ?? 'medium');
			const ub = getUrgency(b.dueDate, !!b.done, b.priority ?? 'medium');
			if (urgencyOrder[ua] !== urgencyOrder[ub]) return urgencyOrder[ua] - urgencyOrder[ub];
			if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
			if (a.dueDate) return -1;
			if (b.dueDate) return 1;
			return b.id - a.id;
		});
	}

	const grouped = $derived(
		!groupBy || todos.length === 0
			? null
			: (() => {
					const map = new Map<string, Todo[]>();
					for (const t of todos) {
						const key = groupBy === 'location' ? (t.location || 'No location') : (t.category || 'Uncategorized');
						if (!map.has(key)) map.set(key, []);
						map.get(key)!.push(t);
					}
					return Array.from(map.entries())
						.sort((a, b) => a[0].localeCompare(b[0]))
						.map(([key, items]) => [key, sortItems(items)] as [string, Todo[]]);
				})()
	);

	const displayItems = $derived(sortByUrgency ? sortItems(todos) : todos);
</script>

{#if grouped && grouped.length > 0}
	{#each grouped as [group, items] (group)}
		<div class="mb-5">
			<h3 class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
				<span class="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
				{group}
			</h3>
			<div class="space-y-2">
				{#each items as todo (todo.id)}
					<TodoItem {todo} {ontoggle} {onconfirmDone} {onsubtaskToggle} {onsubtaskDelete} />
				{/each}
			</div>
		</div>
	{/each}
{:else if todos.length > 0}
	<div class="space-y-2">
		{#each displayItems as todo (todo.id)}
			<TodoItem {todo} {ontoggle} {onconfirmDone} {onsubtaskToggle} {onsubtaskDelete} />
		{/each}
	</div>
{:else}
	<p class="text-zinc-600 text-sm text-center py-8">
		{sortByUrgency ? 'No active tasks. All caught up!' : 'No tasks found.'}
	</p>
{/if}