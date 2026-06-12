import { type Href, Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';

export default function NotFoundScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.eyebrow, { color: theme.foregroundEyebrow }]}>Not found</Text>
        <Text style={[styles.title, { color: theme.foreground }]}>This page is unavailable</Text>
        <Text style={[styles.desc, { color: theme.mutedForeground }]}>
          The link may be expired, or this account may not have access.
        </Text>

        <SectionCard title="Next">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/inbox' as Href)}
            style={[styles.primary, { backgroundColor: theme.primary }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>Back to inbox</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/inbox' as Href)}
            style={[styles.secondary, { borderColor: theme.border }]}>
            <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>Open inbox</Text>
          </Pressable>
        </SectionCard>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sectionY,
    gap: spacing.md,
  },
  eyebrow: { fontSize: fontSize.eyebrow, fontWeight: '700', letterSpacing: 1.2 },
  title: {
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
  },
  desc: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
});
