<script lang="ts">
	import { timeAgo } from '$lib/utils/date';
	import { ExternalLink, Bookmark, BookmarkCheck, Check, CheckCheck, X } from '@lucide/svelte';

	interface Props {
		title: string;
		source: string;
		url: string;
		publishedAt: string | null;
		imageUrl: string | null;
		description: string | null;
		isSaved?: boolean;
		isRead?: boolean | null;
		showActions?: 'save' | 'saved' | 'none';
		onSave?: () => void;
		onToggleRead?: () => void;
		onUnsave?: () => void;
	}

	let {
		title,
		source,
		url,
		publishedAt,
		imageUrl,
		description,
		isSaved = false,
		isRead = false,
		showActions = 'save',
		onSave,
		onToggleRead,
		onUnsave
	}: Props = $props();

	const cleanDesc = $derived(description?.replace(/<[^>]+>/g, '') ?? null);
</script>

<div
	class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50 {isRead
		? 'opacity-50'
		: ''}"
>
	{#if imageUrl}
		<img src={imageUrl} alt="" class="h-20 w-28 shrink-0 rounded-md object-cover" loading="lazy" />
	{/if}

	<div class="min-w-0 flex-1">
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			class="line-clamp-2 block text-xs font-medium text-zinc-200 transition hover:text-indigo-300"
			{title}
		>
			{title}
			<ExternalLink class="ml-0.5 inline h-3 w-3 text-zinc-600" />
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
		<div class="mt-0.5 text-[10px] text-zinc-500">
			{source} • {timeAgo(publishedAt)}
		</div>
		{#if cleanDesc && !imageUrl}
			<p class="mt-1 line-clamp-3 text-[11px] text-zinc-400" title={cleanDesc}>
				{cleanDesc}
			</p>
		{/if}
	</div>

	{#if showActions === 'save'}
		<button
			type="button"
			onclick={onSave}
			class="shrink-0 self-center rounded-md p-1 transition hover:text-violet-400 {isSaved
				? 'text-violet-400'
				: 'text-zinc-600'}"
			title={isSaved ? 'Saved' : 'Save article'}
		>
			{#if isSaved}
				<BookmarkCheck class="h-4 w-4" />
			{:else}
				<Bookmark class="h-4 w-4" />
			{/if}
		</button>
	{:else if showActions === 'saved'}
		<div class="flex shrink-0 flex-col gap-1 self-center">
			<button
				type="button"
				onclick={onToggleRead}
				class="rounded-md p-1 text-zinc-600 transition hover:text-zinc-300"
				title={isRead ? 'Mark unread' : 'Mark read'}
			>
				{#if isRead}
					<CheckCheck class="h-4 w-4" />
				{:else}
					<Check class="h-4 w-4" />
				{/if}
			</button>
			<button
				type="button"
				onclick={onUnsave}
				class="rounded-md p-1 text-zinc-600 transition hover:text-red-400"
				title="Remove"
			>
				<X class="h-4 w-4" />
			</button>
		</div>
	{/if}
</div>
