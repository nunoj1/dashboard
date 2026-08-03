<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import HabitGrid from './HabitGrid.svelte';

	interface Habit {
		id: number;
		name: string;
		color: string;
		currentStreak: number;
		longestStreak: number;
		totalCompletions: number;
	}

	let habits = $state<Habit[]>([]);
	let currentMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);
	let newName = $state('');
	let newColor = $state('indigo');
	let loading = $state(false);
	let error = $state('');

	const colors = ['indigo', 'emerald', 'sky', 'amber', 'rose', 'violet'] as const;

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
			await trpc().health.createHabit.mutate({ name: newName.trim(), color: newColor });
			newName = '';
			newColor = 'indigo';
			await loadHabits();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add habit';
		}
	}

	async function removeHabit(id: number) {
		error = '';
		try {
			await trpc().health.deleteHabit.mutate({ id });
			await loadHabits();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove habit';
		}
	}

	let insights = $derived((() => {
		if (habits.length === 0) return null;
		const totalCompletions = habits.reduce((sum, h) => sum + h.totalCompletions, 0);
		const bestHabit = habits.reduce((best, h) =>
			h.totalCompletions > best.totalCompletions ? h : best
		, habits[0]);
		return {
			totalHabits: habits.length,
			totalCompletions,
			bestHabit: bestHabit.name,
			bestCount: bestHabit.totalCompletions
		};
	})());
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
		<HabitGrid {habits} month={currentMonth} onUpdate={loadHabits} />

		{#if insights}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2">
					<p class="text-[10px] uppercase tracking-wider text-zinc-600">Habits</p>
					<p class="text-lg font-semibold text-zinc-200">{insights.totalHabits}</p>
				</div>
				<div class="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2">
					<p class="text-[10px] uppercase tracking-wider text-zinc-600">All-Time</p>
					<p class="text-lg font-semibold text-zinc-200">{insights.totalCompletions}</p>
				</div>
				<div class="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2">
					<p class="text-[10px] uppercase tracking-wider text-zinc-600">Top Habit</p>
					<p class="truncate text-lg font-semibold text-zinc-200" title={insights.bestHabit}>
						{insights.bestHabit}
					</p>
				</div>
				<div class="rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2">
					<p class="text-[10px] uppercase tracking-wider text-zinc-600">Top Count</p>
					<p class="text-lg font-semibold text-zinc-200">{insights.bestCount}</p>
				</div>
			</div>
		{/if}

		<div class="space-y-2 pt-2">
			<p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Manage</p>
			{#each habits as habit (habit.id)}
				<div
					class="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-950/50 px-3 py-2"
				>
					<div class="flex items-center gap-2 min-w-0">
						<span class="h-2 w-2 shrink-0 rounded-full bg-{habit.color}-500"></span>
						<span class="truncate text-sm text-zinc-300" title={habit.name}>{habit.name}</span>
					</div>
					<button
						onclick={() => removeHabit(habit.id)}
						class="shrink-0 text-xs text-zinc-700 transition hover:text-red-400"
						aria-label="Remove {habit.name}"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-zinc-600">No habits yet. Add your first one below.</p>
	{/if}

	<form onsubmit={addHabit} class="flex flex-col gap-2 border-t border-zinc-800/50 pt-4">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={newName}
				placeholder="New habit (e.g. Exercise, Read, Meditate)"
				class="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
			/>
			<select
				bind:value={newColor}
				class="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
			>
				{#each colors as c (c)}
					<option value={c}>{c}</option>
				{/each}
			</select>
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