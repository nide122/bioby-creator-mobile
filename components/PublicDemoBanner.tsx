import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { fontSize, radii, spacing } from '@/constants/tokens';
import { exitPublicDemo } from '@/src/demo/public-demo-session';
import { useSessionStore } from '@/src/stores/session-store';

/** Persistent, customer-visible disclosure for the public sample-data sandbox. */
export function PublicDemoBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const isPublicDemo = useSessionStore((state) => state.demoWorkspaceKind === 'public');

  if (!isPublicDemo) return null;

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View
        style={styles.banner}
        accessibilityRole="text"
        accessibilityLabel={t('publicDemo.banner')}>
        <Text style={styles.label} numberOfLines={1}>
          {t('publicDemo.badge')}
        </Text>
        <Pressable
          testID="public-demo-exit"
          accessibilityRole="button"
          onPress={() => {
            void exitPublicDemo().then(() => router.replace('/intro' as Href));
          }}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}>
          <Text style={styles.exitLabel}>{t('publicDemo.exitCompact')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    alignItems: 'flex-end',
  },
  banner: {
    width: 224,
    minHeight: 38,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: '#172018EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#87D89A66',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    color: '#E8F8EB',
    fontSize: fontSize.caption,
    fontWeight: '700',
    flex: 1,
  },
  exit: {
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF14',
  },
  exitLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.caption,
    fontWeight: '800',
  },
  pressed: { opacity: 0.82 },
});
