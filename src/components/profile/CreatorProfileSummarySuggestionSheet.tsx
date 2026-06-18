import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { elevation, fontSize, palette, radii, spacing } from '@/constants/tokens';
import { parseNicheTags } from '@/src/lib/creator-profile-aggregate';
import { dismissProfileAiPrompt } from '@/src/lib/creator-profile-ai-prefs';
import type {
  CreatorProfileSummary,
  SummaryAdoptField,
  SummaryAdoptOptions,
  SummarySuggestion,
} from '@/src/types/creator-profile';

type Props = {
  visible: boolean;
  current: CreatorProfileSummary;
  suggestion: SummarySuggestion | null;
  generating: boolean;
  onDismiss: () => void;
  onAdopt: (options: SummaryAdoptOptions) => void;
};

const FIELDS: SummaryAdoptField[] = ['displayName', 'bio', 'nicheTags'];

export function CreatorProfileSummarySuggestionSheet({
  visible,
  current,
  suggestion,
  generating,
  onDismiss,
  onAdopt,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [selectedFields, setSelectedFields] = useState<SummaryAdoptField[]>(FIELDS);

  const hasExistingContent = useMemo(
    () =>
      Boolean(current.displayName.trim() || current.bio.trim() || parseNicheTags(current.nicheTagsText).length),
    [current],
  );

  const toggleField = (field: SummaryAdoptField) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field],
    );
  };

  const adoptAll = () => {
    if (!suggestion) return;
    onAdopt({ fields: FIELDS, replaceExisting: true });
  };

  const adoptSelected = () => {
    if (!suggestion || !selectedFields.length) return;
    onAdopt({ fields: selectedFields, replaceExisting });
  };

  const renderValue = (field: SummaryAdoptField, summary: CreatorProfileSummary | SummarySuggestion['suggestion']) => {
    if (field === 'displayName') return summary.displayName.trim() || t('creatorProfileEditor.suggestionEmpty');
    if (field === 'bio') return summary.bio.trim() || t('creatorProfileEditor.suggestionEmpty');
    const tags = 'nicheTagsText' in summary ? parseNicheTags(summary.nicheTagsText) : summary.nicheTags;
    return tags.length ? tags.join(' · ') : t('creatorProfileEditor.suggestionEmpty');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="none" style={styles.backdropHit} onPress={onDismiss} />
        <View
          style={[
            styles.sheet,
            elevation.surface,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: theme.foreground }]}>
            {t('creatorProfileEditor.suggestionTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
            {t('creatorProfileEditor.suggestionSubtitle')}
          </Text>

          {suggestion?.confidence === 'low' ? (
            <View style={[styles.warning, { borderColor: '#F59E0B55', backgroundColor: '#F59E0B12' }]}>
              <Text style={[styles.warningText, { color: '#B45309' }]}>
                {t('creatorProfileEditor.suggestionLowConfidence')}
              </Text>
            </View>
          ) : null}

          {suggestion?.reasons?.length ? (
            <View style={[styles.reasons, { backgroundColor: theme.secondary, borderColor: theme.border }]}>
              {suggestion.reasons.map((reason) => (
                <Text key={reason} style={[styles.reasonLine, { color: theme.mutedForeground }]}>
                  • {reason}
                </Text>
              ))}
            </View>
          ) : null}

          <ScrollView style={styles.scroll} contentContainerStyle={{ gap: spacing.sm }}>
            {FIELDS.map((field) => {
              const currentValue = renderValue(field, current);
              const suggestedValue = suggestion ? renderValue(field, suggestion.suggestion) : '…';
              const changed = currentValue !== suggestedValue;
              const selected = selectedFields.includes(field);

              return (
                <View
                  key={field}
                  style={[styles.fieldCard, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleField(field)}
                    style={styles.fieldHeader}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected ? theme.primary : 'transparent',
                        },
                      ]}
                    />
                    <Text style={[styles.fieldLabel, { color: theme.foreground }]}>
                      {t(`creatorProfileEditor.suggestionField.${field}`)}
                    </Text>
                    {changed ? (
                      <Text style={[styles.changedBadge, { color: theme.primary }]}>
                        {t('creatorProfileEditor.suggestionChanged')}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View style={styles.diffRow}>
                    <Text style={[styles.diffLabel, { color: theme.foregroundEyebrow }]}>
                      {t('creatorProfileEditor.suggestionCurrent')}
                    </Text>
                    <Text style={[styles.diffValue, { color: theme.foreground }]}>{currentValue}</Text>
                  </View>
                  <View style={styles.diffRow}>
                    <Text style={[styles.diffLabel, { color: theme.foregroundEyebrow }]}>
                      {t('creatorProfileEditor.suggestionSuggested')}
                    </Text>
                    <Text style={[styles.diffValue, { color: theme.foreground }]}>
                      {generating ? t('creatorProfileEditor.aiGenerating') : suggestedValue}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {hasExistingContent ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: replaceExisting }}
              onPress={() => setReplaceExisting((value) => !value)}
              style={styles.replaceRow}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: replaceExisting ? theme.primary : theme.border,
                    backgroundColor: replaceExisting ? theme.primary : 'transparent',
                  },
                ]}
              />
              <Text style={[styles.replaceLabel, { color: theme.foreground }]}>
                {t('creatorProfileEditor.suggestionReplaceExisting')}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>
                {t('creatorProfileEditor.suggestionDismiss')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={generating || !suggestion}
              onPress={adoptSelected}
              style={[
                styles.primaryButton,
                { backgroundColor: generating || !suggestion ? theme.border : theme.primary },
              ]}>
              <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                {t('creatorProfileEditor.suggestionAdoptSelected')}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={generating || !suggestion}
            onPress={adoptAll}
            style={[styles.fullButton, { borderColor: theme.border }]}>
            <Text style={[styles.fullButtonLabel, { color: theme.primary }]}>
              {t('creatorProfileEditor.suggestionAdoptAll')}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void dismissProfileAiPrompt();
              onDismiss();
            }}
            style={styles.dontAskAgain}>
            <Text style={[styles.dontAskAgainLabel, { color: theme.mutedForeground }]}>
              {t('creatorProfileEditor.aiPromptDontAskAgain')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropHit: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '88%',
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: spacing.xs,
  },
  title: { fontSize: fontSize.sectionTitle, fontWeight: '700', lineHeight: 26 },
  subtitle: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  warning: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md },
  warningText: { fontSize: fontSize.bodySmall, lineHeight: 20, fontWeight: '600' },
  reasons: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  reasonLine: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  scroll: { maxHeight: 320 },
  fieldCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldLabel: { flex: 1, fontSize: fontSize.body, fontWeight: '700' },
  changedBadge: { fontSize: fontSize.caption, fontWeight: '700' },
  diffRow: { gap: spacing.xs },
  diffLabel: { fontSize: fontSize.caption, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  diffValue: { fontSize: fontSize.bodySmall, lineHeight: 20 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth * 2 },
  replaceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  replaceLabel: { flex: 1, fontSize: fontSize.bodySmall, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryLabel: { fontSize: fontSize.body, fontWeight: '600' },
  primaryButton: {
    flex: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryLabel: { fontSize: fontSize.body, fontWeight: '700' },
  fullButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  fullButtonLabel: { fontSize: fontSize.body, fontWeight: '700' },
  dontAskAgain: { alignItems: 'center', paddingVertical: spacing.xs },
  dontAskAgainLabel: { fontSize: fontSize.caption, fontWeight: '600' },
});
