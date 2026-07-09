import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

type Props = {
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  label: string;
};

export function AuthPrimaryButton({ testID, disabled, loading, onPress, label }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const enabled = !disabled && !loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={!enabled}
      onPress={onPress}
      className={webClassName(
        corporateCleanClass.btnPrimary,
        enabled ? corporateCleanClass.gradient : null,
      )}
      style={[
        styles.primary,
        { backgroundColor: enabled ? theme.primary : theme.border },
      ]}
      android_ripple={{ color: `${theme.primaryForeground}33` }}>
      {loading ? (
        <ActivityIndicator color={theme.primaryForeground} />
      ) : (
        <Text style={[styles.label, { color: theme.primaryForeground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  label: { fontWeight: '600', fontSize: fontSize.body },
});
