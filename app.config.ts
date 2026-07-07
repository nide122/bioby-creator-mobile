import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

/**
 * Loads `EXPO_PUBLIC_*` from `mobile/.env` into Expo `extra` so
 * `oauth-env.ts` can read values via Constants.expoConfig.extra.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = (appJson.expo ?? config) as ExpoConfig;

  return {
    ...base,
    extra: {
      ...(typeof base.extra === 'object' && base.extra !== null ? base.extra : {}),
      eas: {
        ...(typeof base.extra === 'object' &&
        base.extra !== null &&
        typeof (base.extra as { eas?: object }).eas === 'object'
          ? (base.extra as { eas?: object }).eas
          : {}),
        projectId:
          process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
          (typeof base.extra === 'object' &&
          base.extra !== null &&
          typeof (base.extra as { eas?: { projectId?: string } }).eas?.projectId === 'string'
            ? (base.extra as { eas?: { projectId?: string } }).eas?.projectId
            : undefined),
      },
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      EXPO_PUBLIC_PUBLIC_WEB_BASE_URL: process.env.EXPO_PUBLIC_PUBLIC_WEB_BASE_URL,
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_MICROSOFT_CLIENT_ID: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID,
      EXPO_PUBLIC_MICROSOFT_TENANT: process.env.EXPO_PUBLIC_MICROSOFT_TENANT,
      EXPO_PUBLIC_CREATOR_VERIFICATION_DEV_TOOLS:
        process.env.EXPO_PUBLIC_CREATOR_VERIFICATION_DEV_TOOLS,
      EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    },
  };
};
