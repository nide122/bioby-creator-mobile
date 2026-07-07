import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  ReplyDraftGeneratorDetailDialog,
  type ReplyDraftDetailState,
} from '@/components/drafts/ReplyDraftGeneratorDetailDialog';
import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { elevation, fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { fetchSuggestedReplyPurpose, generateReplyDraft, type GeneratedReplyDraft } from '@/src/api/drafts-api';
import { ApiError } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { formatCooldownLabel, parseReplyDraftRateLimitCooldown } from '@/src/lib/format-cooldown-label';
import { pickRateCardPackage } from '@/src/lib/reply-template-context';
import {
  REPLY_DRAFT_CORE_PURPOSES,
  REPLY_DRAFT_MORE_PURPOSES,
  type ReplyDraftPurpose,
  isReplyDraftCorePurpose,
  replyDraftPurposeI18nKey,
} from '@/src/lib/reply-draft-purpose';
import type { RateCardPackage } from '@/src/types/domain';

type ReplyDraftGeneratorSheetProps = {
  visible: boolean;
  opportunityId?: string;
  rateCardPackages?: RateCardPackage[];
  locale?: string;
  overwriteDraftId?: string;
  hasExistingBody?: boolean;
  onClose: () => void;
  onGenerated: (result: GeneratedReplyDraft) => void;
};

export function ReplyDraftGeneratorSheet({
  visible,
  opportunityId,
  rateCardPackages,
  locale,
  overwriteDraftId,
  hasExistingBody,
  onClose,
  onGenerated,
}: ReplyDraftGeneratorSheetProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { templates } = useReplyTemplates();

  const [purpose, setPurpose] = useState<ReplyDraftPurpose>('pre_outreach');
  const [rateCardPackageId, setRateCardPackageId] = useState<string | undefined>();
  const [replyTemplateId, setReplyTemplateId] = useState<string | undefined>();
  const [loadingPurpose, setLoadingPurpose] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'overwrite' | 'fresh'>('overwrite');
  const [detail, setDetail] = useState<ReplyDraftDetailState | null>(null);
  const [scenariosExpanded, setScenariosExpanded] = useState(false);

  const sortedPackages = useMemo(() => {
    if (!rateCardPackages?.length) return [];
    return [...rateCardPackages].sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [rateCardPackages]);

  const sortedTemplates = useMemo(() => {
    if (!templates.length) return [];
    return [...templates].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [templates]);

  useEffect(() => {
    if (!visible || !opportunityId || !shouldUseBackendApi()) return;
    let cancelled = false;
    setLoadingPurpose(true);
    void fetchSuggestedReplyPurpose(opportunityId)
      .then((suggested) => {
        if (!cancelled) {
          setPurpose(suggested.purpose);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPurpose(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, opportunityId]);

  useEffect(() => {
    if (!visible) {
      setScenariosExpanded(false);
      return;
    }
    if (!isReplyDraftCorePurpose(purpose)) {
      setScenariosExpanded(true);
    }
  }, [visible, purpose]);

  useEffect(() => {
    if (!visible) return;
    const selected = pickRateCardPackage(sortedPackages);
    setRateCardPackageId(selected?.id);
  }, [visible, sortedPackages]);

  useEffect(() => {
    if (!visible) return;
    setSaveMode(overwriteDraftId && hasExistingBody ? 'overwrite' : 'overwrite');
    setReplyTemplateId(undefined);
    setDetail(null);
    setError(null);
  }, [visible, overwriteDraftId, hasExistingBody]);

  const visibleMorePurposes = scenariosExpanded
    ? REPLY_DRAFT_MORE_PURPOSES
    : REPLY_DRAFT_MORE_PURPOSES.filter((item) => item === purpose && !isReplyDraftCorePurpose(purpose));

  const onGenerate = async () => {
    if (!opportunityId || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const useOverwrite = saveMode === 'overwrite' && overwriteDraftId;
      const result = await generateReplyDraft(opportunityId, {
        purpose,
        rateCardPackageId,
        locale,
        mode: useOverwrite ? 'overwrite' : saveMode,
        overwriteDraftId: useOverwrite ? overwriteDraftId : undefined,
        replyTemplateId,
      });
      if (!result.draft) {
        setError(t('replyDraftGenerator.error'));
        return;
      }
      onGenerated(result);
      onClose();
    } catch (error) {
      const cooldown = parseReplyDraftRateLimitCooldown(error);
      if (cooldown != null) {
        setError(formatCooldownLabel(cooldown, t, 'replyDraftGenerator.rateLimitCooldown'));
      } else if (error instanceof ApiError) {
        setError(error.message || t('replyDraftGenerator.error'));
      } else {
        setError(t('replyDraftGenerator.error'));
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable accessibilityRole="none" style={styles.backdropHit} onPress={onClose} />
          <View style={[styles.sheet, elevation.surface, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetContent}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.foreground }]}>{t('replyDraftGenerator.title')}</Text>
                <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
                  <Text style={[styles.close, { color: theme.primary }]}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
              <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('replyDraftGenerator.lead')}</Text>

              <Text style={[styles.sectionLabel, { color: theme.foregroundSubtitle }]}>
                {t('replyDraftGenerator.scenarioLabel')}
              </Text>
              {loadingPurpose ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <View style={styles.chipRow}>
                    {REPLY_DRAFT_CORE_PURPOSES.map((item) => (
                      <ScenarioChip
                        key={item}
                        active={purpose === item}
                        label={t(replyDraftPurposeI18nKey(item))}
                        onPress={() => setPurpose(item)}
                        theme={theme}
                      />
                    ))}
                    {visibleMorePurposes.map((item) => (
                      <ScenarioChip
                        key={item}
                        active={purpose === item}
                        label={t(replyDraftPurposeI18nKey(item))}
                        onPress={() => setPurpose(item)}
                        theme={theme}
                      />
                    ))}
                  </View>
                  {REPLY_DRAFT_MORE_PURPOSES.length ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        scenariosExpanded
                          ? t('replyDraftGenerator.scenariosLessA11y')
                          : t('replyDraftGenerator.scenariosMoreA11y')
                      }
                      onPress={() => setScenariosExpanded((expanded) => !expanded)}
                      style={styles.scenariosToggle}>
                      <Text style={[styles.scenariosToggleLabel, { color: theme.primary }]}>
                        {scenariosExpanded
                          ? t('replyDraftGenerator.scenariosLess')
                          : t('replyDraftGenerator.scenariosMore')}
                      </Text>
                      <Ionicons
                        name={scenariosExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={16}
                        color={theme.primary}
                      />
                    </Pressable>
                  ) : null}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: theme.foregroundSubtitle }]}>
                {t('replyDraftGenerator.rateCardLabel')}
              </Text>
              {sortedPackages.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                  {sortedPackages.map((pkg) => (
                    <OptionChip
                      key={pkg.id}
                      active={rateCardPackageId === pkg.id}
                      title={pkg.name}
                      subtitle={pkg.priceLabel}
                      recommended={pkg.recommended}
                      recommendedLabel={t('replyDraftGenerator.recommendedBadge')}
                      detailA11y={t('replyDraftGenerator.viewRateCardDetail')}
                      onSelect={() => setRateCardPackageId(pkg.id)}
                      onDetail={() => setDetail({ kind: 'rateCard', item: pkg })}
                      theme={theme}
                      variant="package"
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('replyDraftGenerator.noRateCard')}</Text>
              )}

              <Text style={[styles.sectionLabel, { color: theme.foregroundSubtitle }]}>
                {t('replyDraftGenerator.templateLabel')}
              </Text>
              {sortedTemplates.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                  <OptionChip
                    active={!replyTemplateId}
                    title={t('replyDraftGenerator.templateNone')}
                    onSelect={() => setReplyTemplateId(undefined)}
                    theme={theme}
                    variant="template"
                  />
                  {sortedTemplates.map((template) => (
                    <OptionChip
                      key={template.id}
                      active={replyTemplateId === template.id}
                      title={template.name}
                      recommended={template.isDefault}
                      recommendedLabel={t('replyDraftGenerator.recommendedBadge')}
                      detailA11y={t('replyDraftGenerator.viewTemplateDetail')}
                      onSelect={() => setReplyTemplateId(template.id)}
                      onDetail={() => setDetail({ kind: 'template', item: template })}
                      theme={theme}
                      variant="template"
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('replyDraftGenerator.noTemplate')}</Text>
              )}

              {overwriteDraftId && hasExistingBody ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.foregroundSubtitle }]}>
                    {t('replyDraftGenerator.saveModeLabel')}
                  </Text>
                  <View style={styles.chipRow}>
                    {(['overwrite', 'fresh'] as const).map((item) => {
                      const active = saveMode === item;
                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          onPress={() => setSaveMode(item)}
                          style={[
                            styles.choiceChip,
                            {
                              borderColor: active ? theme.primary : theme.border,
                              backgroundColor: active ? theme.secondary : theme.card,
                            },
                          ]}>
                          <Text style={[styles.chipLabel, { color: active ? theme.primary : theme.foreground }]}>
                            {t(`replyDraftGenerator.saveMode.${item}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {error ? <Text style={[styles.error, { color: '#DC2626' }]}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={!opportunityId || generating}
                onPress={() => void onGenerate()}
                style={[
                  styles.primary,
                  {
                    backgroundColor: theme.primary,
                    opacity: !opportunityId || generating ? 0.6 : 1,
                  },
                ]}>
                {generating ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={[styles.primaryLabel, { color: theme.primaryForeground }]}>
                    {t('replyDraftGenerator.generateCta')}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReplyDraftGeneratorDetailDialog
        visible={!!detail}
        detail={detail}
        onClose={() => setDetail(null)}
      />
    </>
  );
}

function ScenarioChip({
  active,
  label,
  onPress,
  theme,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  theme: (typeof palette)['light'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.choiceChip,
        {
          borderColor: active ? theme.primary : theme.border,
          backgroundColor: active ? theme.secondary : theme.card,
        },
      ]}>
      <Text style={[styles.chipLabel, { color: active ? theme.primary : theme.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function OptionChip({
  active,
  title,
  subtitle,
  recommended,
  recommendedLabel,
  detailA11y,
  onSelect,
  onDetail,
  theme,
  variant,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  recommended?: boolean;
  recommendedLabel?: string;
  detailA11y?: string;
  onSelect: () => void;
  onDetail?: () => void;
  theme: (typeof palette)['light'];
  variant: 'package' | 'template';
}) {
  return (
    <View
      style={[
        variant === 'package' ? styles.packageChip : styles.templateChip,
        {
          borderColor: active ? theme.primary : theme.border,
          backgroundColor: active ? theme.secondary : theme.card,
        },
      ]}>
      {onDetail ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={detailA11y}
          onPress={onDetail}
          hitSlop={4}
          style={styles.detailButton}>
          <Ionicons name="reorder-three-outline" size={12} color={theme.mutedForeground} />
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onSelect} style={styles.optionPress}>
        <Text style={[styles.optionTitle, { color: theme.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.optionSubtitle, { color: theme.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {recommended && recommendedLabel ? <Badge tone="mint" label={recommendedLabel} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  backdropHit: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  title: {
    fontSize: fontSize.cardTitle,
    lineHeight: lineHeight.lead,
    fontWeight: '700',
  },
  close: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  lead: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
  },
  scenariosToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  scenariosToggleLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
  },
  optionRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  packageChip: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    maxWidth: 180,
  },
  templateChip: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    maxWidth: 160,
  },
  detailButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPress: {
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  optionTitle: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: fontSize.caption,
  },
  hint: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  error: {
    fontSize: fontSize.bodySmall,
  },
  primary: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
