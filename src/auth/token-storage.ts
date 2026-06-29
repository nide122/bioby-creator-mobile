import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'bioby-auth-access';
const REFRESH_KEY = 'bioby-auth-refresh';
const LEGACY_REFRESH_KEY = REFRESH_KEY;

/** In-memory cache avoids web AsyncStorage write races right after login. */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let migrationAttempted = false;

async function migrateLegacyRefreshTokenIfNeeded(): Promise<void> {
  if (migrationAttempted || Platform.OS === 'web') {
    return;
  }
  migrationAttempted = true;
  const secureRefresh = await SecureStore.getItemAsync(LEGACY_REFRESH_KEY);
  if (secureRefresh) {
    return;
  }
  const legacyRefresh = await AsyncStorage.getItem(LEGACY_REFRESH_KEY);
  if (!legacyRefresh) {
    return;
  }
  await SecureStore.setItemAsync(LEGACY_REFRESH_KEY, legacyRefresh);
  await AsyncStorage.removeItem(LEGACY_REFRESH_KEY);
}

async function readRefreshTokenFromStorage(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(REFRESH_KEY);
  }
  await migrateLegacyRefreshTokenIfNeeded();
  return SecureStore.getItemAsync(REFRESH_KEY);
}

async function writeRefreshTokenToStorage(refresh: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(REFRESH_KEY, refresh);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

async function clearRefreshTokenFromStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(REFRESH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function hydrateAuthTokensFromStorage(): Promise<void> {
  const pairs = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  memoryAccessToken = pairs[0]?.[1] ?? null;
  memoryRefreshToken = (await readRefreshTokenFromStorage()) ?? pairs[1]?.[1] ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  if (memoryAccessToken) return memoryAccessToken;
  memoryAccessToken = await AsyncStorage.getItem(ACCESS_KEY);
  return memoryAccessToken;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memoryRefreshToken) return memoryRefreshToken;
  memoryRefreshToken = await readRefreshTokenFromStorage();
  return memoryRefreshToken;
}

export async function setAuthTokens(access: string, refresh: string): Promise<void> {
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
  await AsyncStorage.setItem(ACCESS_KEY, access);
  await writeRefreshTokenToStorage(refresh);
}

export async function clearAuthTokens(): Promise<void> {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
  await clearRefreshTokenFromStorage();
}

export async function hasStoredSession(): Promise<boolean> {
  return Boolean(await getRefreshToken());
}
