<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import { timeAgo } from '$lib/utils/date';
	import { Eye, EyeOff, RefreshCw, Trash2 } from '@lucide/svelte';

	interface Video {
		id: number;
		channelId: string;
		videoId: string;
		title: string;
		thumbnailUrl: string | null;
		publishedAt: string | null;
		watched: boolean | null;
	}

	interface Channel {
		id: number;
		channelId: string;
		channelName: string;
		thumbnailUrl: string | null;
	}

	let videos = $state<Video[]>([]);
	let channels = $state<Channel[]>([]);
	let newQuery = $state('');
	let loading = $state(false);
	let error = $state('');
	let showWatched = $state(false);

	onMount(() => {
		loadData();
	});

	async function loadData() {
		loading = true;
		error = '';
		try {
			const [v, c] = await Promise.all([
				trpc().youtube.getVideos.query({ limit: 20, includeWatched: showWatched }),
				trpc().youtube.getChannels.query()
			]);
			videos = v;
			channels = c;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			loading = false;
		}
	}

	async function addChannel(e: Event) {
		e.preventDefault();
		if (!newQuery.trim()) return;
		error = '';
		try {
			await trpc().youtube.addChannel.mutate({ query: newQuery.trim() });
			newQuery = '';
			await loadData();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add channel';
		}
	}

	async function removeChannel(id: number) {
		await trpc().youtube.removeChannel.mutate({ id });
		await loadData();
	}

	async function toggleWatched(videoId: string) {
		await trpc().youtube.markWatched.mutate({ videoId });
		await loadData();
	}

	async function refresh() {
		error = '';
		try {
			await trpc().youtube.refresh.mutate();
			await loadData();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Refresh failed';
		}
	}

	function getChannelName(channelId: string) {
		return channels.find((c) => c.channelId === channelId)?.channelName || channelId;
	}
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="flex flex-wrap gap-1">
			<button onclick={refresh} class="btn-nav" title="Refresh feed">
				<RefreshCw class="h-3 w-3" />
			</button>
			<button
				onclick={() => {
					showWatched = !showWatched;
					loadData();
				}}
				class={showWatched ? 'btn-toggle-active' : 'btn-toggle-inactive'}
			>
				{showWatched ? 'Hide watched' : 'Show watched'}
			</button>
		</div>
	</div>

	{#if videos.length > 0}
		<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
			{#each videos as v (v.id)}
				<a
					href="https://youtube.com/watch?v={v.videoId}"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50"
				>
					{#if v.thumbnailUrl}
						<img
							src={v.thumbnailUrl}
							alt={v.title}
							class="h-16 w-28 shrink-0 rounded-md object-cover"
							loading="lazy"
						/>
					{:else}
						<div class="h-16 w-28 shrink-0 rounded-md bg-zinc-900"></div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="truncate text-xs font-medium text-zinc-200 group-hover:text-indigo-300">
							{v.title}
						</div>
						<div class="mt-0.5 text-[10px] text-zinc-500">
							{getChannelName(v.channelId)} • {timeAgo(v.publishedAt)}
						</div>
					</div>
					<button
						type="button"
						onclick={(e) => {
							e.preventDefault();
							toggleWatched(v.videoId);
						}}
						class="shrink-0 self-center rounded-md p-1 text-zinc-600 transition hover:text-zinc-300"
						title={v.watched ? 'Mark unwatched' : 'Mark watched'}
					>
						{#if v.watched}
							<Eye class="h-4 w-4" />
						{:else}
							<EyeOff class="h-4 w-4" />
						{/if}
					</button>
				</a>
			{/each}
		</div>
	{:else}
		<p class="py-6 text-center text-sm text-zinc-600">
			{channels.length === 0 ? 'Add a YouTube channel to get started.' : 'No videos found.'}
		</p>
	{/if}

	{#if channels.length > 0}
		<div class="flex flex-wrap gap-1">
			{#each channels as ch (ch.id)}
				<div class="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400">
					{ch.channelName}
					<button
						type="button"
						onclick={() => removeChannel(ch.id)}
						class="text-zinc-600 transition hover:text-red-400"
					>
						<Trash2 class="h-3 w-3" />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<form onsubmit={addChannel} class="separator flex flex-col gap-2 pt-3 h-fit bg-transparent">
		<div class="flex flex-col gap-2 sm:flex-row">
			<input
				type="text"
				bind:value={newQuery}
				placeholder="Channel name, @handle, or ID"
				class="input min-w-0 flex-1"
			/>
			<button type="submit" class="btn-primary w-full sm:w-auto sm:shrink-0">Add</button>
		</div>
	</form>

	{#if loading}
		<p class="text-center text-xs text-zinc-600">Updating…</p>
	{/if}
	{#if error}
		<p class="text-center text-xs text-red-400">{error}</p>
	{/if}
</div>