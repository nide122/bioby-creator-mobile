import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import type { AgentSendMode } from '@/src/stores/session-store';

type ModeCopy = {
  assistTitle: string;
  assistSubtitle: string;
  reviewTitle: string;
  reviewSubtitle: string;
};

type Props = {
  value: AgentSendMode;
  onChange: (mode: AgentSendMode) => void;
  copy: ModeCopy;
  boundaryTitle?: string;
  boundaryBody?: string;
};

export function AgentSendModePicker({ value, onChange, copy, boundaryTitle, boundaryBody }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={styles.stack}>
      <ModeOption
        theme={theme}
        selected={value === 'agent_assist'}
        onPress={() => onChange('agent_assist')}
        title={copy.assistTitle}
        subtitle={copy.assistSubtitle}
        testID="agent-send-mode-assist"
      />
      <ModeOption
        theme={theme}
        selected={value === 'review_only'}
        onPress={() => onChange('review_only')}
        title={copy.reviewTitle}
        subtitle={copy.reviewSubtitle}
        testID="agent-send-mode-review"
      />
      {boundaryTitle && boundaryBody ? (
        <View style={[styles.boundaryCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.boundaryTitle, { color: theme.foreground }]}>{boundaryTitle}</Text>
          <Text style={[styles.boundaryText, { color: theme.mutedForeground }]}>{boundaryBody}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ModeOption({
  theme,
  selected,
  onPress,
  title,
  subtitle,
  testID,
}: {
  theme: ThemePalette;
  selected: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      android_ripple={{ color: `${theme.primary}22` }}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.accentMintSoft : theme.card,
        },
        pressed && !selected && { opacity: 0.88 },
      ]}>
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.foregroundEyebrow }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.optionSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, gap: spacing.xs },
  optionTitle: { fontSize: fontSize.body, fontWeight: '800' },
  optionSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  boundaryCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  boundaryTitle: { fontSize: fontSize.body, fontWeight: '800', lineHeight: lineHeight.body },
  boundaryText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
});
