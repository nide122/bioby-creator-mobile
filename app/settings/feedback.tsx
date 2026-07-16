import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AutoGrowTextInput } from '@/components/product/AutoGrowTextInput';
import { SectionCard, SegmentedControl, getTextInputProps, getTextInputStyle } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import { submitFeedback, type FeedbackType } from '@/src/api/feedback-api';
import { alertAction } from '@/src/lib/app-dialog';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

export default function FeedbackSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const inputProps = getTextInputProps(theme);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('PROBLEM');
  const [content, setContent] = useState('');
  const [contactAllowed, setContactAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = content.trim();
  const canSubmit = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH && !submitting;
  const typeOptions = (['PROBLEM', 'SUGGESTION', 'CONFUSING', 'OTHER'] as const).map((id) => ({
    id,
    label: t(`feedbackScreen.types.${id}`),
  }));

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        feedbackType,
        content: trimmed,
        contactAllowed,
        sourcePage: '/settings/feedback',
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        clientPlatform: Platform.OS,
      });
      setContent('');
      await alertAction(t('feedbackScreen.successTitle'), t('feedbackScreen.successMessage'));
      router.back();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('feedbackScreen.errorMessage');
      await alertAction(t('feedbackScreen.errorTitle'), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      testID="screen-feedback"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('feedbackScreen.lead')}</Text>

      <SectionCard title={t('feedbackScreen.typeTitle')}>
        <SegmentedControl
          options={typeOptions}
          value={feedbackType}
          onChange={setFeedbackType}
          disabled={submitting}
        />
      </SectionCard>

      <SectionCard title={t('feedbackScreen.contentTitle')} subtitle={t('feedbackScreen.contentHint')}>
        <AutoGrowTextInput
          {...inputProps}
          value={content}
          onChangeText={setContent}
          editable={!submitting}
          minLines={6}
          maxLength={MAX_LENGTH}
          textAlignVertical="top"
          placeholder={t('feedbackScreen.placeholder')}
          accessibilityLabel={t('feedbackScreen.contentTitle')}
          style={getTextInputStyle(theme, { multiline: true, minHeight: 132 })}
        />
        <Text
          style={[
            styles.counter,
            { color: trimmed.length > 0 && trimmed.length < MIN_LENGTH ? theme.primary : theme.mutedForeground },
          ]}>
          {t('feedbackScreen.characterCount', { count: content.length, max: MAX_LENGTH })}
        </Text>
      </SectionCard>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: contactAllowed, disabled: submitting }}
        disabled={submitting}
        onPress={() => setContactAllowed((value) => !value)}
        style={({ pressed }) => [
          styles.contactRow,
          { borderColor: theme.border, backgroundColor: theme.card },
          pressed && styles.pressed,
        ]}>
        <Ionicons
          name={contactAllowed ? 'checkbox' : 'square-outline'}
          size={22}
          color={contactAllowed ? theme.primary : theme.mutedForeground}
        />
        <Text style={[styles.contactLabel, { color: theme.foreground }]}>
          {t('feedbackScreen.contactAllowed')}
        </Text>
      </Pressable>

      <Text style={[styles.privacy, { color: theme.mutedForeground }]}>{t('feedbackScreen.privacy')}</Text>

      <Pressable
        testID="feedback-submit"
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={() => void onSubmit()}
        style={({ pressed }) => [
          styles.submitButton,
          { backgroundColor: theme.primary },
          !canSubmit && styles.disabled,
          pressed && canSubmit && styles.pressed,
        ]}>
        {submitting ? (
          <ActivityIndicator color={theme.primaryForeground} />
        ) : (
          <Text style={[styles.submitLabel, { color: theme.primaryForeground }]}>
            {t('feedbackScreen.submit')}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
  counter: { alignSelf: 'flex-end', fontSize: fontSize.caption },
  contactRow: {
    minHeight: layout.touchMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  contactLabel: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  privacy: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  submitButton: {
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
  },
  submitLabel: { fontSize: fontSize.body, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.78 },
});
