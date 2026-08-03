<script lang="ts">
	import { trpc } from '$lib/trpc/client';

	interface Habit {
		id: number;
		name: string;
		color: string | null;
		currentStreak: number;
		longestStreak: number;
		totalCompletions: number;
	}

	interface Entry {
		id: number;
		habitId: number;
		date: string;
		completed: boolean | null;
	}

	let { habits, month, onUpdate, onDelete } = $props<{
		habits: Habit[];
		month: string;
		onUpdate: () => void;
		onDelete: (id: number) => void;
	}>();

	let entries = $state<Entry[]>([]);
	let loading = $state(false);

	let tooltip = $state<{ show: boolean; text: string; x: number; y: number }>({
		show: false,
		text: '',
		x: 0,
		y: 0
	});

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
		`grid-template-columns: 110px repeat(${daysInMonth}, minmax(22px, 1fr))`
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
		await loadEntriesForMonth(month);
		onUpdate();
	}

	async function loadEntriesForMonth(m: string) {
		loading = true;
		entries = await trpc().health.getEntries.query({ month: m });
		loading = false;
	}

	function showTip(e: MouseEvent, text: string) {
		tooltip = { show: true, text, x: e.clientX + 12, y: e.clientY - 24 };
	}

	function moveTip(e: MouseEvent) {
		if (!tooltip.show) return;
		tooltip = { ...tooltip, x: e.clientX + 12, y: e.clientY - 24 };
	}

	function hideTip() {
		tooltip.show = false;
	}

	$effect(() => {
		loadEntriesForMonth(month);
	});
</script>

<div class="overflow-x-auto">
	<div class="min-w-full">
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
				<div class="flex min-w-0 items-center justify-between overflow-hidden pr-1">
					<span
						class="truncate text-[11px] font-medium leading-tight text-zinc-300"
						onmouseenter={(e) => showTip(e, habit.name)}
						onmousemove={moveTip}
						onmouseleave={hideTip}
					>
						{habit.name}
					</span>
					<button
						type="button"
						onclick={() => onDelete(habit.id)}
						class="px-1 text-[10px] text-zinc-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
						aria-label="Delete {habit.name}"
						title="Delete habit"
					>
						✕
					</button>
				</div>
				{#each dayLabels as { day } (day)}
					{@const entry = getEntry(habit.id, day)}
					<button
						onclick={() => toggle(habit.id, day)}
						class="min-h-[22px] w-full rounded-sm border transition {entry?.completed
							? colorMap[habit.color ?? 'indigo'] || colorMap.indigo
							: 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700'}"
						aria-label="{habit.name} on {month}-{day}"
					></button>
				{/each}
			</div>
		{/each}
	</div>
</div>

{#if tooltip.show}
	<div
		class="fixed z-50 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100 shadow-xl pointer-events-none border border-zinc-700"
		style="left: {tooltip.x}px; top: {tooltip.y}px;"
	>
		{tooltip.text}
	</div>
{/if}

{#if loading}
	<p class="mt-2 text-center text-xs text-zinc-600">Loading entries…</p>
{/if}