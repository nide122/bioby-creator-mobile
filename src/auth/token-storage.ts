import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'bioby-auth-access';
const REFRESH_KEY = 'bioby-auth-refresh';

/** In-memory cache avoids web AsyncStorage write races right after login. */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export async function hydrateAuthTokensFromStorage(): Promise<void> {
  const pairs = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  memoryAccessToken = pairs[0]?.[1] ?? null;
  memoryRefreshToken = pairs[1]?.[1] ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryAccessToken) return memoryAccessToken;
  memoryAccessToken = await AsyncStorage.getItem(ACCESS_KEY);
  return memoryAccessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memoryRefreshToken) return memoryRefreshToken;
  memoryRefreshToken = await AsyncStorage.getItem(REFRESH_KEY);
  return memoryRefreshToken;
}

export async function setAuthTokens(access: string, refresh: string): Promise<void> {
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearAuthTokens(): Promise<void> {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function hasStoredSession(): Promise<boolean> {
  return Boolean(await getRefreshToken());
}
