<script lang="ts">
	import { timeAgo } from '$lib/utils/date';

	interface Props {
		videoId: string;
		title: string;
		thumbnailUrl: string | null;
		publishedAt: string;
		channelName: string;
		onClick?: () => void;
	}

	let { videoId, title, thumbnailUrl, publishedAt, channelName, onClick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="group flex gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-2 transition hover:border-zinc-700/50 cursor-pointer"
	onclick={onClick}
>
	<a
		href="https://youtube.com/watch?v={videoId}"
		target="_blank"
		rel="noopener noreferrer"
		class="shrink-0"
		onclick={(e) => e.stopPropagation()}
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
			title={title}
			onclick={(e) => e.stopPropagation()}
		>
			{title}
		</a>
		<div class="mt-0.5 text-[10px] text-zinc-500">
			{channelName} • {timeAgo(publishedAt)}
		</div>
	</div>
</div>