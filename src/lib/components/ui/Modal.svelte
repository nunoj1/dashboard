<script lang="ts">
	let { open, title, message, children, onconfirm, oncancel } = $props<{
		open: boolean;
		title: string;
		message: string;
		children?: import('svelte').Snippet;
		onconfirm: () => void;
		oncancel: () => void;
	}>();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={oncancel}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && oncancel()}
			aria-label="Close modal"
		></div>
		<div class="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
			<h3 class="text-lg font-semibold text-zinc-100 mb-2">{title}</h3>

			{#if children}
				<div class="mb-4">
					{@render children()}
				</div>
			{/if}

			<p class="text-sm text-zinc-400 mb-6">{message}</p>

			<div class="flex gap-3 justify-end">
				<button
					type="button"
					onclick={oncancel}
					class="px-4 py-2 text-sm text-zinc-300 hover:text-white transition"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={onconfirm}
					class="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition"
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}