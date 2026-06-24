import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { openBrandDetail, resolveInboxReturnTo } from '@/src/lib/open-brand-detail';

type Props = {
  brandId?: string | null;
  label: string;
};

export function BrandNameLink({ brandId, label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const canOpen = shouldUseBackendApi() && !!brandId;

  if (!canOpen) {
    return <Text style={{ color: theme.mutedForeground }}>{label}</Text>;
  }

  return (
    <Pressable
      accessibilityRole="link"
      onPress={(event) => {
        event.stopPropagation?.();
        openBrandDetail(router, brandId, resolveInboxReturnTo(pathname));
      }}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Text style={[styles.link, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.85 },
});
