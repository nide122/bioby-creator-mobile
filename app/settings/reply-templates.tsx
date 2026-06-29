import { type Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HubScreen, QueryRetryCard, SectionCard } from '@/components/product';
import { ReplyTemplateSectionList } from '@/src/components/reply-templates/ReplyTemplateSectionList';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { groupReplyTemplatesForPicker } from '@/src/lib/reply-template-picker-visuals';
import { confirmAction } from '@/src/lib/app-dialog';
import type { ReplyTemplate } from '@/src/types/reply-template';

export default function ReplyTemplatesSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { templates, isLoading, error, refetch, deleteTemplate, isSaving } = useReplyTemplates();
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => groupReplyTemplatesForPicker(templates), [templates]);

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

  const totalCount = grouped.negotiation.length + grouped.general.length;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  const onDelete = (template: ReplyTemplate) => {
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
  };

  const onEdit = (template: ReplyTemplate) => {
    router.push(`/settings/reply-template-edit?id=${encodeURIComponent(template.id)}` as Href);
  };

  return (
    <HubScreen
      eyebrow={t('assetsScreen.sections.pitch')}
      title={t('replyTemplatesScreen.title')}
      lead={t('replyTemplatesScreen.lead')}
      toolbar={
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || totalCount >= 20}
          onPress={() => router.push('/settings/reply-template-edit' as Href)}
          style={[styles.addButton, { backgroundColor: theme.primary, opacity: totalCount >= 20 ? 0.5 : 1 }]}>
          <Text style={[styles.addLabel, { color: theme.primaryForeground }]}>{t('replyTemplatesScreen.addCta')}</Text>
        </Pressable>
      }>
      <SectionCard title={t('replyTemplatesScreen.listTitle')} subtitle={t('replyTemplatesScreen.listSubtitle')}>
        {totalCount === 0 ? (
          <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('replyTemplatesScreen.empty')}</Text>
        ) : (
          <View style={styles.sections}>
            <ReplyTemplateSectionList
              section="negotiation"
              templates={grouped.negotiation}
              expandedIds={expandedIds}
              onToggleExpanded={toggleExpanded}
              mode="list"
              disabled={isSaving}
              onDelete={onDelete}
              onEdit={onEdit}
            />
            <ReplyTemplateSectionList
              section="general"
              templates={grouped.general}
              expandedIds={expandedIds}
              onToggleExpanded={toggleExpanded}
              mode="list"
              disabled={isSaving}
              onDelete={onDelete}
              onEdit={onEdit}
            />
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
  sections: {
    gap: spacing.lg,
  },
  hint: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    paddingBottom: layout.tabBarScrollInset,
  },
});
