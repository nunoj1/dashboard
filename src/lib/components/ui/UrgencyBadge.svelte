<script lang="ts">
	import { urgencyLabel, urgencyColor, type Urgency } from '$lib/utils/date';

	let { urgency } = $props<{ urgency: Urgency }>();
</script>

<span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border {urgencyColor(urgency)}">
	{urgencyLabel(urgency)}
</span>