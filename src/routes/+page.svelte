<script lang="ts">
	import { SignIn, Show } from 'svelte-clerk';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
	<div class="mb-8 text-center">
		<h1 class="mb-2 text-3xl font-bold text-zinc-100">Dashboard</h1>
		<p class="text-sm text-zinc-400">Your personal hub. Sign in to continue.</p>
	</div>

	<Show when="signed-out">
		<div class="w-full max-w-sm">
			<SignIn routing="hash" redirectUrl="/dashboard" />
		</div>
	</Show>

	<Show when="signed-in">
		<div class="text-center">
			<p class="mb-4 text-zinc-400">You're signed in.</p>
			<a
				href={resolve('/dashboard')}
				class="inline-block rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
			>
				Go to Dashboard
			</a>
		</div>
	</Show>
</div>