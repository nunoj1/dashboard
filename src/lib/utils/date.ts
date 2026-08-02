export function formatDueDate(date: Date | null): string {
	if (!date) return '';
	const now = new Date();
	const isOverdue = date < now && date.toDateString() !== now.toDateString();
	const isToday = date.toDateString() === now.toDateString();

	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const isTomorrow = date.toDateString() === tomorrow.toDateString();

	const timeStr = date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	if (isOverdue) {
		return `Overdue • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
	}
	if (isToday) return `Today at ${timeStr}`;
	if (isTomorrow) return `Tomorrow at ${timeStr}`;

	return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export function formatShortDate(date: Date | null): string {
	if (!date) return '';
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
		' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function isOverdue(date: Date | null, done: boolean): boolean {
	if (!date || done) return false;
	const now = new Date();
	return date < now && date.toDateString() !== now.toDateString();
}

export type Urgency = 'critical' | 'urgent' | 'soon' | 'high' | 'normal' | 'low' | 'done';

export function getUrgency(date: Date | null, done: boolean, priority: string): Urgency {
	if (done) return 'done';

	const now = new Date();

	if (date) {
		const msLeft = date.getTime() - now.getTime();
		const hoursLeft = msLeft / (1000 * 60 * 60);

		if (hoursLeft < 0 && date.toDateString() !== now.toDateString()) return 'critical';
		if (hoursLeft <= 24) return 'urgent';
		if (hoursLeft <= 72) return 'soon';
	}

	if (priority === 'high') return 'high';
	if (priority === 'low') return 'low';
	return 'normal';
}

export function urgencyLabel(u: Urgency): string {
	return {
		critical: 'Critical',
		urgent: 'Urgent',
		soon: 'Soon',
		high: 'High',
		normal: 'Normal',
		low: 'Low',
		done: 'Done'
	}[u];
}

export function urgencyColor(u: Urgency): string {
	return {
		critical: 'text-red-400 bg-red-950/30 border-red-900/50',      // Overdue
		high: 'text-purple-400 bg-purple-950/30 border-purple-900/50',   // High priority
		urgent: 'text-orange-400 bg-orange-950/30 border-orange-900/50', // < 24h
		soon: 'text-amber-400 bg-amber-950/30 border-amber-900/50',     // < 72h
		normal: 'text-sky-400 bg-sky-950/30 border-sky-900/50',           // Medium (babyblue)
		low: 'text-zinc-400 bg-zinc-900/50 border-zinc-700',              // Low
		done: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50' // Completed
	}[u];
}

export function urgencyBorder(u: Urgency): string {
	return {
		critical: 'border-l-red-500',
		high: 'border-l-purple-500',
		urgent: 'border-l-orange-500',
		soon: 'border-l-amber-500',
		normal: 'border-l-sky-500',
		low: 'border-l-zinc-600',
		done: 'border-l-emerald-600'
	}[u];
}