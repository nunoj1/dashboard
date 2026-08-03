<script lang="ts">
	import DashboardHeader from '$lib/components/layout/DashboardHeader.svelte';
	import StockWidget from '$lib/components/stocks/StockWidget.svelte';
	import HealthWidget from '$lib/components/health/HealthWidget.svelte';
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
	const confirmingUnfinishedSubtasks = $derived(
		confirmingTodoId !== null
			? (activeTodos.find((t) => t.id === confirmingTodoId)?.subtasks.filter((s) => !s.done) ?? [])
			: []
	);
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
		await trpc().todo.toggle.mutate({ id: confirmingTodoId });
		activeTodos = activeTodos.filter((t) => t.id !== confirmingTodoId);
		confirmingTodoId = null;
	}

	async function toggle(id: number) {
		const result = await trpc().todo.toggle.mutate({ id });
		if (filter === 'active') {
			activeTodos = activeTodos.map((t) =>
				t.id === id ? { ...t, done: result.done, completedAt: result.completedAt } : t
			);
		} else {
			historyTodos = historyTodos.map((t) =>
				t.id === id ? { ...t, done: result.done, completedAt: result.completedAt } : t
			);
		}
	}

	async function subtaskToggle(id: number) {
		await trpc().subtask.toggle.mutate({ id });
		const update = (t: Todo) => ({
			...t,
			subtasks: t.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
		});
		activeTodos = activeTodos.map(update);
		historyTodos = historyTodos.map(update);
	}

	async function subtaskDelete(id: number) {
		await trpc().subtask.delete.mutate({ id });
		const update = (t: Todo) => ({
			...t,
			subtasks: t.subtasks.filter((s) => s.id !== id)
		});
		activeTodos = activeTodos.map(update);
		historyTodos = historyTodos.map(update);
	}

	const totalPages = $derived(Math.ceil(historyTotal / historyLimit));
</script>

<div class="min-h-screen bg-zinc-950">
	<DashboardHeader />

	<main class="p-6">
		<div class="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="min-w-0 lg:col-span-2">
				<Card title="To-Do List">
					<TodoForm onsubmit={addTodo} />

					<div class="mt-6 mb-4 border-t border-zinc-800/50"></div>

					<div class="mb-4 flex items-center justify-between">
						<div class="flex gap-1 card-inner p-1">
							<button
								onclick={() => {
									filter = 'active';
								}}
								class="rounded-md px-4 py-1.5 text-sm font-medium transition {filter === 'active'
									? 'btn-toggle-active'
									: 'btn-toggle-inactive'}"
							>
								Active
							</button>
							<button
								onclick={() => {
									filter = 'done';
									historyPage = 1;
								}}
								class="rounded-md px-4 py-1.5 text-sm font-medium transition {filter === 'done'
									? 'btn-toggle-active'
									: 'btn-toggle-inactive'}"
							>
								History
							</button>
						</div>
					</div>

					{#if filter === 'active'}
						<div class="mb-4 flex items-center justify-between">
							<div class="flex gap-1 card-inner p-1">
								{#each [['none', 'None'], ['category', 'Category'], ['location', 'Location']] as [val, label] (val)}
									<button
										onclick={() => (activeGroupBy = val as 'none' | 'category' | 'location')}
										class="rounded-md border px-3 py-1 text-xs font-medium transition {activeGroupBy ===
										val
											? 'btn-toggle-active'
											: 'btn-toggle-inactive'}"
									>
										{label}
									</button>
								{/each}
							</div>
						</div>
					{:else}
						<div class="mb-4 flex gap-2">
							<input
								type="text"
								bind:value={searchQuery}
								oninput={() => {
									historyPage = 1;
									loadHistory();
								}}
								placeholder="Search history..."
								class="flex-1 input"
							/>
						</div>
					{/if}

					<TodoList
						todos={filter === 'active' ? activeTodos : historyTodos}
						groupBy={filter === 'active' ? (activeGroupBy === 'none' ? null : activeGroupBy) : null}
						sortByUrgency={filter === 'active'}
						alwaysExpanded={filter === 'active'}
						ontoggle={toggle}
						onconfirmDone={confirmDone}
						onsubtaskToggle={subtaskToggle}
						onsubtaskDelete={subtaskDelete}
					/>

					{#if filter === 'done' && totalPages > 1}
						<div class="mt-6 flex items-center justify-between border-t border-zinc-800/50 pt-4">
							<span class="label">
								Page {historyPage} of {totalPages} ({historyTotal} total)
							</span>
							<div class="flex gap-2">
								<button
									onclick={() => {
										historyPage--;
										loadHistory();
									}}
									disabled={historyPage <= 1}
									class="btn-nav px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-30"
								>
									Previous
								</button>
								<button
									onclick={() => {
										historyPage++;
										loadHistory();
									}}
									disabled={historyPage >= totalPages}
									class="btn-nav px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-30"
								>
									Next
								</button>
							</div>
						</div>
					{/if}
				</Card>
			</div>
			<div class="min-w-0">
				<Card title="Stocks">
					<StockWidget />
				</Card>
			</div>
			<div class="min-w-0 lg:col-span-3">
				<Card title="Health Tracker">
					<HealthWidget />
				</Card>
			</div>
		</div>
	</main>
</div>

<Modal
	open={confirmingTodoId !== null}
	title="Mark as done?"
	message="This task will be moved to your history. You can view it anytime under the History tab."
	onconfirm={handleConfirmDone}
	oncancel={() => (confirmingTodoId = null)}
>
	{#if confirmingUnfinishedSubtasks.length > 0}
		<div>
			<p class="mb-2 text-sm font-medium text-amber-400">
				The following subtasks are still unfinished:
			</p>
			<ul class="space-y-1 text-sm text-zinc-300">
				{#each confirmingUnfinishedSubtasks as sub (sub.id)}
					<li class="flex items-center gap-2">
						<span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
						{sub.title}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Modal>
