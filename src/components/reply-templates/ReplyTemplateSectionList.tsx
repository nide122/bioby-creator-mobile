import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';
import { ReplyTemplateExpandableCard } from '@/src/components/reply-templates/ReplyTemplateExpandableCard';
import type { ReplyTemplatePickerSection } from '@/src/lib/reply-template-picker-visuals';
import type { ReplyTemplate } from '@/src/types/reply-template';

type ReplyTemplateSectionListProps = {
  section: ReplyTemplatePickerSection;
  templates: ReplyTemplate[];
  expandedIds: Record<string, boolean>;
  onToggleExpanded: (id: string) => void;
  mode: 'list' | 'picker';
  insertingId?: string | null;
  disabled?: boolean;
  onInsert?: (id: string) => void;
  onDelete?: (template: ReplyTemplate) => void;
  onEdit?: (template: ReplyTemplate) => void;
};

export function ReplyTemplateSectionList({
  section,
  templates,
  expandedIds,
  onToggleExpanded,
  mode,
  insertingId = null,
  disabled = false,
  onInsert,
  onDelete,
  onEdit,
}: ReplyTemplateSectionListProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (templates.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.foregroundEyebrow }]}>
        {t(`replyTemplatePicker.section.${section}`)}
      </Text>
      <View style={styles.list}>
        {templates.map((template) => (
          <ReplyTemplateExpandableCard
            key={template.id}
            template={template}
            mode={mode}
            expanded={!!expandedIds[template.id]}
            onToggleExpanded={() => onToggleExpanded(template.id)}
            disabled={disabled}
            loading={insertingId === template.id}
            onInsert={onInsert ? () => onInsert(template.id) : undefined}
            onDelete={onDelete ? () => onDelete(template) : undefined}
            onEdit={onEdit ? () => onEdit(template) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  list: {
    gap: spacing.sm,
  },
});
