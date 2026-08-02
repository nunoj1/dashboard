<script lang="ts">
	import { UserButton } from 'svelte-clerk';
</script>

<div class="min-h-screen bg-slate-50">
	<header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold text-slate-900">My Dashboard</h1>
		<UserButton afterSignOutUrl="/" />
	</header>

	<main class="p-6">
		<div class="max-w-6xl mx-auto">
			<p class="text-slate-500">Dashboard content goes here.</p>
		</div>
	</main>
</div>