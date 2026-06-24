import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge, HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { ReplyTemplateBodyPreview } from '@/src/components/reply-templates/ReplyTemplateBodyPreview';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { confirmAction } from '@/src/lib/app-dialog';
import type { ReplyTemplate } from '@/src/types/reply-template';

function ReplyTemplateListCard({
  template,
  expanded,
  isSaving,
  onToggleExpanded,
  onDelete,
}: {
  template: ReplyTemplate;
  expanded: boolean;
  isSaving: boolean;
  onToggleExpanded: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('replyTemplatesScreen.collapseA11y') : t('replyTemplatesScreen.expandA11y')}
        onPress={onToggleExpanded}
        style={styles.rowHeader}>
        <View style={styles.rowHeaderCopy}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: theme.foreground }]} numberOfLines={1}>
              {template.name}
            </Text>
            {template.isDefault ? <Badge tone="mint" label={t('replyTemplatesScreen.defaultBadge')} /> : null}
          </View>
          {!expanded ? (
            <Text style={[styles.rowSummary, { color: theme.mutedForeground }]} numberOfLines={1}>
              {template.variables.length > 0
                ? t('replyTemplatesScreen.collapsedSummary', { count: template.variables.length })
                : t('replyTemplatesScreen.collapsedSummaryPlain')}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {expanded ? (
        <>
          <View style={{ gap: spacing.xs }}>
            <ReplyTemplateBodyPreview body={template.body} />
            {template.variables.length > 0 ? (
              <Text style={[styles.vars, { color: theme.foregroundSubtitle }]}>
                {t('replyTemplatesScreen.usedTags', { count: template.variables.length })}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onDelete}
            style={[styles.deleteButton, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteLabel}>{t('replyTemplatesScreen.deleteTemplateCta')}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export default function ReplyTemplatesSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { templates, isLoading, error, refetch, deleteTemplate, isSaving } = useReplyTemplates();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('replyTemplatesScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <PlaceholderScreen title={t('replyTemplatesScreen.loadFailedTitle')} description={t('replyTemplatesScreen.loadFailedBody')}>
        <QueryRetryCard message={error.message} onRetry={() => void refetch()} />
      </PlaceholderScreen>
    );
  }

  const sorted = [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <HubScreen
      eyebrow={t('assetsScreen.sections.pitch')}
      title={t('replyTemplatesScreen.title')}
      lead={t('replyTemplatesScreen.lead')}
      toolbar={
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || sorted.length >= 20}
          onPress={() => router.push('/settings/reply-template-edit' as Href)}
          style={[styles.addButton, { backgroundColor: theme.primary, opacity: sorted.length >= 20 ? 0.5 : 1 }]}>
          <Text style={[styles.addLabel, { color: theme.primaryForeground }]}>{t('replyTemplatesScreen.addCta')}</Text>
        </Pressable>
      }>
      <SectionCard title={t('replyTemplatesScreen.listTitle')} subtitle={t('replyTemplatesScreen.listSubtitle')}>
        {sorted.length === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('replyTemplatesScreen.empty')}</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {sorted.map((template) => (
              <ReplyTemplateListCard
                key={template.id}
                template={template}
                expanded={!!expandedIds[template.id]}
                isSaving={isSaving}
                onToggleExpanded={() => toggleExpanded(template.id)}
                onDelete={() => {
                  void (async () => {
                    const confirmed = await confirmAction({
                      title: t('replyTemplatesScreen.deleteConfirmTitle'),
                      message: t('replyTemplatesScreen.deleteConfirmBody', { name: template.name }),
                      confirmLabel: t('replyTemplatesScreen.deleteTemplateCta'),
                      cancelLabel: t('common.cancel'),
                      destructive: true,
                    });
                    if (confirmed) {
                      await deleteTemplate(template.id);
                      setExpandedIds((current) => {
                        const next = { ...current };
                        delete next[template.id];
                        return next;
                      });
                    }
                  })();
                }}
              />
            ))}
          </View>
        )}
      </SectionCard>
      <Text style={[styles.hint, { color: theme.mutedForeground }]}>{t('replyTemplatesScreen.hint')}</Text>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignSelf: 'flex-start',
    borderRadius: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addLabel: {
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
  },
  empty: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
  },
  row: {
    borderWidth: 1,
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  rowSummary: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  vars: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteLabel: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    fontWeight: '600',
    color: '#DC2626',
  },
  hint: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    paddingBottom: layout.tabBarScrollInset,
  },
});
