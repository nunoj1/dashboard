<script lang="ts">
	import CategoryInput from './CategoryInput.svelte';
	import LocationInput from './LocationInput.svelte';
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';

	let { onsubmit } = $props<{
		onsubmit: (data: {
			title: string;
			description?: string;
			priority: 'low' | 'medium' | 'high';
			dueDate: string;
			category?: string;
			location?: string;
			subtaskTitles: string[];
		}) => void;
	}>();

	let title = $state('');
	let description = $state('');
	let mode = $state<'schedule' | 'priority'>('priority');
	let dueDate = $state('');
	let dueTime = $state('');
	let priority = $state<'low' | 'medium' | 'high'>('medium');
	let category = $state('');
	let location = $state('');
	let advanced = $state(false);
	let subtaskInputs = $state<string[]>([]);
	let allCategories = $state<string[]>([]);
	let allLocations = $state<string[]>([]);

	onMount(async () => {
		const cats = await trpc().category.getAll.query();
		allCategories = cats.map((c) => c.name);
		const locs = await trpc().location.getAll.query();
		allLocations = locs.map((l) => l.name);
	});

	function addSubtaskInput() {
		subtaskInputs = [...subtaskInputs, ''];
	}

	function updateSubtask(index: number, value: string) {
		subtaskInputs = subtaskInputs.map((s, i) => (i === index ? value : s));
	}

	function removeSubtaskInput(index: number) {
		subtaskInputs = subtaskInputs.filter((_, i) => i !== index);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!title.trim()) return;

		let combinedDate = '';
		if (mode === 'schedule' && dueDate) {
			combinedDate = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T00:00`;
		}

		const cat = category.trim() || undefined;
		if (cat && !allCategories.includes(cat)) {
			await trpc().category.create.mutate({ name: cat });
			allCategories = [...allCategories, cat];
		}

		const loc = location.trim() || undefined;
		if (loc && !allLocations.includes(loc)) {
			await trpc().location.create.mutate({ name: loc });
			allLocations = [...allLocations, loc];
		}

		onsubmit({
			title,
			description: description || undefined,
			priority: mode === 'priority' ? priority : 'medium',
			dueDate: combinedDate,
			category: cat,
			location: loc,
			subtaskTitles: subtaskInputs.filter((s) => s.trim())
		});

		title = '';
		description = '';
		mode = 'priority';
		dueDate = '';
		dueTime = '';
		priority = 'medium';
		category = '';
		location = '';
		subtaskInputs = [];
		advanced = false;
	}
</script>

<form onsubmit={handleSubmit} class="space-y-3">
	<div class="flex flex-col gap-3 sm:flex-row">
		<input
			type="text"
			bind:value={title}
			placeholder="What needs doing?"
			class="input flex-1 px-4 py-2.5"
		/>
		<button type="submit" class="btn-primary w-full sm:w-auto sm:shrink-0"> Add </button>
	</div>

	<button
		type="button"
		onclick={() => (advanced = !advanced)}
		class="label flex items-center gap-1 transition hover:text-zinc-300"
	>
		<svg
			class="h-3 w-3 transition-transform {advanced ? 'rotate-90' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
		{advanced ? 'Hide options' : 'Advanced options'}
	</button>

	{#if advanced}
		<div class="card-inner space-y-4 p-4">
			<!-- Category & Location -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="label mb-1.5">Category</p>
					<CategoryInput bind:value={category} categories={allCategories} />
				</div>
				<div>
					<p class="label mb-1.5">Location</p>
					<LocationInput bind:value={location} locations={allLocations} />
				</div>
			</div>

			<!-- Mode toggle -->
			<div class="separator-light pt-4">
				<p class=" mb-2 text-[10px] font-semibold text-zinc-500 uppercase">Type</p>
				<div class=" mb-4 flex items-center justify-between">
					<div class="card-inner flex w-full items-center gap-1 p-1">
						<button
							type="button"
							onclick={() => (mode = 'schedule')}
							class="flex-1 rounded-md py-1.5 text-xs font-medium transition {mode === 'schedule'
								? 'btn-toggle-active'
								: 'btn-toggle-inactive'}"
						>
							📅 Due date
						</button>
						<button
							type="button"
							onclick={() => (mode = 'priority')}
							class="flex-1 rounded-md py-1.5 text-xs font-medium transition {mode === 'priority'
								? 'btn-toggle-active'
								: 'btn-toggle-inactive'}"
						>
							⚡ Priority only
						</button>
					</div>
				</div>
			</div>

			{#if mode === 'schedule'}
				<div class="separator-light pt-4">
					<p class="label mb-1.5">Due</p>
					<div class="flex gap-3">
						<input type="date" bind:value={dueDate} class="input scheme-dark" />
						<input type="time" bind:value={dueTime} class="input scheme-dark" />
					</div>
					<p class="mt-1.5 text-xs text-zinc-600">Priority auto-set by urgency.</p>
				</div>
			{:else}
				<div class="separator-light pt-4">
					<p class="label mb-1.5">Priority</p>
					<select bind:value={priority} class="input">
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>
			{/if}

			<div class="separator-light pt-4">
				<p class="label mb-1.5">Description</p>
				<textarea
					bind:value={description}
					placeholder="Add details..."
					rows="2"
					class="input w-full resize-none px-4"></textarea>
			</div>

			<div class="separator-light pt-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="label">Subtasks</p>
					<span class="text-[10px] text-zinc-600">Break into smaller steps</span>
				</div>
				<div class="space-y-2">
					{#each subtaskInputs as subtask, i (i)}
						<div class="flex gap-2">
							<input
								type="text"
								value={subtask}
								oninput={(e) => updateSubtask(i, e.currentTarget.value)}
								placeholder="Step {i + 1}"
								class="input flex-1 py-1.5"
							/>
							<button
								type="button"
								onclick={() => removeSubtaskInput(i)}
								class="px-2 text-sm text-zinc-600 hover:text-red-400"
							>
								✕
							</button>
						</div>
					{/each}
					<button
						type="button"
						onclick={addSubtaskInput}
						class="link mt-1 flex items-center gap-1 text-xs"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add subtask
					</button>
				</div>
			</div>
		</div>
	{/if}
</form>
