<script lang="ts">
	import { X } from '@lucide/svelte';

	interface Props {
		id: number;
		name: string;
		active: boolean;
		onToggle: (id: number) => void;
		onRemove: (id: number) => void;
	}

	let { id, name, active, onToggle, onRemove }: Props = $props();
</script>

<button
	type="button"
	onclick={() => onToggle(id)}
	class="group flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition {active
		? 'border-violet-700/40 bg-violet-950/60 text-violet-200'
		: 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}"
>
	{name}
	<span
		role="button"
		tabindex="0"
		onclick={(e) => {
			e.stopPropagation();
			onRemove(id);
		}}
		onkeydown={(e) => e.key === 'Enter' && onRemove(id)}
		class="ml-0.5 rounded-full p-0.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400"
	>
		<X class="h-3 w-3" />
	</span>
</button>