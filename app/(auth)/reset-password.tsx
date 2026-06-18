import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { Badge, getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, palette, radii, spacing } from '@/constants/tokens';
import { isApiConfigured } from '@/src/api/api-config';
import { resetPassword, validateResetToken } from '@/src/api/auth-api';
import { resolveAuthApiErrorMessage } from '@/src/auth/auth-api-errors';
import { alertAction } from '@/src/lib/app-dialog';

const MIN_PASSWORD = 8;

function readTokenParam(raw: string | string[] | undefined): string | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw[0]?.trim()) return raw[0].trim();
  return null;
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => readTokenParam(params.token), [params.token]);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    isApiConfigured() &&
    !!token &&
    tokenValid &&
    password.length >= MIN_PASSWORD &&
    passwordsMatch &&
    !loading;

  useEffect(() => {
    if (!token || !isApiConfigured()) {
      setValidating(false);
      setTokenValid(false);
      return;
    }

    let cancelled = false;
    void validateResetToken(token)
      .then((result) => {
        if (!cancelled) {
          setTokenValid(result.valid);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenValid(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setValidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async () => {
    if (!canSubmit || !token) return;
    setLoading(true);
    try {
      await resetPassword(token, password);
      await alertAction(t('auth.resetPassword.successTitle'), t('auth.resetPassword.successBody'));
      router.replace('/login' as Href);
    } catch (err) {
      await alertAction(
        t('auth.resetPassword.errors.submit'),
        resolveAuthApiErrorMessage(err, 'auth.resetPassword.errors.fallback'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.resetPassword.invalidTitle')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.resetPassword.invalidBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isApiConfigured()) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.resetPassword.apiRequiredTitle')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.demoModeHint')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (validating) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.resetPassword.validating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.resetPassword.expiredTitle')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.resetPassword.expiredBody')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/forgot-password' as Href)}
            style={[styles.primary, { backgroundColor: theme.primary, marginTop: spacing.lg }]}>
            <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
              {t('auth.resetPassword.requestNewLink')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.foreground }]}>{t('auth.resetPassword.title')}</Text>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('auth.resetPassword.lead')}</Text>

          <SectionCard title={t('auth.resetPassword.cardTitle')} subtitle={t('auth.resetPassword.cardSubtitle')}>
            <Badge tone="warning" label={t('auth.resetPassword.secureBadge')} />

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.passwordLabel')}</Text>
            <TextInput
              testID="auth-reset-password"
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              {...getTextInputProps(theme)}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              style={getTextInputStyle(theme)}
            />

            <Text style={[styles.label, { color: theme.foregroundSubtitle }]}>{t('auth.resetPassword.confirmLabel')}</Text>
            <TextInput
              testID="auth-reset-password-confirm"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.resetPassword.confirmPlaceholder')}
              {...getTextInputProps(theme)}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              style={getTextInputStyle(theme)}
            />

            {confirmPassword.length > 0 && !passwordsMatch ? (
              <Text style={[styles.hint, { color: '#B91C1C' }]}>{t('auth.resetPassword.mismatch')}</Text>
            ) : (
              <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('auth.passwordMinHint')}</Text>
            )}

            <Pressable
              testID="auth-reset-submit"
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
                  {t('auth.resetPassword.submit')}
                </Text>
              )}
            </Pressable>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: spacing.xxl },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.lg, paddingTop: spacing.sectionY },
  centered: { flex: 1, justifyContent: 'center', gap: spacing.md, paddingTop: spacing.sectionY },
  title: { fontSize: 24, fontWeight: '600' },
  lead: { fontSize: fontSize.body, lineHeight: 22 },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  hint: { fontSize: fontSize.caption, marginTop: spacing.xs },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: { fontWeight: '600', fontSize: fontSize.body },
});
