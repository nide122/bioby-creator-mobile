import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette } from '@/constants/tokens';
import { useSessionStore } from '@/src/stores/session-store';

export function AccountAvatarButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const profile = useSessionStore((s) => s.profileBasics);
  const creatorName = profile?.displayName?.trim() || t('account.profileFallback');
  const initial = creatorName.slice(0, 1).toUpperCase();

  return (
    <Pressable
      testID="header-account-avatar"
      accessibilityRole="button"
      accessibilityLabel={t('account.openA11y')}
      onPress={() => router.push('/account' as Href)}
      style={({ pressed }) => [
        styles.ring,
        { borderColor: theme.primary + '55' },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={[styles.label, { color: theme.primaryForeground }]}>{initial}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 1,
    minWidth: layout.touchMin,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: fontSize.body, fontWeight: '800' },
});
