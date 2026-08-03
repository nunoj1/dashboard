<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import HabitGrid from './HabitGrid.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface TargetStatus {
		expected: number;
		actual: number;
		label: string;
	}

	interface Habit {
		id: number;
		name: string;
		color: string | null;
		targetType: string | null;
		targetCount: number | null;
		currentStreak: number;
		longestStreak: number;
		totalCompletions: number;
		targetStatus: TargetStatus;
	}

	let habits = $state<Habit[]>([]);
	let currentMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);
	let newName = $state('');
	let newColor = $state<'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet'>('indigo');
	let newTargetType = $state<'daily' | 'weekly' | 'monthly' | 'none'>('daily');
	let newTargetCount = $state(3);
	let loading = $state(false);
	let error = $state('');

	let deletingHabitId = $state<number | null>(null);

	const colors = ['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet'] as const;
	const targetTypes = [
		{ value: 'daily' as const, label: 'Daily' },
		{ value: 'weekly' as const, label: 'Weekly' },
		{ value: 'monthly' as const, label: 'Monthly' },
		{ value: 'none' as const, label: 'None' }
	];

	onMount(loadHabits);

	async function loadHabits() {
		loading = true;
		error = '';
		try {
			habits = await trpc().health.getHabits.query();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load habits';
		} finally {
			loading = false;
		}
	}

	function prevMonth() {
		const [year, month] = currentMonth.split('-').map(Number);
		const date = new Date(year, month - 2, 1);
		currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	}

	function nextMonth() {
		const [year, month] = currentMonth.split('-').map(Number);
		const date = new Date(year, month, 1);
		currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	}

	async function addHabit(e: Event) {
		e.preventDefault();
		if (!newName.trim()) return;
		error = '';
		try {
			await trpc().health.createHabit.mutate({
				name: newName.trim(),
				color: newColor,
				targetType: newTargetType,
				targetCount: newTargetType === 'weekly' || newTargetType === 'monthly' ? newTargetCount : undefined
			});
			newName = '';
			newColor = 'indigo';
			newTargetType = 'daily';
			newTargetCount = 3;
			await loadHabits();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add habit';
		}
	}

	function handleDeleteRequest(id: number) {
		const habit = habits.find((h) => h.id === id);
		if (!habit) return;
		if (habit.totalCompletions > 0) {
			deletingHabitId = id;
		} else {
			removeHabit(id);
		}
	}

	async function removeHabit(id: number) {
		error = '';
		try {
			await trpc().health.deleteHabit.mutate({ id });
			deletingHabitId = null;
			await loadHabits();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove habit';
		}
	}

	let belowTarget = $derived(
		habits.filter((h) => h.targetStatus.expected > 0 && h.targetStatus.actual < h.targetStatus.expected)
	);

	let showCountInput = $derived(newTargetType === 'weekly' || newTargetType === 'monthly');
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<button
				onclick={prevMonth}
				class="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
			>
				←
			</button>
			<span class="min-w-[80px] text-center text-sm font-medium text-zinc-300">{currentMonth}</span>
			<button
				onclick={nextMonth}
				class="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
			>
				→
			</button>
		</div>
	</div>

	{#if habits.length > 0}
		<HabitGrid {habits} month={currentMonth} onUpdate={loadHabits} onDelete={handleDeleteRequest} />

		{#if belowTarget.length > 0}
			<div class="rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2">
				<p class="text-[11px] font-medium text-amber-400">
					⚠️ Below target:
					{#each belowTarget as h, i (h.id)}
						<span class="text-zinc-300">{h.name}</span>
						<span class="text-zinc-500">
							({h.targetStatus.actual}/{h.targetStatus.expected} {h.targetStatus.label})
						</span>{i < belowTarget.length - 1 ? ', ' : ''}
					{/each}
				</p>
			</div>
		{/if}
	{:else}
		<p class="py-8 text-center text-sm text-zinc-600">No habits yet. Add your first one below.</p>
	{/if}

	<form onsubmit={addHabit} class="flex flex-col gap-2 border-t border-zinc-800/50 pt-4">
		<input
			type="text"
			bind:value={newName}
			placeholder="New habit (e.g. Exercise, Read, Meditate)"
			class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
		/>

		<div class="flex flex-col gap-2 sm:flex-row">
			<select
				bind:value={newColor}
				class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none sm:w-auto"
			>
				{#each colors as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>

			<div class="flex flex-1 gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
				{#each targetTypes as tt (tt.value)}
					<button
						type="button"
						onclick={() => (newTargetType = tt.value)}
						class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition {newTargetType === tt.value
							? 'bg-zinc-800 text-zinc-100'
							: 'text-zinc-500 hover:text-zinc-300'}"
					>
						{tt.label}
					</button>
				{/each}
			</div>

			{#if showCountInput}
				<div class="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
					<input
						type="number"
						bind:value={newTargetCount}
						min="1"
						class="w-12 bg-transparent text-right text-sm text-zinc-100 focus:outline-none"
					/>
					<span class="text-xs text-zinc-500">
						{newTargetType === 'weekly' ? '× / week' : '× / month'}
					</span>
				</div>
			{/if}
		</div>

		<button
			type="submit"
			class="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
		>
			Add Habit
		</button>
	</form>

	{#if loading}
		<p class="text-center text-xs text-zinc-600">Updating…</p>
	{/if}
	{#if error}
		<p class="text-center text-xs text-red-400">{error}</p>
	{/if}
</div>

<Modal
	open={deletingHabitId !== null}
	title="Delete habit?"
	message="All tracked data for this habit will be permanently lost."
	onconfirm={() => {
		if (deletingHabitId !== null) removeHabit(deletingHabitId);
	}}
	oncancel={() => (deletingHabitId = null)}
/>