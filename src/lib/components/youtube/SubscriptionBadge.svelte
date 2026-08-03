<script lang="ts">
	interface Props {
		channelId: string;
		channelName: string;
		thumbnailUrl: string | null;
		hidden: boolean;
		onToggle: (channelId: string) => void;
	}

	let { channelId, channelName, thumbnailUrl, hidden, onToggle }: Props = $props();
</script>

<button
	type="button"
	onclick={() => onToggle(channelId)}
	class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition {hidden
		? 'border-zinc-800 bg-zinc-950/50 text-zinc-600 line-through'
		: 'border-violet-700/40 bg-violet-950/60 text-violet-200'}"
	title={hidden ? 'Click to show' : 'Click to hide'}
>
	{#if thumbnailUrl}
		<img src={thumbnailUrl} alt="" class="h-4 w-4 rounded-full object-cover" />
	{/if}
	{channelName}
</button>