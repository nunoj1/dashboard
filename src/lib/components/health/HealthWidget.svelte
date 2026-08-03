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

	function getWeekCount(year: number, month: number): number {
		const firstOfMonth = new Date(year, month - 1, 1);
		const lastOfMonth = new Date(year, month, 0);
		const firstDayOfWeek = firstOfMonth.getDay();
		const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
		const firstMonday = new Date(year, month - 1, 1 - daysFromMonday);
		const lastDayOfWeek = lastOfMonth.getDay();
		const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
		const lastSunday = new Date(year, month - 1, lastOfMonth.getDate() + daysToSunday);
		const diffTime = lastSunday.getTime() - firstMonday.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		return Math.ceil((diffDays + 1) / 7);
	}

	function getCurrentWeek(year: number, month: number): number {
		const today = new Date();
		if (today.getFullYear() !== year || today.getMonth() + 1 !== month) return 1;

		const firstOfMonth = new Date(year, month - 1, 1);
		const firstDayOfWeek = firstOfMonth.getDay();
		const daysFromMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
		const firstMonday = new Date(year, month - 1, 1 - daysFromMonday);

		const todayDayOfWeek = today.getDay();
		const todayDaysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
		const todayMonday = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate() - todayDaysFromMonday
		);

		const diffTime = todayMonday.getTime() - firstMonday.getTime();
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
		return Math.floor(diffDays / 7) + 1;
	}

	let habits = $state<Habit[]>([]);
	let currentMonth = $state(
		`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
	);
	let currentWeek = $state(1);
	let viewMode = $state<'monthly' | 'weekly'>('monthly');
	let isMobile = $state(false);

	let newName = $state('');
	let newColor = $state<'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet'>('indigo');
	let newTargetType = $state<'daily' | 'weekly' | 'monthly' | 'none'>('none');
	let newTargetCount = $state(3);
	let loading = $state(false);
	let error = $state('');

	let deletingHabitId = $state<number | null>(null);

	const colorOptions = [
		{ value: 'indigo' as const, class: 'bg-indigo-500' },
		{ value: 'emerald' as const, class: 'bg-emerald-500' },
		{ value: 'sky' as const, class: 'bg-sky-500' },
		{ value: 'amber' as const, class: 'bg-amber-500' },
		{ value: 'rose' as const, class: 'bg-rose-500' },
		{ value: 'violet' as const, class: 'bg-violet-500' }
	];

	const targetTypes = [
		{ value: 'none' as const, label: 'None' },
		{ value: 'daily' as const, label: 'Daily' },
		{ value: 'weekly' as const, label: 'Weekly' },
		{ value: 'monthly' as const, label: 'Monthly' }
	];

	onMount(() => {
		const mql = window.matchMedia('(max-width: 640px)');
		isMobile = mql.matches;
		if (isMobile) viewMode = 'weekly';

		const [year, month] = currentMonth.split('-').map(Number);
		currentWeek = getCurrentWeek(year, month);

		const handler = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
			if (e.matches) viewMode = 'weekly';
		};
		mql.addEventListener('change', handler);
		loadHabits();
		return () => mql.removeEventListener('change', handler);
	});

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
		const newWeekCount = getWeekCount(date.getFullYear(), date.getMonth() + 1);
		currentWeek = Math.min(currentWeek, newWeekCount);
	}

	function nextMonth() {
		const [year, month] = currentMonth.split('-').map(Number);
		const date = new Date(year, month, 1);
		currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const newWeekCount = getWeekCount(date.getFullYear(), date.getMonth() + 1);
		currentWeek = Math.min(currentWeek, newWeekCount);
	}

	function prevWeek() {
		if (currentWeek > 1) {
			currentWeek--;
		} else {
			const [year, month] = currentMonth.split('-').map(Number);
			const prevMonthDate = new Date(year, month - 2, 1);
			currentMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
			currentWeek = getWeekCount(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1);
		}
	}

	function nextWeek() {
		const [year, month] = currentMonth.split('-').map(Number);
		const totalWeeks = getWeekCount(year, month);
		if (currentWeek < totalWeeks) {
			currentWeek++;
		} else {
			const nextMonthDate = new Date(year, month, 1);
			currentMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
			currentWeek = 1;
		}
	}

	function setViewMode(mode: 'monthly' | 'weekly') {
		viewMode = mode;
		if (mode === 'weekly') {
			const [year, month] = currentMonth.split('-').map(Number);
			currentWeek = getCurrentWeek(year, month);
		}
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
				targetCount:
					newTargetType === 'weekly' || newTargetType === 'monthly'
						? newTargetCount
						: undefined
			});
			newName = '';
			newColor = 'indigo';
			newTargetType = 'none';
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
		habits.filter(
			(h) => h.targetStatus.expected > 0 && h.targetStatus.actual < h.targetStatus.expected
		)
	);

	let showCountInput = $derived(newTargetType === 'weekly' || newTargetType === 'monthly');

	let weekCount = $derived((() => {
		const [year, month] = currentMonth.split('-').map(Number);
		return getWeekCount(year, month);
	})());
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<button
				onclick={viewMode === 'weekly' ? prevWeek : prevMonth}
				class="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
			>
				←
			</button>
			<span class="min-w-[100px] text-center text-sm font-medium text-zinc-300">
				{currentMonth}{#if viewMode === 'weekly'} / Week {currentWeek}{/if}
			</span>
			<button
				onclick={viewMode === 'weekly' ? nextWeek : nextMonth}
				class="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-300"
			>
				→
			</button>
		</div>

		{#if !isMobile}
			<div class="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
				<button
					type="button"
					onclick={() => setViewMode('monthly')}
					class="rounded-md px-3 py-1 text-xs font-medium transition {viewMode === 'monthly'
						? 'bg-zinc-800 text-zinc-100'
						: 'text-zinc-500 hover:text-zinc-300'}"
				>
					Monthly
				</button>
				<button
					type="button"
					onclick={() => setViewMode('weekly')}
					class="rounded-md px-3 py-1 text-xs font-medium transition {viewMode === 'weekly'
						? 'bg-zinc-800 text-zinc-100'
						: 'text-zinc-500 hover:text-zinc-300'}"
				>
					Weekly
				</button>
			</div>
		{/if}
	</div>

	{#if viewMode === 'weekly'}
		<div class="flex flex-wrap gap-1">
			{#each Array.from({ length: weekCount }, (_, i) => i + 1) as w (w)}
				<button
					type="button"
					onclick={() => (currentWeek = w)}
					class="rounded-md px-2 py-1 text-[11px] font-medium transition {currentWeek === w
						? 'bg-zinc-800 text-zinc-100'
						: 'text-zinc-500 hover:text-zinc-300'}"
				>
					Week {w}
				</button>
			{/each}
		</div>
	{/if}

	{#if habits.length > 0}
		<HabitGrid
			{habits}
			month={currentMonth}
			week={currentWeek}
			{viewMode}
			onUpdate={loadHabits}
			onDelete={handleDeleteRequest}
		/>

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
		<!-- Mobile layout -->
		<div class="flex flex-col gap-2 sm:hidden">
			<input
				type="text"
				bind:value={newName}
				placeholder="New habit (e.g. Exercise, Read, Meditate)"
				class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
			/>
			<div class="flex gap-2">
				<select
					bind:value={newColor}
					class="w-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
				>
					{#each colorOptions as c (c.value)}
						<option value={c.value}>{c.value}</option>
					{/each}
				</select>
				<select
					bind:value={newTargetType}
					class="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
				>
					{#each targetTypes as tt (tt.value)}
						<option value={tt.value}>{tt.label}</option>
					{/each}
				</select>
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
		</div>

		<!-- Desktop layout -->
		<div class="hidden sm:flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={newName}
					placeholder="New habit (e.g. Exercise, Read, Meditate)"
					class="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
				/>
				<div class="flex shrink-0 gap-1">
					{#each colorOptions as c (c.value)}
						<button
							type="button"
							onclick={() => (newColor = c.value)}
							class="h-6 w-6 rounded-full border-2 transition {newColor === c.value
								? 'border-white ' + c.class
								: 'border-transparent ' + c.class + ' opacity-60 hover:opacity-100'}"
							aria-label="Select {c.value}"
							title={c.value}
						></button>
					{/each}
				</div>
			</div>

			<div class="h-px bg-zinc-800/50"></div>

			<div class="flex items-center gap-2">
				<span class="shrink-0 text-xs text-zinc-500">Target</span>
				<select
					bind:value={newTargetType}
					class="w-auto rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
				>
					{#each targetTypes as tt (tt.value)}
						<option value={tt.value}>{tt.label}</option>
					{/each}
				</select>

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