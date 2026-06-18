import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing, type ThemePalette } from '@/constants/tokens';
import type { ClassificationStrictness } from '@/src/stores/session-store';

type OptionCopy = {
  title: string;
  subtitle: string;
};

type Props = {
  value: ClassificationStrictness;
  onChange: (mode: ClassificationStrictness) => void;
  copy: Record<ClassificationStrictness, OptionCopy>;
  hintTitle?: string;
  hintBody?: string;
};

const ORDER: ClassificationStrictness[] = ['relaxed', 'standard', 'strict'];

export function ClassificationStrictnessPicker({ value, onChange, copy, hintTitle, hintBody }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={styles.stack}>
      {ORDER.map((mode) => (
        <ModeOption
          key={mode}
          theme={theme}
          selected={value === mode}
          onPress={() => onChange(mode)}
          title={copy[mode].title}
          subtitle={copy[mode].subtitle}
          testID={`classification-strictness-${mode}`}
        />
      ))}
      {hintTitle && hintBody ? (
        <View style={[styles.boundaryCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Text style={[styles.boundaryTitle, { color: theme.foreground }]}>{hintTitle}</Text>
          <Text style={[styles.boundaryText, { color: theme.mutedForeground }]}>{hintBody}</Text>
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
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <View style={[styles.radio, { borderColor: theme.primary }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
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
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioDot: { width: 12, height: 12, borderRadius: radii.pill },
  optionTitle: { fontSize: fontSize.body, fontWeight: '800' },
  optionSubtitle: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodySmall },
  boundaryCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  boundaryTitle: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  boundaryText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodySmall },
});
