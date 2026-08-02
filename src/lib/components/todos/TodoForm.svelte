<script lang="ts">
	import CategoryInput from './CategoryInput.svelte';
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

	onMount(async () => {
		const cats = await trpc().category.getAll.query();
		allCategories = cats.map(c => c.name);
	});

	function addSubtaskInput() {
		subtaskInputs = [...subtaskInputs, ''];
	}

	function updateSubtask(index: number, value: string) {
		subtaskInputs = subtaskInputs.map((s, i) => i === index ? value : s);
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

		onsubmit({
			title,
			description: description || undefined,
			priority: mode === 'priority' ? priority : 'medium',
			dueDate: combinedDate,
			category: cat,
			location: location.trim() || undefined,
			subtaskTitles: subtaskInputs.filter(s => s.trim())
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
	<div class="flex gap-3">
		<input
			type="text"
			bind:value={title}
			placeholder="What needs doing?"
			class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
		/>
		<button
			type="submit"
			class="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition shrink-0"
		>
			Add
		</button>
	</div>

	<button
		type="button"
		onclick={() => advanced = !advanced}
		class="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1"
	>
		<svg class="w-3 h-3 transition-transform {advanced ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
		</svg>
		{advanced ? 'Hide options' : 'Advanced options'}
	</button>

	{#if advanced}
		<div class="bg-zinc-950/50 rounded-lg border border-zinc-800/50 p-4 space-y-4">
			<!-- Category & Location -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Category</p>
					<CategoryInput bind:value={category} categories={allCategories} />
				</div>
				<div>
					<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Location</p>
					<input
						type="text"
						bind:value={location}
						placeholder="Where?"
						class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
					/>
				</div>
			</div>

			<!-- Mode toggle -->
			<div class="border-t border-zinc-800/30 pt-4">
				<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Type</p>
				<div class="flex gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800/50">
					<button
						type="button"
						onclick={() => mode = 'schedule'}
						class="flex-1 text-xs font-medium py-1.5 rounded-md transition {mode === 'schedule' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
					>
						📅 Due date
					</button>
					<button
						type="button"
						onclick={() => mode = 'priority'}
						class="flex-1 text-xs font-medium py-1.5 rounded-md transition {mode === 'priority' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}"
					>
						⚡ Priority only
					</button>
				</div>
			</div>

			{#if mode === 'schedule'}
				<div class="border-t border-zinc-800/30 pt-4">
					<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Due</p>
					<div class="flex gap-3">
						<input
							type="date"
							bind:value={dueDate}
							class="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
						/>
						<input
							type="time"
							bind:value={dueTime}
							class="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 [color-scheme:dark]"
						/>
					</div>
					<p class="text-xs text-zinc-600 mt-1.5">Priority auto-set by urgency.</p>
				</div>
			{:else}
				<div class="border-t border-zinc-800/30 pt-4">
					<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Priority</p>
					<select
						bind:value={priority}
						class="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500"
					>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>
			{/if}

			<div class="border-t border-zinc-800/30 pt-4">
				<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Description</p>
				<textarea
					bind:value={description}
					placeholder="Add details..."
					rows="2"
					class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition text-sm resize-none"
				></textarea>
			</div>

			<div class="border-t border-zinc-800/30 pt-4">
				<div class="flex items-center justify-between mb-2">
					<p class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Subtasks</p>
					<span class="text-[10px] text-zinc-600">Break into smaller steps</span>
				</div>
				<div class="space-y-2">
					{#each subtaskInputs as _, i}
						<div class="flex gap-2">
							<input
								type="text"
								value={subtaskInputs[i]}
								oninput={(e) => updateSubtask(i, e.currentTarget.value)}
								placeholder="Step {i + 1}"
								class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition text-sm"
							/>
							<button
								type="button"
								onclick={() => removeSubtaskInput(i)}
								class="text-zinc-600 hover:text-red-400 text-sm px-2"
							>
								×
							</button>
						</div>
					{/each}
					<button
						type="button"
						onclick={addSubtaskInput}
						class="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 mt-1"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
						</svg>
						Add subtask
					</button>
				</div>
			</div>
		</div>
	{/if}
</form>