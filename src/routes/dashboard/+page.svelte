<script lang="ts">
	import { UserButton } from 'svelte-clerk';
</script>

<div class="min-h-screen bg-zinc-950">
	<header class="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-zinc-100">My Dashboard</h1>
		<UserButton afterSignOutUrl="/" />
	</header>

	<main class="p-6">
		<div class="max-w-6xl mx-auto">
			<p class="text-zinc-500">Dashboard content goes here.</p>
		</div>
	</main>
</div>