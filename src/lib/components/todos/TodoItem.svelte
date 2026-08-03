<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import UrgencyBadge from '$lib/components/ui/UrgencyBadge.svelte';
	import SubtaskList from './SubtaskList.svelte';
	import { formatShortDate, getUrgency, urgencyBorder, type Urgency } from '$lib/utils/date';

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

	let {
		todo,
		ontoggle,
		onconfirmDone,
		onsubtaskToggle,
		alwaysExpanded = false
	} = $props<{
		todo: Todo;
		ontoggle: (id: number) => void;
		onconfirmDone: (id: number) => void;
		onsubtaskToggle: (id: number) => void;
		alwaysExpanded?: boolean;
	}>();

	let expanded = $derived(alwaysExpanded);
	
	const urgency: Urgency = $derived(
		getUrgency(todo.dueDate, !!todo.done, todo.priority ?? 'medium')
	);
	const hasDetails = $derived(!!todo.description || todo.subtasks.length > 0);
</script>

<div
	class="overflow-hidden rounded-lg border border-zinc-800/50 transition {urgencyBorder(
		urgency
	)} border-l-4"
>
	<div class="flex items-center gap-3 bg-zinc-950/50 px-4 py-3">
		<Checkbox
			checked={!!todo.done}
			onchange={() => (!todo.done ? onconfirmDone(todo.id) : ontoggle(todo.id))}
		/>

		{#if alwaysExpanded}
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-sm {todo.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}">
						{todo.title}
					</span>
					{#if todo.category}
						<span class="badge">
							{todo.category}
						</span>
					{/if}
					{#if todo.location}
						<span class="badge-muted">
							📍 {todo.location}
						</span>
					{/if}
					<UrgencyBadge {urgency} />
				</div>

				<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
					{#if todo.dueDate}
						<span class="text-xs {urgency === 'critical' ? 'text-red-400' : 'text-zinc-500'}">
							Due: {formatShortDate(todo.dueDate)}
						</span>
					{/if}
					{#if todo.createdAt}
						<span class="text-xs text-zinc-600">
							Created: {formatShortDate(todo.createdAt)}
						</span>
					{/if}
					{#if todo.completedAt}
						<span class="text-xs text-emerald-500">
							Completed: {formatShortDate(todo.completedAt)}
						</span>
					{/if}
				</div>
			</div>
		{:else}
			<div
				class="min-w-0 flex-1 cursor-pointer"
				onclick={() => hasDetails && (expanded = !expanded)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && (expanded = !expanded)}
			>
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-sm {todo.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}">
						{todo.title}
					</span>
					{#if todo.category}
						<span class="badge">
							{todo.category}
						</span>
					{/if}
					{#if todo.location}
						<span class="badge-muted">
							📍 {todo.location}
						</span>
					{/if}
					<UrgencyBadge {urgency} />
				</div>

				<div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
					{#if todo.dueDate}
						<span class="text-xs {urgency === 'critical' ? 'text-red-400' : 'text-zinc-500'}">
							Due: {formatShortDate(todo.dueDate)}
						</span>
					{/if}
					{#if todo.createdAt}
						<span class="text-xs text-zinc-600">
							Created: {formatShortDate(todo.createdAt)}
						</span>
					{/if}
					{#if todo.completedAt}
						<span class="text-xs text-emerald-500">
							Completed: {formatShortDate(todo.completedAt)}
						</span>
					{/if}
				</div>
			</div>

			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				class="text-xs text-zinc-600 transition hover:text-zinc-400 {hasDetails
					? 'opacity-100'
					: 'pointer-events-none opacity-0'}"
				aria-label={expanded ? 'Hide details' : 'Show details'}
				title={expanded ? 'Hide details' : 'Show details'}
			>
				<svg
					class="h-4 w-4 transition-transform {expanded ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
		{/if}
	</div>

	{#if (alwaysExpanded || expanded) && hasDetails}
		<div class="border-t border-zinc-800/30 bg-zinc-950/30 px-4 pb-4">
			{#if todo.description}
				<p class="mt-3 pl-8 text-sm whitespace-pre-wrap text-zinc-400">{todo.description}</p>
			{/if}
			{#if todo.subtasks.length > 0}
				<SubtaskList subtasks={todo.subtasks} ontoggle={onsubtaskToggle} disabled={!!todo.done} />
			{/if}
		</div>
	{/if}
</div>
