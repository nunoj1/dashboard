<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import { timeAgo } from '$lib/utils/date';
	import { Eye, EyeOff, Search, ChevronLeft, ChevronRight } from '@lucide/svelte';

	interface Video {
		videoId: string;
		title: string;
		thumbnailUrl: string | null;
		publishedAt: string;
		channelName: string;
		channelId: string;
	}

	interface Channel {
		channelId: string;
		channelName: string;
		thumbnailUrl: string | null;
		description: string;
	}

	interface WatchedRecord {
		videoId: string;
	}

	let videos = $state<Video[]>([]);
	let searchResults = $state<Channel[]>([]);
	let watchedSet = $state<Set<string>>(new Set());
	let searchQuery = $state('');
	let selectedChannelId = $state<string | null>(null);
	let selectedChannelName = $state<string | null>(null);
	let timeFilter = $state<'day' | 'week' | 'month' | 'year' | 'all'>('all');
	let loading = $state(false);
	let searching = $state(false);
	let error = $state('');
	let videoPage = $state(1);
	let videoTotalPages = $state(0);
	const VIDEOS_PER_PAGE = 5;

	const timeLabels: Record<string, string> = {
		day: 'Day',
		week: 'Week',
		month: 'Month',
		year: 'Year',
		all: 'All'
	};

	onMount(() => {
		loadWatched();
	});

	async function loadWatched() {
		try {
			const records = await trpc().youtube.getWatched.query();
			watchedSet = new Set(records.map((r) => r.videoId));
		} catch {
			// silently fail
		}
	}

	async function doSearch(e: Event) {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		searching = true;
		error = '';
		try {
			searchResults = await trpc().youtube.searchChannels.query({
				query: searchQuery.trim(),
				maxResults: 5
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Search failed';
		} finally {
			searching = false;
		}
	}

	async function selectChannel(channel: Channel) {
		selectedChannelId = channel.channelId;
		selectedChannelName = channel.channelName;
		searchResults = [];
		videoPage = 1;
		await loadVideos();
	}

	async function loadVideos() {
		if (!selectedChannelId) return;
		loading = true;
		error = '';
		try {
			const allVideos = await trpc().youtube.getChannelVideos.query({
				channelId: selectedChannelId,
				timeFilter,
				maxResults: 50
			});

			const filtered = allVideos.filter((v) => !watchedSet.has(v.videoId));
			const total = filtered.length;
			videoTotalPages = Math.ceil(total / VIDEOS_PER_PAGE);
			const offset = (videoPage - 1) * VIDEOS_PER_PAGE;
			videos = filtered.slice(offset, offset + VIDEOS_PER_PAGE);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load videos';
		} finally {
			loading = false;
		}
	}

	async function toggleWatched(videoId: string) {
		try {
			const result = await trpc().youtube.toggleWatched.mutate({ videoId });
			if (result.watched) {
				watchedSet.add(videoId);
			} else {
				watchedSet.delete(videoId);
			}
			watchedSet = new Set(watchedSet);
			await loadVideos();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update';
		}
	}

	function clearChannel() {
		selectedChannelId = null;
		selectedChannelName = null;
		videos = [];
	}

	function changeTimeFilter(filter: typeof timeFilter) {
		timeFilter = filter;
		videoPage = 1;
		loadVideos();
	}

	function changePage(delta: number) {
		videoPage += delta;
		loadVideos();
	}
</script>

<div class="space-y-3">
	<!-- Search -->
	<form onsubmit={doSearch} class="flex flex-col gap-2 sm:flex-row">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search: @handle, keyword, or #tag"
			class="input min-w-0 flex-1"
		/>
		<button type="submit" class="btn-primary w-full sm:w-auto sm:shrink-0">
			<Search class="mr-1 inline h-3.5 w-3.5" />
			Search
		</button>
	</form>

	{#if searching}
		<p class="text-center text-xs text-zinc-600">Searching...</p>
	{/if}

	<!-- Search Results -->
	{#if searchResults.length > 0}
		<div class="space-y-1">
			<p class="label">Select a channel</p>
			{#each searchResults as ch (ch.channelId)}
				<button
					type="button"
					onclick={() => selectChannel(ch)}
					class="flex w-full items-center gap-2 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 text-left transition hover:border-zinc-700/50"
				>
					{#if ch.thumbnailUrl}
						<img src={ch.thumbnailUrl} alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
					{:else}
						<div class="h-8 w-8 shrink-0 rounded-full bg-zinc-800"></div>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="truncate text-xs font-medium text-zinc-200">{ch.channelName}</div>
						<div class="truncate text-[10px] text-zinc-600">{ch.description}</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Selected Channel Header -->
	{#if selectedChannelId}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-zinc-200">{selectedChannelName}</span>
				<button onclick={clearChannel} class="btn-text text-xs">Change</button>
			</div>
			<div class="card-inner flex gap-1 p-1">
				{#each [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']] as [val, label]}
					<button
						onclick={() => changeTimeFilter(val as typeof timeFilter)}
						class={timeFilter === val ? 'btn-toggle-active' : 'btn-toggle-inactive'}
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Videos -->
		{#if videos.length > 0}
			<div class="space-y-2">
				{#each videos as v (v.videoId)}
					<div
						class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50"
					>
						<a
							href="https://youtube.com/watch?v={v.videoId}"
							target="_blank"
							rel="noopener noreferrer"
							class="shrink-0"
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
						</a>
						<div class="min-w-0 flex-1">
							<a
								href="https://youtube.com/watch?v={v.videoId}"
								target="_blank"
								rel="noopener noreferrer"
								class="block truncate text-xs font-medium text-zinc-200 transition hover:text-indigo-300"
								title={v.title}
							>
								{v.title}
							</a>
							<div class="mt-0.5 text-[10px] text-zinc-500">
								{v.channelName} • {timeAgo(v.publishedAt)}
							</div>
						</div>
						<button
							type="button"
							onclick={() => toggleWatched(v.videoId)}
							class="shrink-0 self-center rounded-md p-1 text-zinc-600 transition hover:text-zinc-300"
							title={watchedSet.has(v.videoId) ? 'Mark unwatched' : 'Mark watched'}
						>
							{#if watchedSet.has(v.videoId)}
								<Eye class="h-4 w-4" />
							{:else}
								<EyeOff class="h-4 w-4" />
							{/if}
						</button>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if videoTotalPages > 1}
				<div class="flex items-center justify-between">
					<span class="label">Page {videoPage} of {videoTotalPages}</span>
					<div class="flex gap-1">
						<button
							onclick={() => changePage(-1)}
							disabled={videoPage <= 1}
							class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<ChevronLeft class="h-3 w-3" />
						</button>
						<button
							onclick={() => changePage(1)}
							disabled={videoPage >= videoTotalPages}
							class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<ChevronRight class="h-3 w-3" />
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<p class="py-6 text-center text-sm text-zinc-600">
				{loading ? '' : 'No videos found for this filter.'}
			</p>
		{/if}
	{:else if !searching && searchResults.length === 0 && searchQuery}
		<p class="py-6 text-center text-sm text-zinc-600">No channels found. Try a different search.</p>
	{/if}

	{#if loading}
		<p class="text-center text-xs text-zinc-600">Loading videos...</p>
	{/if}
	{#if error}
		<p class="text-center text-xs text-red-400">{error}</p>
	{/if}
</div>