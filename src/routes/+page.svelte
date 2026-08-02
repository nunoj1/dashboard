<script lang="ts">
	import { SignIn, Show, UserButton } from 'svelte-clerk';
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50">
	<div class="w-full max-w-sm p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
		<h1 class="text-2xl font-semibold text-slate-900 mb-2">Dashboard</h1>
		<p class="text-slate-500 mb-8 text-sm">Sign in to access your personal hub.</p>
		
		<Show when="signed-out">
			<SignIn routing="hash" redirectUrl="/dashboard" />
		</Show>
		
		<Show when="signed-in">
			<div class="text-center">
				<p class="text-slate-600 mb-4">You're signed in.</p>
				<a 
					href="/dashboard" 
					class="inline-block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
				>
					Go to Dashboard
				</a>
			</div>
		</Show>
	</div>
</div>