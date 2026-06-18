import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { type ResendRegistrationCodeOutcome, resendRegistrationCode } from '@/src/api/auth-api';
import { resolvePostAuthRoute } from '@/src/auth/post-auth-navigation';
import { useAuthActions } from '@/src/auth/use-auth-actions';
import { resolveAuthApiErrorMessage } from '@/src/auth/auth-api-errors';
import { alertAction } from '@/src/lib/app-dialog';

const VERIFICATION_CODE_LENGTH = 6;

function readEmailParam(raw: string | string[] | undefined): string {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return '';
}

function resultTone(outcome: ResendRegistrationCodeOutcome): BadgeTone {
  switch (outcome) {
    case 'REGISTRATION_CODE_SENT':
      return 'mint';
    case 'RATE_LIMITED':
      return 'warning';
    case 'EMAIL_TAKEN':
      return 'danger';
    case 'NO_PENDING_REGISTRATION':
    default:
      return 'primary';
  }
}

export default function VerifyEmailPendingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[]; redirect?: string | string[] }>();
  const email = useMemo(() => readEmailParam(params.email), [params.email]);
  const { completeRegister, loading } = useAuthActions();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [code, setCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [outcome, setOutcome] = useState<ResendRegistrationCodeOutcome | null>(null);

  const canVerify =
    isApiConfigured() &&
    email.length > 0 &&
    code.length === VERIFICATION_CODE_LENGTH &&
    !loading &&
    !resendLoading;
  const canResend = isApiConfigured() && email.length > 0 && !resendLoading && !loading;

  const onCodeChange = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, VERIFICATION_CODE_LENGTH));
    if (outcome) setOutcome(null);
  };

  const onVerify = async () => {
    if (!canVerify) return;
    const result = await completeRegister({ email, code });
    if (!result.ok) {
      await alertAction(
        t('auth.verifyEmailPending.errors.verify'),
        result.message,
      );
      return;
    }
    router.replace(resolvePostAuthRoute(params.redirect) as Href);
  };

  const onResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      const response = await resendRegistrationCode(email);
      setOutcome(response.outcome);
      if (response.outcome === 'REGISTRATION_CODE_SENT') {
        setCode('');
      }
      if (response.outcome === 'EMAIL_TAKEN') {
        router.replace('/login' as Href);
      }
      if (response.outcome === 'NO_PENDING_REGISTRATION') {
        router.replace('/register' as Href);
      }
    } catch (err) {
      await alertAction(
        t('auth.verifyEmailPending.errors.resend'),
        resolveAuthApiErrorMessage(err, 'auth.verifyEmailPending.errors.fallback'),
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.verifyEmailPending.title')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.verifyEmailPending.lead')}</Text>

          <SectionCard
            title={t('auth.verifyEmailPending.cardTitle')}
            subtitle={t('auth.verifyEmailPending.cardSubtitle')}>
            {email ? (
              <Text style={[styles.email, { color: theme.foreground }]}>{email}</Text>
            ) : null}
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>
              {t('auth.verifyEmailPending.instructions')}
            </Text>

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>
              {t('auth.verifyEmailPending.codeLabel')}
            </Text>
            <TextInput
              testID="auth-verify-email-code"
              value={code}
              onChangeText={onCodeChange}
              placeholder={t('auth.verifyEmailPending.codePlaceholder')}
              {...getTextInputProps(theme)}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
              maxLength={VERIFICATION_CODE_LENGTH}
              style={[getTextInputStyle(theme), styles.codeInput]}
            />
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>
              {t('auth.verifyEmailPending.codeHint')}
            </Text>

            <Pressable
              testID="auth-verify-email-submit"
              accessibilityRole="button"
              disabled={!canVerify}
              onPress={() => void onVerify()}
              style={[
                styles.primary,
                { backgroundColor: canVerify ? theme.primary : theme.border },
              ]}
              android_ripple={{ color: `${theme.primaryForeground}33` }}>
              {loading ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                  {t('auth.verifyEmailPending.createAccount')}
                </Text>
              )}
            </Pressable>

            {outcome ? (
              <View style={styles.result}>
                <Badge tone={resultTone(outcome)} label={t(`auth.verifyEmailPending.result.${outcome}.badge`)} />
                <Text style={[styles.resultBody, { color: theme.mutedForeground }]}>
                  {t(`auth.verifyEmailPending.result.${outcome}.body`)}
                </Text>
              </View>
            ) : null}

            <Pressable
              testID="auth-verify-email-resend"
              accessibilityRole="button"
              disabled={!canResend}
              onPress={() => void onResend()}
              style={[
                styles.secondary,
                { borderColor: canResend ? theme.border : theme.secondary },
              ]}
              android_ripple={{ color: `${theme.primary}22` }}>
              {resendLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Text style={[styles.secondaryLabel, { color: canResend ? theme.foreground : theme.mutedForeground }]}>
                  {t('auth.verifyEmailPending.resend')}
                </Text>
              )}
            </Pressable>
          </SectionCard>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/register' as Href)}
            style={styles.link}>
            <Text style={{ color: theme.mutedForeground }}>{t('auth.verifyEmailPending.backToRegister')}</Text>
          </Pressable>
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
  email: { fontSize: fontSize.body, fontWeight: '700' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.md },
  hint: { fontSize: fontSize.caption, lineHeight: 18, marginTop: spacing.xs },
  codeInput: { letterSpacing: 4, fontWeight: '700', textAlign: 'center' },
  result: { gap: spacing.sm, marginTop: spacing.md },
  resultBody: { fontSize: fontSize.caption, lineHeight: 18 },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  secondary: {
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secondaryLabel: { fontWeight: '600', fontSize: fontSize.body },
  link: { alignItems: 'center', paddingVertical: spacing.sm },
});
