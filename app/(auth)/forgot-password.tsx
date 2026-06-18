import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge, type BadgeTone, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { isApiConfigured } from '@/src/api/api-config';
import { type ForgotPasswordOutcome, requestPasswordReset } from '@/src/api/auth-api';
import { resolveAuthApiErrorMessage } from '@/src/auth/auth-api-errors';
import { alertAction } from '@/src/lib/app-dialog';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResultTone = BadgeTone;

function resultTone(outcome: ForgotPasswordOutcome): ResultTone {
  switch (outcome) {
    case 'RESET_EMAIL_SENT':
      return 'mint';
    case 'EMAIL_NOT_FOUND':
    case 'RATE_LIMITED':
      return 'warning';
    case 'ACCOUNT_DISABLED':
      return 'danger';
    case 'OAUTH_ONLY':
    default:
      return 'primary';
  }
}

function resultBadgeKey(outcome: ForgotPasswordOutcome): string {
  return `auth.forgotPassword.result.${outcome}.badge`;
}

function resultBodyKey(outcome: ForgotPasswordOutcome): string {
  return `auth.forgotPassword.result.${outcome}.body`;
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<ForgotPasswordOutcome | null>(null);

  const canSubmit = EMAIL_PATTERN.test(email.trim()) && isApiConfigured() && !loading;

  const onEmailChange = (value: string) => {
    setEmail(value);
    if (outcome) setOutcome(null);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setOutcome(response.outcome);
    } catch (err) {
      await alertAction(
        t('auth.forgotPassword.errors.submit'),
        resolveAuthApiErrorMessage(err, 'auth.forgotPassword.errors.fallback'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.forgotPassword.title')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.forgotPassword.lead')}</Text>

          <SectionCard title={t('auth.forgotPassword.cardTitle')} subtitle={t('auth.forgotPassword.cardSubtitle')}>
            {!isApiConfigured() ? (
              <Text style={[styles.apiHint, { color: theme.mutedForeground }]}>{t('auth.demoModeHint')}</Text>
            ) : null}

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.login.emailLabel')}</Text>
            <TextInput
              testID="auth-forgot-email"
              value={email}
              onChangeText={onEmailChange}
              placeholder={t('auth.login.emailPlaceholder')}
              {...getTextInputProps(theme)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              style={getTextInputStyle(theme)}
            />

            <Pressable
              testID="auth-forgot-submit"
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={() => void onSubmit()}
              style={[
                styles.primary,
                { backgroundColor: canSubmit ? theme.primary : theme.border },
              ]}
              android_ripple={{ color: `${theme.primaryForeground}33` }}>
              {loading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('auth.forgotPassword.submit')}
                </Text>
              )}
            </Pressable>

            {outcome ? (
              <View style={styles.resultBlock}>
                <Badge tone={resultTone(outcome)} label={t(resultBadgeKey(outcome))} />
                <Text style={[styles.resultText, { color: theme.foreground }]}>{t(resultBodyKey(outcome))}</Text>
                {outcome === 'EMAIL_NOT_FOUND' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/register' as Href)}
                    style={styles.inlineLink}>
                    <Text style={{ color: theme.primary }}>{t('auth.forgotPassword.createAccountInstead')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </SectionCard>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/login' as Href)}
              style={styles.link}>
              <Text style={{ color: theme.mutedForeground }}>{t('auth.forgotPassword.backToSignIn')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.xxl },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.lg, paddingTop: spacing.sectionY },
  title: { fontSize: 24, fontWeight: '600' },
  lead: { fontSize: fontSize.body, lineHeight: 22 },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  apiHint: { fontSize: fontSize.caption, marginBottom: spacing.sm },
  resultBlock: { gap: spacing.md, marginTop: spacing.md },
  resultText: { fontSize: fontSize.body, lineHeight: 22 },
  inlineLink: { alignSelf: 'flex-start' },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingBottom: spacing.xxl },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
});
