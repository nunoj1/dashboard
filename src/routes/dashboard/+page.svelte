<script lang="ts">
	import DashboardHeader from '$lib/components/layout/DashboardHeader.svelte';
	import StockWidget from '$lib/components/stocks/StockWidget.svelte';
	import HealthWidget from '$lib/components/health/HealthWidget.svelte';
	import NewsWidget from '$lib/components/news/NewsWidget.svelte';
	import TodoWidget from '$lib/components/todos/TodoWidget.svelte';
	import Card from '$lib/components/ui/Card.svelte';
</script>

<div class="min-h-screen bg-zinc-950">
	<DashboardHeader />

	<main class="p-6">
		<div class="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="min-w-0 lg:col-span-2">
				<Card title="To-Do List">
					<TodoWidget />
				</Card>
			</div>

			<div class="min-w-0">
				<Card title="Stocks">
					<StockWidget />
				</Card>
			</div>

			<div class="min-w-0">
				<Card title="News">
					<NewsWidget />
				</Card>
			</div>

			<div class="min-w-0 lg:col-span-3">
				<Card title="Health Tracker">
					<HealthWidget />
				</Card>
			</div>
		</div>
	</main>
</div>