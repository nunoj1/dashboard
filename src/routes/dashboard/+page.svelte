<script lang="ts">
	import DashboardHeader from '$lib/components/layout/DashboardHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import TodoForm from '$lib/components/todos/TodoForm.svelte';
	import TodoList from '$lib/components/todos/TodoList.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';

	interface Subtask {
		id: number;
		todoId: number;
		title: string;
		done: boolean | null;
		createdAt: Date | null;
	}

	interface Todo {
		id: number;
		userId: string;
		title: string;
		description: string | null;
		done: boolean | null;
		dueDate: Date | null;
		completedAt: Date | null;
		priority: string | null;
		category: string | null;
		location: string | null;
		createdAt: Date | null;
		subtasks: Subtask[];
	}

	let activeTodos = $state<Todo[]>([]);
	let historyTodos = $state<Todo[]>([]);
	let filter = $state<'active' | 'done'>('active');
	let activeGroupBy = $state<'none' | 'category' | 'location'>('category');
	let confirmingTodoId = $state<number | null>(null);
	let searchQuery = $state('');
	let historyPage = $state(1);
	let historyLimit = $state(10);
	let historyTotal = $state(0);

	onMount(async () => {
		activeTodos = await trpc().todo.getActive.query();
	});

	async function loadHistory() {
		const result = await trpc().todo.getHistory.query({
			page: historyPage,
			limit: historyLimit,
			search: searchQuery || undefined
		});
		historyTodos = result.items as Todo[];
		historyTotal = result.total;
	}

	$effect(() => {
		if (filter === 'done') {
			loadHistory();
		}
	});

	async function addTodo(data: {
		title: string;
		description?: string;
		priority: 'low' | 'medium' | 'high';
		dueDate: string;
		category?: string;
		location?: string;
		subtaskTitles: string[];
	}) {
		const created = await trpc().todo.create.mutate({
			title: data.title,
			description: data.description,
			priority: data.priority,
			dueDate: data.dueDate || undefined,
			category: data.category,
			location: data.location,
			subtaskTitles: data.subtaskTitles
		});
		activeTodos = [...activeTodos, created as Todo];
	}

	function confirmDone(id: number) {
		confirmingTodoId = id;
	}

	async function handleConfirmDone() {
		if (confirmingTodoId === null) return;
		const result = await trpc().todo.toggle.mutate({ id: confirmingTodoId });
		activeTodos = activeTodos.filter(t => t.id !== confirmingTodoId);
		confirmingTodoId = null;
	}

	async function toggle(id: number) {
		const result = await trpc().todo.toggle.mutate({ id });
		if (filter === 'active') {
			activeTodos = activeTodos.map(t => t.id === id ? { ...t, done: result.done, completedAt: result.completedAt } : t);
		} else {
			historyTodos = historyTodos.map(t => t.id === id ? { ...t, done: result.done, completedAt: result.completedAt } : t);
		}
	}

	async function subtaskToggle(id: number) {
		await trpc().subtask.toggle.mutate({ id });
		const update = (t: Todo) => ({
			...t,
			subtasks: t.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s)
		});
		activeTodos = activeTodos.map(update);
		historyTodos = historyTodos.map(update);
	}

	async function subtaskDelete(id: number) {
		await trpc().subtask.delete.mutate({ id });
		const update = (t: Todo) => ({
			...t,
			subtasks: t.subtasks.filter(s => s.id !== id)
		});
		activeTodos = activeTodos.map(update);
		historyTodos = historyTodos.map(update);
	}

	const totalPages = $derived(Math.ceil(historyTotal / historyLimit));
</script>

<div class="min-h-screen bg-zinc-950">
	<DashboardHeader />

	<main class="p-6">
		<div class="max-w-2xl mx-auto space-y-6">
			<Card title="To-Do List">
				<TodoForm onsubmit={addTodo} />

				<div class="border-t border-zinc-800/50 mt-6 mb-4"></div>

				<div class="flex items-center justify-between mb-4">
					<div class="flex gap-1 bg-zinc-950/50 rounded-lg p-1 border border-zinc-800/50">
						<button
							onclick={() => { filter = 'active'; }}
							class="text-sm font-medium py-1.5 px-4 rounded-md transition {filter === 'active' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
						>
							Active
						</button>
						<button
							onclick={() => { filter = 'done'; historyPage = 1; }}
							class="text-sm font-medium py-1.5 px-4 rounded-md transition {filter === 'done' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
						>
							History
						</button>
					</div>
				</div>

				{#if filter === 'active'}
					<div class="flex gap-1 mb-4">
						{#each [['none', 'None'], ['category', 'Category'], ['location', 'Location']] as [val, label]}
							<button
								onclick={() => activeGroupBy = val as 'none' | 'category' | 'location'}
								class="text-xs font-medium px-3 py-1 rounded-md transition border {activeGroupBy === val ? 'bg-zinc-800 text-zinc-100 border-zinc-700' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-800'}"
							>
								{label}
							</button>
						{/each}
					</div>
				{:else}
					<div class="flex gap-2 mb-4">
						<input
							type="text"
							bind:value={searchQuery}
							oninput={() => { historyPage = 1; loadHistory(); }}
							placeholder="Search history..."
							class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
						/>
					</div>
				{/if}

				<TodoList
					todos={filter === 'active' ? activeTodos : historyTodos}
					groupBy={filter === 'active' ? (activeGroupBy === 'none' ? null : activeGroupBy) : null}
					sortByUrgency={filter === 'active'}
					ontoggle={toggle}
					onconfirmDone={confirmDone}
					onsubtaskToggle={subtaskToggle}
					onsubtaskDelete={subtaskDelete}
				/>

				{#if filter === 'done' && totalPages > 1}
					<div class="flex items-center justify-between mt-6 pt-4 border-t border-zinc-800/50">
						<span class="text-xs text-zinc-500">
							Page {historyPage} of {totalPages} ({historyTotal} total)
						</span>
						<div class="flex gap-2">
							<button
								onclick={() => { historyPage--; loadHistory(); }}
								disabled={historyPage <= 1}
								class="px-3 py-1.5 text-sm rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
							>
								Previous
							</button>
							<button
								onclick={() => { historyPage++; loadHistory(); }}
								disabled={historyPage >= totalPages}
								class="px-3 py-1.5 text-sm rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
							>
								Next
							</button>
						</div>
					</div>
				{/if}
			</Card>
		</div>
	</main>
</div>

<Modal
	open={confirmingTodoId !== null}
	title="Mark as done?"
	message="This task will be moved to your history. You can view it anytime under the History tab."
	onconfirm={handleConfirmDone}
	oncancel={() => confirmingTodoId = null}
/>