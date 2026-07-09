import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthAppIcon } from '@/components/auth/AuthAppIcon';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { corporateCleanClass, webClassName } from '@/src/lib/corporate-clean-web';

type Props = PropsWithChildren<{
  title?: string;
  lead?: string;
  /** Replaces default title block (register hero, etc.) */
  header?: ReactNode;
  footer?: ReactNode;
  testID?: string;
}>;

/** Shared scroll shell for sign-in, register, and password flows. */
export function AuthScreenShell({ title, lead, header, footer, testID, children }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <SafeAreaView
      testID={testID}
      style={[styles.safe, { backgroundColor: theme.background }]}
      className={webClassName(corporateCleanClass.screen)}>
      <View style={styles.topBar}>
        <AuthAppIcon />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className={webClassName(corporateCleanClass.authShell)}>
            {header ?? (
              <View style={styles.header} className={webClassName(corporateCleanClass.animateIn)}>
                {title ? (
                  <Text
                    className={webClassName(corporateCleanClass.gradientText)}
                    style={[styles.title, { color: theme.foreground }]}>
                    {title}
                  </Text>
                ) : null}
                {lead ? (
                  <Text style={[styles.lead, { color: theme.mutedForeground }]}>{lead}</Text>
                ) : null}
              </View>
            )}
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'flex-start',
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingTop: spacing.lg },
});
