<script lang="ts">
	import { UserButton } from 'svelte-clerk';
	import { trpc } from '$lib/trpc/client';
	import { onMount } from 'svelte';

	let message = $state('Loading...');

	onMount(async () => {
		const result = await trpc().hello.query();
		message = `${result.message} — ${result.userCount} users in DB`;
	});
</script>

<div class="min-h-screen bg-zinc-950">
	<header class="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-zinc-100">My Dashboard</h1>
		<UserButton afterSignOutUrl="/" />
	</header>

	<main class="p-6">
		<div class="max-w-6xl mx-auto">
			<div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
				<h2 class="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-2">tRPC Test</h2>
				<p class="text-zinc-100 text-lg">{message}</p>
			</div>
		</div>
	</main>
</div>