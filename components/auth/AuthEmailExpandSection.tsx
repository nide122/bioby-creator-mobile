import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { fontSize, radii, spacing, type ThemePalette } from '@/constants/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXPAND_LAYOUT = LayoutAnimation.create(
  260,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

type Props = {
  expanded: boolean;
  onExpand: () => void;
  expandLabel: string;
  dividerLabel: string;
  expandTestID: string;
  theme: ThemePalette;
  children: ReactNode;
};

export function AuthEmailExpandSection({
  expanded,
  onExpand,
  expandLabel,
  dividerLabel,
  expandTestID,
  theme,
  children,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!expanded) return;
    opacity.setValue(0);
    translateY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 280,
        mass: 0.85,
      }),
    ]).start();
  }, [expanded, opacity, translateY]);

  const handleExpand = () => {
    LayoutAnimation.configureNext(EXPAND_LAYOUT);
    onExpand();
  };

  if (!expanded) {
    return (
      <Pressable
        testID={expandTestID}
        accessibilityRole="button"
        onPress={handleExpand}
        style={({ pressed }) => [styles.emailToggle, pressed && styles.emailTogglePressed]}>
        <Text style={[styles.emailToggleLabel, { color: theme.mutedForeground }]}>{expandLabel}</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.emailExpand,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerLabel, { color: theme.foregroundEyebrow }]}>{dividerLabel}</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emailToggle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.md,
  },
  emailTogglePressed: { opacity: 0.72 },
  emailToggleLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  emailExpand: { gap: spacing.md, marginTop: spacing.xs },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: fontSize.caption, fontWeight: '700', letterSpacing: 0.2 },
});
