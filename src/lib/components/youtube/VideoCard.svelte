<script lang="ts">
	import { timeAgo } from '$lib/utils/date';
	import { Eye, EyeOff } from '@lucide/svelte';

	interface Props {
		videoId: string;
		title: string;
		thumbnailUrl: string | null;
		publishedAt: string;
		channelName: string;
		watched: boolean;
		onToggleWatched: () => void;
	}

	let { videoId, title, thumbnailUrl, publishedAt, channelName, watched, onToggleWatched }: Props =
		$props();
</script>

<div
	class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50"
>
	<a
		href="https://youtube.com/watch?v={videoId}"
		target="_blank"
		rel="noopener noreferrer"
		class="shrink-0"
	>
		{#if thumbnailUrl}
			<img
				src={thumbnailUrl}
				alt={title}
				class="h-16 w-28 shrink-0 rounded-md object-cover"
				loading="lazy"
			/>
		{:else}
			<div class="h-16 w-28 shrink-0 rounded-md bg-zinc-900"></div>
		{/if}
	</a>
	<div class="min-w-0 flex-1">
		<a
			href="https://youtube.com/watch?v={videoId}"
			target="_blank"
			rel="noopener noreferrer"
			class="block truncate text-xs font-medium text-zinc-200 transition hover:text-indigo-300"
			{title}
		>
			{title}
		</a>
		<div class="mt-0.5 text-[10px] text-zinc-500">
			{channelName} • {timeAgo(publishedAt)}
		</div>
	</div>
	<button
		type="button"
		onclick={onToggleWatched}
		class="shrink-0 self-center rounded-md p-1 text-zinc-600 transition hover:text-zinc-300"
		title={watched ? 'Mark unwatched' : 'Mark watched'}
	>
		{#if watched}
			<Eye class="h-4 w-4" />
		{:else}
			<EyeOff class="h-4 w-4" />
		{/if}
	</button>
</div>