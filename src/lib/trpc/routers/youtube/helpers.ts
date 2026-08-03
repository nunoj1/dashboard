import { createClerkClient } from '@clerk/backend';
import { CLERK_SECRET_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

export async function fetchYouTube<T>(url: string, accessToken?: string): Promise<T> {
	const headers: Record<string, string> = {};
	if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
	const res = await fetch(url, { headers });
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`YouTube API error ${res.status}: ${text}`);
	}
	return res.json();
}

export function buildYouTubeUrl(
	path: string,
	params: Record<string, string | number | undefined>
): string {
	const cleanParams = Object.entries(params)
		.filter(([, v]) => v !== undefined)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
	return `https://www.googleapis.com/youtube/v3${path}?${cleanParams}`;
}

export async function getGoogleAccessToken(userId: string): Promise<string | null> {
	const providerIds = ['oauth_google', 'google'];

	for (const provider of providerIds) {
		try {
			const result = await clerk.users.getUserOauthAccessToken(userId, provider);
			const data = (result as any).data ?? (result as any);
			const arr = Array.isArray(data) ? data : data?.data;
			const token = arr?.[0]?.token ?? arr?.[0]?.accessToken ?? data?.[0]?.token;
			if (token) return token;
		} catch {
			continue;
		}
	}
	return null;
}

export function getPublishedAfter(filter: string): string | undefined {
	const now = new Date();
	switch (filter) {
		case 'day':
			now.setDate(now.getDate() - 1);
			break;
		case 'week':
			now.setDate(now.getDate() - 7);
			break;
		case 'month':
			now.setMonth(now.getMonth() - 1);
			break;
		case 'year':
			now.setFullYear(now.getFullYear() - 1);
			break;
		default:
			return undefined;
	}
	return now.toISOString();
}

export function getApiKey(): string | undefined {
	return env.YOUTUBE_API_KEY;
}

export function requireYouTubeAuth(
	accessToken: string | null,
	apiKey: string | undefined
): { token: string; isOAuth: true } | { token: string; isOAuth: false } {
	if (accessToken) return { token: accessToken, isOAuth: true };
	if (apiKey) return { token: apiKey, isOAuth: false };
	throw new Error('No YouTube access. Add YOUTUBE_API_KEY to .env or sign in with Google.');
}