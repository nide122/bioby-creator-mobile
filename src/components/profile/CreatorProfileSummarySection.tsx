import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getTextInputProps, getTextInputStyle, SectionCard } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, palette, radii, spacing } from '@/constants/tokens';
import { formatCooldownLabel } from '@/src/lib/format-cooldown-label';
import { formatNicheTagsText, parseNicheTags } from '@/src/lib/creator-profile-aggregate';
import type { CreatorProfileSummary } from '@/src/types/creator-profile';

import { TagInput } from './TagInput';

type Props = {
  summary: CreatorProfileSummary;
  connectedPlatformsLabel: string;
  platformStatLines: string[];
  testIdPrefix: string;
  canGenerateAi?: boolean;
  generatingAi?: boolean;
  rateLimitCooldownSeconds?: number | null;
  onGenerateAi?: () => void;
  onChangeSummary: (
    updater: CreatorProfileSummary | ((prev: CreatorProfileSummary) => CreatorProfileSummary),
  ) => void;
};

export function CreatorProfileSummarySection({
  summary,
  connectedPlatformsLabel,
  platformStatLines,
  testIdPrefix,
  canGenerateAi = false,
  generatingAi = false,
  rateLimitCooldownSeconds = null,
  onGenerateAi,
  onChangeSummary,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const aiCooldownActive = rateLimitCooldownSeconds != null && rateLimitCooldownSeconds > 0;
  const aiButtonDisabled = generatingAi || aiCooldownActive;
  const aiButtonLabel = aiCooldownActive
    ? formatCooldownLabel(rateLimitCooldownSeconds, t, 'creatorProfileEditor.aiGenerateCooldown')
    : t('creatorProfileEditor.aiGenerate');

  return (
    <SectionCard
      title={t('creatorProfileEditor.summaryTitle')}
      subtitle={t('creatorProfileEditor.summarySubtitle')}>
      {canGenerateAi ? (
        <Pressable
          testID={`${testIdPrefix}-ai-generate`}
          accessibilityRole="button"
          accessibilityState={{ disabled: aiButtonDisabled }}
          disabled={aiButtonDisabled}
          onPress={onGenerateAi}
          style={({ pressed }) => [
            styles.aiButton,
            {
              borderColor: theme.border,
              backgroundColor: theme.secondary,
              opacity: aiButtonDisabled && !generatingAi ? 0.55 : 1,
            },
            pressed && !aiButtonDisabled && { opacity: 0.88 },
          ]}>
          {generatingAi ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Text
              style={[
                styles.aiButtonLabel,
                { color: aiCooldownActive ? theme.mutedForeground : theme.primary },
              ]}>
              {aiButtonLabel}
            </Text>
          )}
        </Pressable>
      ) : null}

      {connectedPlatformsLabel ? (
        <Text style={[styles.connected, { color: theme.mutedForeground }]}>
          {t('creatorProfileEditor.connectedPlatforms', { platforms: connectedPlatformsLabel })}
        </Text>
      ) : null}

      {platformStatLines.length ? (
        <View style={[styles.statsBlock, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
          <Text style={[styles.statsTitle, { color: theme.foregroundEyebrow }]}>
            {t('creatorProfileEditor.platformStatsTitle')}
          </Text>
          {platformStatLines.map((line) => (
            <Text key={line} style={[styles.statsLine, { color: theme.foreground }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
        {t('onboardingProfileScreen.labelDisplayName')}
      </Text>
      <TextInput
        testID={`${testIdPrefix}-display-name`}
        value={summary.displayName}
        onChangeText={(displayName) => onChangeSummary((prev) => ({ ...prev, displayName }))}
        placeholder={t('onboardingProfileScreen.placeholderDisplayName')}
        {...getTextInputProps(theme)}
        style={getTextInputStyle(theme)}
      />

      <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
        {t('onboardingProfileScreen.labelBio')}
      </Text>
      <TextInput
        testID={`${testIdPrefix}-bio`}
        value={summary.bio}
        onChangeText={(bio) => onChangeSummary((prev) => ({ ...prev, bio }))}
        placeholder={t('onboardingProfileScreen.placeholderBio')}
        {...getTextInputProps(theme)}
        style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
        multiline
      />

      <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
        {t('onboardingProfileScreen.labelTags')}
      </Text>
      <TagInput
        key={summary.nicheTagsText}
        testID={`${testIdPrefix}-tags`}
        tags={parseNicheTags(summary.nicheTagsText)}
        onChangeTags={(tags) =>
          onChangeSummary((prev) => ({ ...prev, nicheTagsText: formatNicheTagsText(tags) }))
        }
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  aiButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  aiButtonLabel: { fontSize: fontSize.body, fontWeight: '700' },
  connected: { fontSize: fontSize.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  statsBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statsTitle: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statsLine: { fontSize: fontSize.bodySmall, lineHeight: 20, fontWeight: '600' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
