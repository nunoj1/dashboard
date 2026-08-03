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
		<div
			class="relative w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
		>
			<h3 class="mb-2 text-lg font-semibold text-zinc-100">{title}</h3>

			{#if children}
				<div class="mb-4">
					{@render children()}
				</div>
			{/if}

			<p class="mb-6 text-sm text-zinc-400">{message}</p>

			<div class="flex justify-end gap-3">
				<button type="button" onclick={oncancel} class="btn-toggle-inactive px-4 py-2">
					Cancel
				</button>
				<button type="button" onclick={onconfirm} class="btn-primary px-4 py-2 transition">
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
