<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import { Search } from '@lucide/svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import VideoCard from '$lib/components/youtube/VideoCard.svelte';
	import SubscriptionBadge from '$lib/components/youtube/SubscriptionBadge.svelte';

	interface Video {
		videoId: string;
		title: string;
		thumbnailUrl: string | null;
		publishedAt: string;
		channelName: string;
		channelId: string;
	}

	interface Subscription {
		channelId: string;
		channelName: string;
		thumbnailUrl: string | null;
		hidden: boolean;
	}

	interface Channel {
		channelId: string;
		channelName: string;
		thumbnailUrl: string | null;
		description: string;
	}

	let subscriptions = $state<Subscription[]>([]);
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
	let activeView = $state<'subscriptions' | 'search'>('subscriptions');

	onMount(() => {
		loadSubscriptions();
		loadWatched();
	});

	async function loadSubscriptions() {
		try {
			subscriptions = await trpc().youtube.getSubscriptions.query();
			if (subscriptions.length > 0 && activeView === 'subscriptions') {
				await loadSubscriptionVideos();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load subscriptions';
		}
	}

	async function loadWatched() {
		try {
			const records = await trpc().youtube.getWatched.query();
			watchedSet = new Set(records.map((r) => r.videoId));
		} catch { /* silent */ }
	}

	async function handleToggleSubscription(channelId: string) {
		await trpc().youtube.toggleSubscription.mutate({ channelId });
		await loadSubscriptions();
		if (activeView === 'subscriptions') {
			videoPage = 1;
			await loadSubscriptionVideos();
		}
	}

	async function loadSubscriptionVideos() {
		loading = true;
		error = '';
		try {
			const result = await trpc().youtube.getSubscriptionVideos.query({
				timeFilter, page: videoPage, limit: 5
			});
			videos = result.items;
			videoTotalPages = result.totalPages;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load videos';
		} finally {
			loading = false;
		}
	}

	async function doSearch(e: Event) {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		searching = true;
		error = '';
		try {
			searchResults = await trpc().youtube.searchChannels.query({
				query: searchQuery.trim(), maxResults: 5
			});
			activeView = 'search';
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
		await loadChannelVideos();
	}

	async function loadChannelVideos() {
		if (!selectedChannelId) return;
		loading = true;
		error = '';
		try {
			const result = await trpc().youtube.getChannelVideos.query({
				channelId: selectedChannelId, timeFilter, page: videoPage, limit: 5
			});
			videos = result.items;
			videoTotalPages = result.totalPages;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load videos';
		} finally {
			loading = false;
		}
	}

	async function toggleWatched(videoId: string) {
		try {
			const result = await trpc().youtube.toggleWatched.mutate({ videoId });
			if (result.watched) watchedSet.add(videoId);
			else watchedSet.delete(videoId);
			watchedSet = new Set(watchedSet);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update';
		}
	}

	function backToSubscriptions() {
		activeView = 'subscriptions';
		selectedChannelId = null;
		selectedChannelName = null;
		searchResults = [];
		videoPage = 1;
		loadSubscriptionVideos();
	}

	function setTimeFilter(filter: typeof timeFilter) {
		timeFilter = filter;
		videoPage = 1;
		if (activeView === 'subscriptions') loadSubscriptionVideos();
		else if (selectedChannelId) loadChannelVideos();
	}

	function goToVideoPage(p: number) {
		videoPage = p;
		if (activeView === 'subscriptions') loadSubscriptionVideos();
		else if (selectedChannelId) loadChannelVideos();
	}
</script>

<div class="space-y-3">
	<form onsubmit={doSearch} class="flex flex-col gap-2 sm:flex-row">
		<input type="text" bind:value={searchQuery} placeholder="Search: @handle, keyword, or #tag" class="input min-w-0 flex-1" />
		<button type="submit" class="btn-primary w-full sm:w-auto sm:shrink-0">
			<Search class="mr-1 inline h-3.5 w-3.5" /> Search
		</button>
	</form>

	{#if searching}<p class="text-center text-xs text-zinc-600">Searching...</p>{/if}

	{#if searchResults.length > 0 && activeView === 'search'}
		<div class="space-y-1">
			<div class="flex items-center justify-between">
				<p class="label">Select a channel</p>
				<button onclick={backToSubscriptions} class="btn-text text-xs">Back to subs</button>
			</div>
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

	{#if activeView === 'subscriptions' && subscriptions.length > 0}
		<div class="space-y-1.5">
			<p class="label">Your subscriptions — click to toggle</p>
			<div class="flex flex-wrap gap-1.5">
				{#each subscriptions as sub (sub.channelId)}
					<SubscriptionBadge
						channelId={sub.channelId}
						channelName={sub.channelName}
						thumbnailUrl={sub.thumbnailUrl}
						hidden={sub.hidden}
						onToggle={handleToggleSubscription}
					/>
				{/each}
			</div>
		</div>
	{/if}

	{#if activeView === 'subscriptions' || selectedChannelId}
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			{#if activeView === 'search' && selectedChannelName}
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-zinc-200">{selectedChannelName}</span>
					<button onclick={backToSubscriptions} class="btn-text text-xs">Back</button>
				</div>
			{:else}
				<span class="text-sm font-medium text-zinc-200">Latest videos</span>
			{/if}
			<div class="card-inner flex flex-wrap gap-1 p-1">
				{#each [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year'], ['all', 'All']] as [val, label]}
					<button
						onclick={() => setTimeFilter(val as typeof timeFilter)}
						class={timeFilter === val ? 'btn-toggle-active' : 'btn-toggle-inactive'}
					>
						{label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if videos.length > 0}
		<div class="space-y-2">
			{#each videos as v (v.videoId)}
				<VideoCard
					videoId={v.videoId}
					title={v.title}
					thumbnailUrl={v.thumbnailUrl}
					publishedAt={v.publishedAt}
					channelName={v.channelName}
					watched={watchedSet.has(v.videoId)}
					onToggleWatched={() => toggleWatched(v.videoId)}
				/>
			{/each}
		</div>
		<Pagination current={videoPage} total={videoTotalPages} onChange={goToVideoPage} />
	{:else if !loading && (activeView === 'subscriptions' || selectedChannelId)}
		<p class="py-6 text-center text-sm text-zinc-600">
			{activeView === 'subscriptions'
				? subscriptions.length === 0
					? 'No subscriptions found. Make sure YouTube scope is enabled in Clerk.'
					: 'No videos found for the current filter.'
				: 'No videos found for this channel.'}
		</p>
	{/if}

	{#if loading}<p class="text-center text-xs text-zinc-600">Loading videos...</p>{/if}
	{#if error}<p class="text-center text-xs text-red-400">{error}</p>{/if}
</div>