import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { palette, spacing } from '@/constants/tokens';
import { DEFAULT_APP_HOME_ROUTE } from '@/src/auth/post-auth-navigation';
import { enterPublicDemo } from '@/src/demo/public-demo-session';

export default function PublicDemoEntryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  useEffect(() => {
    let active = true;
    void enterPublicDemo().then((entered) => {
      if (!active) return;
      router.replace((entered ? DEFAULT_APP_HOME_ROUTE : '/intro') as Href);
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} />
      <Text style={{ color: theme.mutedForeground }}>{t('publicDemo.entering')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});

