import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { renderReplyTemplateOnServer } from '@/src/api/reply-templates-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { ReplyTemplateBodyPreview } from '@/src/components/reply-templates/ReplyTemplateBodyPreview';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { replyTemplateFieldLabel } from '@/src/lib/reply-template-fields';
import { renderReplyTemplate } from '@/src/lib/reply-template-render';
import type { RenderReplyTemplateInput } from '@/src/types/reply-template';

type ReplyTemplatePickerProps = {
  visible: boolean;
  onClose: () => void;
  onInsert: (renderedBody: string) => void;
  renderContext: RenderReplyTemplateInput;
};

export function ReplyTemplatePicker({ visible, onClose, onInsert, renderContext }: ReplyTemplatePickerProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { templates, isLoading } = useReplyTemplates();
  const [insertingId, setInsertingId] = useState<string | null>(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [templates],
  );

  const onSelect = async (id: string) => {
    if (insertingId) return;
    const template = sortedTemplates.find((item) => item.id === id);
    if (!template) return;
    setInsertingId(id);
    try {
      const rendered = shouldUseBackendApi()
        ? await renderReplyTemplateOnServer(id, renderContext)
        : renderReplyTemplate(template.body, renderContext, {
            missingLabel: (key) => replyTemplateFieldLabel(key, t),
          });
      const withLabels = renderReplyTemplate(rendered, renderContext, {
        missingLabel: (key) => replyTemplateFieldLabel(key, t),
      });
      onInsert(withLabels);
      onClose();
    } finally {
      setInsertingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.foreground }]}>{t('replyTemplatePicker.title')}</Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={[styles.close, { color: theme.primary }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
          <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('replyTemplatePicker.lead')}</Text>
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : sortedTemplates.length === 0 ? (
            <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('replyTemplatePicker.empty')}</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {sortedTemplates.map((template) => (
                <Pressable
                  key={template.id}
                  accessibilityRole="button"
                  disabled={!!insertingId}
                  onPress={() => void onSelect(template.id)}
                  style={[styles.row, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowTitle, { color: theme.foreground }]}>{template.name}</Text>
                    {template.isDefault ? <Badge tone="mint" label={t('replyTemplatesScreen.defaultBadge')} /> : null}
                  </View>
                  <ReplyTemplateBodyPreview body={template.body} numberOfLines={3} />
                  {insertingId === template.id ? <ActivityIndicator color={theme.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.cardTitle,
    lineHeight: lineHeight.lead,
    fontWeight: '600',
  },
  close: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  lead: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    paddingBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
