<script lang="ts">
	import { trpc } from '$lib/trpc/client';

	interface Props {
		onAdd: () => void;
	}

	let { onAdd }: Props = $props();

	let newName = $state('');
	let newColor = $state<'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet'>('indigo');
	let newTargetType = $state<'daily' | 'weekly' | 'monthly' | 'none'>('none');
	let newTargetCount = $state(3);
	let error = $state('');

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

	let showCountInput = $derived(newTargetType === 'weekly' || newTargetType === 'monthly');

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
					newTargetType === 'weekly' || newTargetType === 'monthly' ? newTargetCount : undefined
			});
			newName = '';
			newColor = 'indigo';
			newTargetType = 'none';
			newTargetCount = 3;
			onAdd();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add habit';
		}
	}
</script>

<div class="card-inner p-3">
	<form onsubmit={addHabit} class="flex flex-col gap-2">
		<!-- Mobile layout -->
		<div class="flex flex-col gap-2 sm:hidden">
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={newName}
					placeholder="New habit (e.g. Exercise, Read, Meditate)"
					class="input min-w-0 flex-1"
				/>
				<select bind:value={newColor} class="input w-auto shrink-0 px-2!">
					{#each colorOptions as c (c.value)}
						<option value={c.value}>{c.value}</option>
					{/each}
				</select>
			</div>
			<div class="separator"></div>
			<div class="flex items-center gap-2">
				<span class="label shrink-0">Target</span>
				<select bind:value={newTargetType} class="input min-w-0 flex-1">
					{#each targetTypes as tt (tt.value)}
						<option value={tt.value}>{tt.label}</option>
					{/each}
				</select>
				{#if showCountInput}
					<div class="input flex shrink-0 items-center gap-1 px-2!">
						<input
							type="number"
							bind:value={newTargetCount}
							min="1"
							class="w-8 bg-transparent text-right text-sm text-zinc-100 focus:outline-none"
						/>
						<span class="text-[10px] text-zinc-500">
							{newTargetType === 'weekly' ? '/wk' : '/mo'}
						</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Desktop layout -->
		<div class="hidden flex-col gap-2 sm:flex">
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={newName}
					placeholder="New habit (e.g. Exercise, Read, Meditate)"
					class="input min-w-0 flex-1"
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

			<div class="separator"></div>

			<div class="flex items-center gap-2">
				<span class="label shrink-0">Target</span>
				<select bind:value={newTargetType} class="input w-auto">
					{#each targetTypes as tt (tt.value)}
						<option value={tt.value}>{tt.label}</option>
					{/each}
				</select>

				{#if showCountInput}
					<div class="input flex items-center gap-2">
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

		<button type="submit" class="btn-primary w-full">Add Habit</button>
	</form>
</div>

{#if error}
	<p class="text-center text-xs text-red-400">{error}</p>
{/if}
