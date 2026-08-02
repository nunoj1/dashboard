<script lang="ts">
	import { SignIn, Show } from 'svelte-clerk';
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold text-zinc-100 mb-2">Dashboard</h1>
		<p class="text-zinc-400 text-sm">Your personal hub. Sign in to continue.</p>
	</div>

	<Show when="signed-out">
		<div class="w-full max-w-sm">
			<SignIn routing="hash" redirectUrl="/dashboard" />
		</div>
	</Show>

	<Show when="signed-in">
		<div class="text-center">
			<p class="text-zinc-400 mb-4">You're signed in.</p>
			<a 
				href="/dashboard" 
				class="inline-block px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition"
			>
				Go to Dashboard
			</a>
		</div>
	</Show>
</div>