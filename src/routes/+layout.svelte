<script lang="ts">
	import { ClerkProvider } from 'svelte-clerk';
	import { dark } from '@clerk/themes';
	import '../app.css';
	
	let { children } = $props();
</script>

<ClerkProvider appearance={{ baseTheme: dark }}>
	{@render children()}
</ClerkProvider>