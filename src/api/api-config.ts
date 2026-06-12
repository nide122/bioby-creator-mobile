/** Creator API base URL — set in `.env` as EXPO_PUBLIC_API_BASE_URL */
export function getApiBaseUrl(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, '');
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}
