<script lang="ts">
	import { trpc } from '$lib/trpc/client';

	interface Habit {
		id: number;
		name: string;
		color: string;
		currentStreak: number;
		longestStreak: number;
		totalCompletions: number;
	}

	interface Entry {
		id: number;
		habitId: number;
		date: string;
		completed: boolean;
	}

	let { habits, month, onUpdate } = $props<{
		habits: Habit[];
		month: string;
		onUpdate: () => void;
	}>();

	let entries = $state<Entry[]>([]);
	let loading = $state(false);

	const colorMap: Record<string, string> = {
		indigo: 'bg-indigo-500 border-indigo-400 hover:bg-indigo-400',
		emerald: 'bg-emerald-500 border-emerald-400 hover:bg-emerald-400',
		sky: 'bg-sky-500 border-sky-400 hover:bg-sky-400',
		amber: 'bg-amber-500 border-amber-400 hover:bg-amber-400',
		rose: 'bg-rose-500 border-rose-400 hover:bg-rose-400',
		violet: 'bg-violet-500 border-violet-400 hover:bg-violet-400'
	};

	let daysInMonth = $derived((() => {
		const [year, monthNum] = month.split('-').map(Number);
		return new Date(year, monthNum, 0).getDate();
	})());

	let gridStyle = $derived(
		`grid-template-columns: minmax(80px, auto) repeat(${daysInMonth}, minmax(0, 1fr))`
	);

	let dayLabels = $derived((() => {
		const [year, monthNum] = month.split('-').map(Number);
		const days = [];
		for (let i = 1; i <= daysInMonth; i++) {
			const date = new Date(year, monthNum - 1, i);
			const today = new Date();
			days.push({
				day: i,
				label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
				isToday:
					today.getFullYear() === year &&
					today.getMonth() + 1 === monthNum &&
					today.getDate() === i
			});
		}
		return days;
	})());

	function getEntry(habitId: number, day: number): Entry | undefined {
		const dateStr = `${month}-${String(day).padStart(2, '0')}`;
		return entries.find((e) => e.habitId === habitId && e.date === dateStr);
	}

	async function toggle(habitId: number, day: number) {
		const dateStr = `${month}-${String(day).padStart(2, '0')}`;
		await trpc().health.toggleEntry.mutate({ habitId, date: dateStr });
		await loadEntries();
		onUpdate();
	}

	async function loadEntries() {
		loading = true;
		entries = await trpc().health.getEntries.query({ month });
		loading = false;
	}

	$effect(() => {
		loadEntries();
	});
</script>

<div class="w-full">
	<!-- Header row -->
	<div class="grid gap-px" style={gridStyle}>
		<div class="text-[10px] font-medium text-zinc-600"></div>
		{#each dayLabels as { day, label, isToday } (day)}
			<div class="flex flex-col items-center gap-px">
				<span class="text-[9px] leading-3 text-zinc-600">{label}</span>
				<span class="text-[10px] leading-3 {isToday ? 'font-bold text-indigo-400' : 'text-zinc-500'}"
					>{day}</span
				>
			</div>
		{/each}
	</div>

	<!-- Habit rows -->
	{#each habits as habit (habit.id)}
		<div
			class="group grid gap-px py-px transition hover:bg-zinc-800/30"
			style={gridStyle}
		>
			<div class="flex items-center pr-2">
				<span
					class="truncate text-[11px] font-medium leading-tight text-zinc-300"
					title={habit.name}
				>
					{habit.name}
				</span>
			</div>
			{#each dayLabels as { day } (day)}
				{@const entry = getEntry(habit.id, day)}
				<button
					onclick={() => toggle(habit.id, day)}
					class="min-h-[22px] w-full rounded-sm border transition {entry?.completed
						? colorMap[habit.color] || colorMap.indigo
						: 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700'}"
					aria-label="{habit.name} on {month}-{day}"
				/>
			{/each}
		</div>
	{/each}
</div>

{#if loading}
	<p class="mt-2 text-center text-xs text-zinc-600">Loading entries…</p>
{/if}