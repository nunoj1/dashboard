export function sparklineMetrics(data: number[]) {
	if (data.length < 2) return null;
	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;
	return { min, max, range };
}

export const SPARKLINE_W = 120;
export const SPARKLINE_H = 32;
