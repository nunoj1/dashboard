<script lang="ts">
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import TodoForm from './TodoForm.svelte';
	import TodoList from './TodoList.svelte';
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

	const totalPages = $derived(Math.ceil(historyTotal / historyLimit));
</script>

<div class="space-y-0">
	<TodoForm onsubmit={addTodo} />

	<div class="separator mt-6 mb-4"></div>

	<div class="mb-4 flex items-center justify-between">
		<div class="card-inner flex gap-1 p-1">
			<button
				onclick={() => {
					filter = 'active';
				}}
				class="{filter === 'active'
					? 'btn-toggle-active'
					: 'btn-toggle-inactive'} px-4 py-1.5 text-sm"
			>
				Active
			</button>
			<button
				onclick={() => {
					filter = 'done';
					historyPage = 1;
				}}
				class="{filter === 'done'
					? 'btn-toggle-active'
					: 'btn-toggle-inactive'} px-4 py-1.5 text-sm"
			>
				History
			</button>
		</div>
	</div>

	{#if filter === 'active'}
		<div class="mb-4 flex items-center justify-between">
			<div class="card-inner flex gap-1 p-1">
				{#each [['none', 'None'], ['category', 'Category'], ['location', 'Location']] as [val, label] (val)}
					<button
						onclick={() => (activeGroupBy = val as 'none' | 'category' | 'location')}
						class="{activeGroupBy === val
							? 'btn-toggle-active'
							: 'btn-toggle-inactive'} px-3 py-1 text-xs"
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
				class="input flex-1"
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
	/>

	{#if filter === 'done' && totalPages > 1}
		<div class="separator mt-6 flex items-center justify-center pt-4">
			<Pagination
				current={historyPage}
				total={totalPages}
				onChange={(p) => {
					historyPage = p;
					loadHistory();
				}}
			/>
		</div>
	{/if}
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
