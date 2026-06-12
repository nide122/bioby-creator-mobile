import Constants from 'expo-constants';

/** 从 Expo `extra` 或 `EXPO_PUBLIC_*` 读取；不在仓库中写入真实密钥。 */
function readEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (typeof fromProcess === 'string' && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtra = extra?.[key];
  return typeof fromExtra === 'string' && fromExtra.trim().length > 0 ? fromExtra.trim() : undefined;
}

/** Google OAuth Client IDs —— 需在 Google Cloud Console 创建（依平台类型）。参见 Google OAuth 2.0 文档。 */
export const googleWebClientId = readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
export const googleIosClientId = readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
export const googleAndroidClientId = readEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');

/** Microsoft Entra 应用程序（公开客户端）— tenant 常用 `common` 或 `organizations`。 */
export const microsoftClientId = readEnv('EXPO_PUBLIC_MICROSOFT_CLIENT_ID');
export const microsoftTenant = readEnv('EXPO_PUBLIC_MICROSOFT_TENANT') ?? 'common';

export function isGoogleOAuthConfigured(): boolean {
  return !!(googleWebClientId || googleIosClientId || googleAndroidClientId);
}

export function isMicrosoftOAuthConfigured(): boolean {
  return !!microsoftClientId;
}
