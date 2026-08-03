<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import { RefreshCw, Plus, Search } from '@lucide/svelte';
	import NewsArticleCard from '$lib/components/news/NewsArticleCard.svelte';
	import NewsSourceBadge from '$lib/components/news/NewsSourceBadge.svelte';
	import SkeletonArticleCard from '$lib/components/ui/SkeletonArticleCard.svelte';

	interface FeedItem {
		title: string;
		source: string;
		url: string;
		publishedAt: string;
		imageUrl: string | null;
		description: string | null;
	}

	interface SavedArticle {
		id: number;
		source: string;
		title: string;
		description: string | null;
		url: string;
		imageUrl: string | null;
		publishedAt: string | null;
		read: boolean | null;
	}

	interface Source {
		id: number;
		name: string;
		url: string;
		active: boolean | null;
	}

	let feed = $state<FeedItem[]>([]);
	let saved = $state<SavedArticle[]>([]);
	let sources = $state<Source[]>([]);
	let savedUrls = $state<Set<string>>(new Set());
	let showRead = $state(false);
	let loadingFeed = $state(false);
	let loadingSaved = $state(false);
	let error = $state('');
	let newSourceName = $state('');
	let newSourceUrl = $state('');
	let feedSearch = $state('');
	let savedSearch = $state('');
	let activeTab = $state<'feed' | 'saved'>('feed');
	let timeRange = $state<'hour' | 'day' | 'week' | 'month' | 'all'>('week');
	let feedPage = $state(1);
	let feedTotalPages = $state(0);
	let sentinelRef = $state<HTMLDivElement | null>(null);

	onMount(async () => {
		await loadConfig();
		await fetchFeed();
		await loadSaved();
	});

	async function loadConfig() {
		const config = await trpc().news.getConfig.query();
		sources = config.sources;
	}

	async function loadSaved() {
		loadingSaved = true;
		try {
			const articles = await trpc().news.getSaved.query({ includeRead: showRead, limit: 50 });
			saved = articles;
			savedUrls = new Set(articles.map((a) => a.url));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load saved';
		} finally {
			loadingSaved = false;
		}
	}

	async function fetchFeed(append = false) {
		if (loadingFeed) return;
		loadingFeed = true;
		error = '';
		try {
			const result = await trpc().news.fetch.query({
				timeRange,
				page: feedPage,
				limit: 10
			});
			if (append) {
				feed = [...feed, ...result.items];
			} else {
				feed = result.items;
			}
			feedTotalPages = result.totalPages;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loadingFeed = false;
		}
	}

	async function addSource(e: Event) {
		e.preventDefault();
		if (!newSourceName.trim() || !newSourceUrl.trim()) return;
		error = '';
		try {
			await trpc().news.addSource.mutate({ name: newSourceName.trim(), url: newSourceUrl.trim() });
			newSourceName = '';
			newSourceUrl = '';
			await loadConfig();
			resetFeed();
			await fetchFeed();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add source';
		}
	}

	async function handleToggleSource(id: number) {
		await trpc().news.toggleSource.mutate({ id });
		await loadConfig();
		resetFeed();
		await fetchFeed();
	}

	async function handleRemoveSource(id: number) {
		await trpc().news.removeSource.mutate({ id });
		await loadConfig();
		resetFeed();
		await fetchFeed();
	}

	async function saveArticle(item: FeedItem) {
		await trpc().news.save.mutate({
			source: item.source,
			title: item.title,
			description: item.description,
			url: item.url,
			imageUrl: item.imageUrl,
			publishedAt: item.publishedAt
		});
		savedUrls.add(item.url);
		savedUrls = new Set(savedUrls);
	}

	async function unsaveArticle(id: number) {
		const article = saved.find((s) => s.id === id);
		await trpc().news.unsave.mutate({ id });
		if (article) {
			savedUrls.delete(article.url);
			savedUrls = new Set(savedUrls);
		}
		await loadSaved();
	}

	async function toggleRead(id: number) {
		await trpc().news.markRead.mutate({ id });
		await loadSaved();
	}

	function setTimeRange(range: typeof timeRange) {
		timeRange = range;
		resetFeed();
		fetchFeed();
	}

	function resetFeed() {
		feed = [];
		feedPage = 1;
		feedTotalPages = 0;
	}

	let filteredFeed = $derived(
		feedSearch.trim()
			? feed.filter(
					(f) =>
						f.title.toLowerCase().includes(feedSearch.toLowerCase()) ||
						f.source.toLowerCase().includes(feedSearch.toLowerCase())
				)
			: feed
	);

	let filteredSaved = $derived(
		savedSearch.trim()
			? saved.filter(
					(s) =>
						s.title.toLowerCase().includes(savedSearch.toLowerCase()) ||
						s.source.toLowerCase().includes(savedSearch.toLowerCase())
				)
			: saved
	);

	// Infinite scroll observer — scoped to the feed list container
	let feedListRef = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!sentinelRef || !feedListRef) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && feedPage < feedTotalPages && !loadingFeed) {
					feedPage++;
					fetchFeed(true);
				}
			},
			{ root: feedListRef, rootMargin: '100px' }
		);
		observer.observe(sentinelRef);
		return () => observer.disconnect();
	});
</script>

<div class="space-y-3">
	<!-- Tabs -->
	<div class="card-inner flex p-1">
		<button
			onclick={() => (activeTab = 'feed')}
			class="flex-1 {activeTab === 'feed' ? 'btn-toggle-active' : 'btn-toggle-inactive'}"
		>
			Feed
		</button>
		<button
			onclick={() => {
				activeTab = 'saved';
				loadSaved();
			}}
			class="flex-1 {activeTab === 'saved' ? 'btn-toggle-active' : 'btn-toggle-inactive'}"
		>
			Saved
		</button>
	</div>

	{#if activeTab === 'feed'}
		<!-- Sources -->
		<div class="flex flex-wrap gap-1.5">
			{#each sources as s (s.id)}
				<NewsSourceBadge
					id={s.id}
					name={s.name}
					active={s.active ?? true}
					onToggle={handleToggleSource}
					onRemove={handleRemoveSource}
				/>
			{/each}
			<form onsubmit={addSource} class="flex items-center gap-1">
				<input
					type="text"
					bind:value={newSourceName}
					placeholder="Name"
					class="input-inline w-24 text-xs"
				/>
				<input
					type="text"
					bind:value={newSourceUrl}
					placeholder="URL"
					class="input-inline w-32 text-xs"
				/>
				<button type="submit" class="btn-nav p-1"><Plus class="h-3 w-3" /></button>
			</form>
		</div>

		<!-- Time filter -->
		<div class="card-inner flex w-full gap-1 p-1">
			{#each [['hour', '1H'], ['day', '1D'], ['week', '1W'], ['month', '1M'], ['all', 'All']] as [val, label]}
				<button
					onclick={() => setTimeRange(val as typeof timeRange)}
					class="flex-1 {timeRange === val ? 'btn-toggle-active' : 'btn-toggle-inactive'}"
				>
					{label}
				</button>
			{/each}
		</div>

		<!-- Search + Refresh -->
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<div class="relative min-w-0 flex-1">
				<Search class="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
				<input
					type="text"
					bind:value={feedSearch}
					placeholder="Search feed..."
					class="input w-full pl-8"
				/>
			</div>
			<button
				onclick={() => {
					resetFeed();
					fetchFeed();
				}}
				class="btn-nav w-full sm:w-auto"
				title="Fetch news"
			>
				<RefreshCw class="mr-1 inline h-3 w-3" /> Refresh
			</button>
		</div>

		<!-- Feed Articles -->
		{#if filteredFeed.length > 0}
			<div bind:this={feedListRef} class="max-h-96 space-y-2 overflow-y-auto pr-1">
				{#each filteredFeed as item (item.url)}
					<NewsArticleCard
						title={item.title}
						source={item.source}
						url={item.url}
						publishedAt={item.publishedAt}
						imageUrl={item.imageUrl}
						description={item.description}
						isSaved={savedUrls.has(item.url)}
						showActions="save"
						onSave={() => saveArticle(item)}
					/>
				{/each}
				{#if loadingFeed}
					{#each Array(3) as _, i (i)}
						<SkeletonArticleCard />
					{/each}
				{/if}
				{#if feedPage < feedTotalPages}
					<div bind:this={sentinelRef} class="h-4"></div>
				{/if}
			</div>
		{:else if loadingFeed}
			<div class="max-h-96 space-y-2 overflow-y-auto pr-1">
				{#each Array(5) as _, i (i)}
					<SkeletonArticleCard />
				{/each}
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-zinc-600">
				{error
					? ''
					: sources.length === 0
						? 'Add a news source to get started.'
						: 'Click refresh to fetch news.'}
			</p>
		{/if}
		{#if loadingFeed && filteredFeed.length === 0}<p class="text-center text-xs text-zinc-600">
				Fetching...
			</p>{/if}
	{:else}
		<!-- Saved -->
		<div class="relative">
			<Search class="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
			<input
				type="text"
				bind:value={savedSearch}
				placeholder="Search saved..."
				class="input w-full pl-8"
			/>
		</div>
		<div class="flex items-center justify-between">
			<span class="label">Saved ({filteredSaved.length})</span>
			<button
				onclick={() => {
					showRead = !showRead;
					loadSaved();
				}}
				class={showRead ? 'btn-toggle-active' : 'btn-toggle-inactive'}
			>
				{showRead ? 'Hide read' : 'Show read'}
			</button>
		</div>
		{#if filteredSaved.length > 0}
			<div class="space-y-2">
				{#each filteredSaved as a (a.id)}
					<NewsArticleCard
						title={a.title}
						source={a.source}
						url={a.url}
						publishedAt={a.publishedAt}
						imageUrl={a.imageUrl}
						description={a.description}
						isRead={a.read}
						showActions="saved"
						onToggleRead={() => toggleRead(a.id)}
						onUnsave={() => unsaveArticle(a.id)}
					/>
				{/each}
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-zinc-600">
				{loadingSaved ? '' : 'No saved articles yet.'}
			</p>
		{/if}
		{#if loadingSaved}<p class="text-center text-xs text-zinc-600">Loading...</p>{/if}
	{/if}
	{#if error}<p class="text-center text-xs text-red-400">{error}</p>{/if}
</div>
