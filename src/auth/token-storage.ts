import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'bioby-auth-access';
const REFRESH_KEY = 'bioby-auth-refresh';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setAuthTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_KEY, access],
    [REFRESH_KEY, refresh],
  ]);
}

export async function clearAuthTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function hasStoredSession(): Promise<boolean> {
  const refresh = await getRefreshToken();
  return Boolean(refresh);
}
