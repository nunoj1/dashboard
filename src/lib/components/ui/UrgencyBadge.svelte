<script lang="ts">
	import { urgencyLabel, urgencyColor, type Urgency } from '$lib/utils/date';

	let { urgency } = $props<{ urgency: Urgency }>();
</script>

<span
	class="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {urgencyColor(
		urgency
	)}"
>
	{urgencyLabel(urgency)}
</span>
