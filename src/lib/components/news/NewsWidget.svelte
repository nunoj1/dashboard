<script lang="ts">
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';
	import { timeAgo } from '$lib/utils/date';
	import {
		RefreshCw,
		Check,
		CheckCheck,
		X,
		Plus,
		Bookmark,
		BookmarkCheck,
		Search,
		ExternalLink,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';

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

	interface Tag {
		id: number;
		tag: string;
		active: boolean | null;
	}

	let feed = $state<FeedItem[]>([]);
	let saved = $state<SavedArticle[]>([]);
	let sources = $state<Source[]>([]);
	let tags = $state<Tag[]>([]);
	let showRead = $state(false);
	let loadingFeed = $state(false);
	let loadingSaved = $state(false);
	let error = $state('');
	let newTag = $state('');
	let newSourceName = $state('');
	let newSourceUrl = $state('');
	let feedSearch = $state('');
	let savedSearch = $state('');
	let activeTab = $state<'feed' | 'saved'>('feed');
	let timeRange = $state<'hour' | 'day' | 'week' | 'month' | 'all'>('all');
	let feedPage = $state(1);
	let feedTotalPages = $state(0);

	const timeRangeLabels: Record<string, string> = {
		hour: 'Last hour',
		day: 'Last day',
		week: 'Last week',
		month: 'Last month',
		all: 'All time'
	};

	onMount(() => {
		loadConfig();
		loadSaved();
	});

	async function loadConfig() {
		const config = await trpc().news.getConfig.query();
		sources = config.sources;
		tags = config.tags;
	}

	async function loadSaved() {
		loadingSaved = true;
		try {
			saved = await trpc().news.getSaved.query({
				includeRead: showRead,
				limit: 50
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load saved';
		} finally {
			loadingSaved = false;
		}
	}

	async function fetchFeed() {
		loadingFeed = true;
		error = '';
		try {
			const result = await trpc().news.fetch.query({
				timeRange,
				page: feedPage,
				limit: 5
			});
			feed = result.items;
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
			await trpc().news.addSource.mutate({
				name: newSourceName.trim(),
				url: newSourceUrl.trim()
			});
			newSourceName = '';
			newSourceUrl = '';
			await loadConfig();
			await fetchFeed();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add source';
		}
	}

	async function toggleSource(id: number) {
		await trpc().news.toggleSource.mutate({ id });
		await loadConfig();
		await fetchFeed();
	}

	async function removeSource(id: number) {
		await trpc().news.removeSource.mutate({ id });
		await loadConfig();
		await fetchFeed();
	}

	async function addTag(e: Event) {
		e.preventDefault();
		if (!newTag.trim()) return;
		error = '';
		try {
			await trpc().news.addTag.mutate({ tag: newTag.trim() });
			newTag = '';
			await loadConfig();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add tag';
		}
	}

	async function toggleTag(id: number) {
		await trpc().news.toggleTag.mutate({ id });
		await loadConfig();
	}

	async function removeTag(id: number) {
		await trpc().news.removeTag.mutate({ id });
		await loadConfig();
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
	}

	async function unsaveArticle(id: number) {
		await trpc().news.unsave.mutate({ id });
		await loadSaved();
	}

	async function toggleRead(id: number) {
		await trpc().news.markRead.mutate({ id });
		await loadSaved();
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
</script>

<div class="space-y-3">
	<!-- Tabs -->
	<div class="flex gap-1 card-inner p-1">
		<button
			onclick={() => (activeTab = 'feed')}
			class={activeTab === 'feed' ? 'btn-toggle-active' : 'btn-toggle-inactive'}
		>
			Feed
		</button>
		<button
			onclick={() => {
				activeTab = 'saved';
				loadSaved();
			}}
			class={activeTab === 'saved' ? 'btn-toggle-active' : 'btn-toggle-inactive'}
		>
			Saved
		</button>
	</div>

	{#if activeTab === 'feed'}
		<!-- Sources -->
		<div class="flex flex-wrap gap-1.5">
			{#each sources as s (s.id)}
				<button
					type="button"
					onclick={() => toggleSource(s.id)}
					class="group flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition {s.active
						? 'border-violet-700/40 bg-violet-950/60 text-violet-200'
						: 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}"
				>
					{s.name}
					<span
						role="button"
						tabindex="0"
						onclick={(e) => {
							e.stopPropagation();
							removeSource(s.id);
						}}
						onkeydown={(e) => e.key === 'Enter' && removeSource(s.id)}
						class="ml-0.5 rounded-full p-0.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400"
					>
						<X class="h-3 w-3" />
					</span>
				</button>
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
				<button type="submit" class="btn-nav p-1">
					<Plus class="h-3 w-3" />
				</button>
			</form>
		</div>

		<!-- Tags -->
		<div class="flex flex-wrap gap-1.5">
			{#each tags as t (t.id)}
				<button
					type="button"
					onclick={() => toggleTag(t.id)}
					class="group flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition {t.active
						? 'border-violet-700/40 bg-violet-950/60 text-violet-200'
						: 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}"
				>
					{t.tag}
					<span
						role="button"
						tabindex="0"
						onclick={(e) => {
							e.stopPropagation();
							removeTag(t.id);
						}}
						onkeydown={(e) => e.key === 'Enter' && removeTag(t.id)}
						class="ml-0.5 rounded-full p-0.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400"
					>
						<X class="h-3 w-3" />
					</span>
				</button>
			{/each}

			<form onsubmit={addTag} class="flex items-center gap-1">
				<input
					type="text"
					bind:value={newTag}
					placeholder="+ Tag"
					class="input-inline w-20 text-xs"
				/>
				<button type="submit" class="btn-nav p-1">
					<Plus class="h-3 w-3" />
				</button>
			</form>
		</div>

		<!-- Time filter + Search + Fetch -->
		<div class="flex flex-wrap items-center gap-2">
			<div class="card-inner flex flex-wrap gap-1 p-1">
				{#each [['hour', '1H'], ['day', '1D'], ['week', '1W'], ['month', '1M'], ['all', 'All']] as [val, label]}
					<button
						onclick={() => {
							timeRange = val as typeof timeRange;
							feedPage = 1;
							fetchFeed();
						}}
						class={timeRange === val ? 'btn-toggle-active' : 'btn-toggle-inactive'}
					>
						{label}
					</button>
				{/each}
			</div>

			<div class="relative min-w-0 flex-1">
				<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
				<input
					type="text"
					bind:value={feedSearch}
					placeholder="Search feed..."
					class="input w-full pl-8"
				/>
			</div>
			<button onclick={fetchFeed} class="btn-nav" title="Fetch news">
				<RefreshCw class="h-3 w-3" />
			</button>
		</div>

		<!-- Feed Articles -->
		{#if filteredFeed.length > 0}
			<div class="space-y-2">
				{#each filteredFeed as item (item.url)}
					<div
						class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50"
					>
						{#if item.imageUrl}
							<img
								src={item.imageUrl}
								alt=""
								class="h-20 w-28 shrink-0 rounded-md object-cover"
								loading="lazy"
							/>
						{:else}
							<div class="h-20 w-28 shrink-0 rounded-md bg-zinc-900"></div>
						{/if}
						<div class="min-w-0 flex-1">
							<a
								href={item.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block truncate text-xs font-medium text-zinc-200 transition hover:text-indigo-300"
								title={item.title}
							>
								{item.title}
								<ExternalLink class="ml-0.5 inline h-3 w-3 text-zinc-600" />
							</a>
							<div class="mt-0.5 text-[10px] text-zinc-500">
								{item.source} • {timeAgo(item.publishedAt)}
							</div>
							{#if item.description}
								<p
									class="mt-1 line-clamp-3 text-[11px] text-zinc-400"
									title={item.description}
								>
									{item.description.replace(/<[^>]+>/g, '')}
								</p>
							{/if}
						</div>
						<button
							type="button"
							onclick={() => saveArticle(item)}
							class="shrink-0 self-center rounded-md p-1 text-zinc-600 transition hover:text-violet-400"
							title="Save article"
						>
							<Bookmark class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			{#if feedTotalPages > 1}
				<div class="flex items-center justify-between">
					<span class="label">Page {feedPage} of {feedTotalPages}</span>
					<div class="flex gap-1">
						<button
							onclick={() => {
								feedPage--;
								fetchFeed();
							}}
							disabled={feedPage <= 1}
							class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<ChevronLeft class="h-3 w-3" />
						</button>
						<button
							onclick={() => {
								feedPage++;
								fetchFeed();
							}}
							disabled={feedPage >= feedTotalPages}
							class="btn-nav p-1 disabled:cursor-not-allowed disabled:opacity-30"
						>
							<ChevronRight class="h-3 w-3" />
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<p class="py-6 text-center text-sm text-zinc-600">
				{loadingFeed ? '' : error ? '' : sources.length === 0 ? 'Add a news source to get started.' : 'Click refresh to fetch news.'}
			</p>
		{/if}

		{#if loadingFeed}
			<p class="text-center text-xs text-zinc-600">Fetching...</p>
		{/if}
	{:else}
		<!-- Saved Search -->
		<div class="relative">
			<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
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

		<!-- Saved Articles -->
		{#if filteredSaved.length > 0}
			<div class="space-y-2">
				{#each filteredSaved as a (a.id)}
					<div
						class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50 {a.read ? 'opacity-50' : ''}"
					>
						{#if a.imageUrl}
							<img
								src={a.imageUrl}
								alt=""
								class="h-20 w-28 shrink-0 rounded-md object-cover"
								loading="lazy"
							/>
						{:else}
							<div class="h-20 w-28 shrink-0 rounded-md bg-zinc-900"></div>
						{/if}
						<div class="min-w-0 flex-1">
							<a
								href={a.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block truncate text-xs font-medium text-zinc-200 transition hover:text-indigo-300"
								title={a.title}
							>
								{a.title}
								<ExternalLink class="ml-0.5 inline h-3 w-3 text-zinc-600" />
							</a>
							<div class="mt-0.5 text-[10px] text-zinc-500">
								{a.source} • {timeAgo(a.publishedAt)}
							</div>
							{#if a.description}
								<p
									class="mt-1 line-clamp-3 text-[11px] text-zinc-400"
									title={a.description}
								>
									{a.description.replace(/<[^>]+>/g, '')}
								</p>
							{/if}
						</div>
						<div class="flex shrink-0 flex-col gap-1 self-center">
							<button
								type="button"
								onclick={() => toggleRead(a.id)}
								class="rounded-md p-1 text-zinc-600 transition hover:text-zinc-300"
								title={a.read ? 'Mark unread' : 'Mark read'}
							>
								{#if a.read}
									<CheckCheck class="h-4 w-4" />
								{:else}
									<Check class="h-4 w-4" />
								{/if}
							</button>
							<button
								type="button"
								onclick={() => unsaveArticle(a.id)}
								class="rounded-md p-1 text-zinc-600 transition hover:text-red-400"
								title="Remove"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-zinc-600">
				{loadingSaved ? '' : 'No saved articles yet.'}
			</p>
		{/if}

		{#if loadingSaved}
			<p class="text-center text-xs text-zinc-600">Loading...</p>
		{/if}
	{/if}

	{#if error}
		<p class="text-center text-xs text-red-400">{error}</p>
	{/if}
</div>