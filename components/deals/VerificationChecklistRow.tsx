import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';

export type VerificationChecklistRowProps = {
  label: string;
  passed: boolean;
  /** Creator must tap to confirm (vs system pre-check). */
  userConfirmable: boolean;
  /** When false, status cell is read-only (submitted or delivery incomplete). */
  interactive: boolean;
  testID?: string;
  onToggle?: () => void;
  passLabel: string;
  confirmLabel: string;
  pendingLabel: string;
};

export function VerificationChecklistRow({
  label,
  passed,
  userConfirmable,
  interactive,
  testID,
  onToggle,
  passLabel,
  confirmLabel,
  pendingLabel,
}: VerificationChecklistRowProps) {
  const theme = palette[useColorScheme() ?? 'light'];
  const tappable = userConfirmable && interactive;
  const statusLabel = passed ? passLabel : userConfirmable ? confirmLabel : pendingLabel;

  const statusColors = passed
    ? { borderColor: theme.primary, backgroundColor: theme.accentMintSoft, color: theme.primary }
    : userConfirmable
      ? { borderColor: theme.border, backgroundColor: theme.card, color: theme.foreground }
      : {
          borderColor: theme.border,
          backgroundColor: theme.secondary,
          color: theme.foregroundSubtitle,
        };

  const statusCell = (
    <View
      style={[
        styles.statusCell,
        { borderColor: statusColors.borderColor, backgroundColor: statusColors.backgroundColor },
      ]}>
      <Text style={[styles.statusLabel, { color: statusColors.color }]} numberOfLines={1}>
        {statusLabel}
      </Text>
    </View>
  );

  return (
    <View style={styles.row}>
      {tappable ? (
        <Pressable
          testID={testID}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: passed }}
          accessibilityLabel={label}
          onPress={onToggle}
          style={({ pressed }) => [pressed && styles.pressed]}>
          {statusCell}
        </Pressable>
      ) : (
        statusCell
      )}
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  statusCell: {
    width: 72,
    minHeight: 32,
    borderWidth: 1,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    lineHeight: 20,
    paddingTop: 6,
  },
  pressed: {
    opacity: 0.88,
  },
});
