<script lang="ts">
	import { UserButton } from 'svelte-clerk';
</script>

<header class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4">
	<h1 class="text-lg font-semibold text-zinc-100">My Dashboard</h1>
	<UserButton afterSignOutUrl="/" />
</header>
