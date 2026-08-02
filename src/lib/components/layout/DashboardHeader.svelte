<script lang="ts">
	import { UserButton } from 'svelte-clerk';
</script>

<header class="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
	<h1 class="text-lg font-semibold text-zinc-100">My Dashboard</h1>
	<UserButton afterSignOutUrl="/" />
</header>