import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { renderReplyTemplateOnServer } from '@/src/api/reply-templates-api';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { ReplyTemplateSectionList } from '@/src/components/reply-templates/ReplyTemplateSectionList';
import { useReplyTemplates } from '@/src/hooks/use-reply-templates';
import { renderReplyTemplate } from '@/src/lib/reply-template-render';
import { groupReplyTemplatesForPicker } from '@/src/lib/reply-template-picker-visuals';
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => groupReplyTemplatesForPicker(templates), [templates]);
  const totalCount = grouped.negotiation.length + grouped.general.length;

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  const onSelect = async (id: string) => {
    if (insertingId) return;
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setInsertingId(id);
    try {
      const rendered = shouldUseBackendApi()
        ? await renderReplyTemplateOnServer(id, renderContext)
        : renderReplyTemplate(template.body, renderContext);
      onInsert(rendered);
      onClose();
      setExpandedIds({});
    } finally {
      setInsertingId(null);
    }
  };

  const handleClose = () => {
    setExpandedIds({});
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityRole="button">
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.foreground }]}>{t('replyTemplatePicker.title')}</Text>
              <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('replyTemplatePicker.lead')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: theme.secondary }]}>
              <Ionicons name="close" size={18} color={theme.foreground} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : totalCount === 0 ? (
            <Text style={[styles.empty, { color: theme.mutedForeground }]}>{t('replyTemplatePicker.empty')}</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              <ReplyTemplateSectionList
                section="negotiation"
                templates={grouped.negotiation}
                expandedIds={expandedIds}
                onToggleExpanded={toggleExpanded}
                mode="picker"
                insertingId={insertingId}
                disabled={!!insertingId}
                onInsert={(id) => void onSelect(id)}
              />
              <ReplyTemplateSectionList
                section="general"
                templates={grouped.general}
                expandedIds={expandedIds}
                onToggleExpanded={toggleExpanded}
                mode="picker"
                insertingId={insertingId}
                disabled={!!insertingId}
                onInsert={(id) => void onSelect(id)}
              />
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: fontSize.cardTitle,
    lineHeight: lineHeight.lead,
    fontWeight: '700',
  },
  lead: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    paddingBottom: spacing.lg,
  },
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
});
