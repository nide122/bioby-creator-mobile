import Ionicons from '@expo/vector-icons/Ionicons';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';

export type FlowStepState = 'done' | 'current' | 'upcoming' | 'blocked';

export type FlowStep = {
  id: string;
  label: string;
  hint?: string;
  state: FlowStepState;
};

export function FlowSteps({ title, steps }: { title?: string; steps: FlowStep[] }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {title ? <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text> : null}
      <View style={styles.row}>
        {steps.map((step, index) => {
          const done = step.state === 'done';
          const blocked = step.state === 'blocked';
          const active = step.state === 'current';
          const dotBorder = blocked ? '#EF4444' : done || active ? theme.primary : theme.border;
          const dotBg = blocked ? '#EF444415' : done ? theme.primary : active ? theme.primary + '18' : theme.secondary;
          const labelColor = done || active || blocked ? theme.foreground : theme.mutedForeground;
          const arrowColor = done ? theme.primary : theme.border;

          return (
            <Fragment key={step.id}>
              <View style={styles.step}>
                <View style={[styles.dot, { borderColor: dotBorder, backgroundColor: dotBg }]}>
                  {done ? (
                    <Ionicons name="checkmark" size={12} color={theme.primaryForeground} />
                  ) : blocked ? (
                    <Ionicons name="alert-circle" size={12} color="#EF4444" />
                  ) : (
                    <Text style={[styles.dotLabel, { color: active ? theme.primary : theme.foregroundEyebrow }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, { color: labelColor }]} numberOfLines={2}>
                  {step.label}
                </Text>
                {step.hint ? (
                  <Text style={[styles.stepHint, { color: theme.foregroundEyebrow }]} numberOfLines={2}>
                    {step.hint}
                  </Text>
                ) : null}
              </View>
              {index < steps.length - 1 ? (
                <View style={styles.arrowWrap}>
                  <Ionicons name="arrow-forward" size={14} color={arrowColor} />
                </View>
              ) : null}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.bodySmall, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, gap: spacing.xs, alignItems: 'center' },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLabel: { fontSize: fontSize.caption, fontWeight: '800' },
  stepLabel: { fontSize: fontSize.caption, fontWeight: '800', textAlign: 'center' },
  stepHint: { fontSize: fontSize.eyebrow, lineHeight: lineHeight.body, textAlign: 'center' },
  arrowWrap: {
    paddingTop: 4,
    paddingHorizontal: 2,
    justifyContent: 'flex-start',
  },
});
