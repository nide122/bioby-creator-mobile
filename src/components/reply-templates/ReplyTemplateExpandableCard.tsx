import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator } from 'react-native';

import { Badge } from '@/components/product';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { ReplyTemplateBodyPreview } from '@/src/components/reply-templates/ReplyTemplateBodyPreview';
import { ReplyTemplateFieldChip } from '@/src/components/reply-templates/ReplyTemplateFieldChip';
import type { ReplyTemplateFieldKey } from '@/src/lib/reply-template-fields';
import { plainReplyTemplatePreview, resolveReplyTemplateVisual } from '@/src/lib/reply-template-picker-visuals';
import type { ReplyTemplate } from '@/src/types/reply-template';

export type ReplyTemplateCardMode = 'list' | 'picker';

type ReplyTemplateExpandableCardProps = {
  template: ReplyTemplate;
  mode: ReplyTemplateCardMode;
  expanded: boolean;
  onToggleExpanded: () => void;
  disabled?: boolean;
  loading?: boolean;
  onInsert?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
};

export function ReplyTemplateExpandableCard({
  template,
  mode,
  expanded,
  onToggleExpanded,
  disabled = false,
  loading = false,
  onInsert,
  onDelete,
  onEdit,
}: ReplyTemplateExpandableCardProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const visual = resolveReplyTemplateVisual(template);
  const preview = plainReplyTemplatePreview(template.body);
  const visibleVars = template.variables.slice(0, 3) as ReplyTemplateFieldKey[];
  const hiddenVarCount = Math.max(0, template.variables.length - visibleVars.length);

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: mode === 'list' ? theme.card : theme.background,
          opacity: disabled ? 0.65 : 1,
        },
      ]}>
      <View style={styles.mainRow}>
        <View style={[styles.iconWrap, { backgroundColor: visual.accent }]}>
          {loading ? (
            <ActivityIndicator color={visual.iconColor} size="small" />
          ) : (
            <Ionicons name={visual.icon} size={18} color={visual.iconColor} />
          )}
        </View>

        <View style={styles.body}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? t('replyTemplatesScreen.collapseA11y') : t('replyTemplatesScreen.expandA11y')
            }
            disabled={disabled || mode !== 'list'}
            onPress={mode === 'list' ? onToggleExpanded : undefined}
            style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={1}>
                {template.name}
              </Text>
              {template.isDefault ? (
                <Badge tone="mint" label={t('replyTemplatesScreen.defaultBadge')} />
              ) : null}
              {mode === 'list' ? (
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.foregroundEyebrow}
                />
              ) : null}
            </View>

            {!expanded && preview ? (
              <Text style={[styles.preview, { color: theme.mutedForeground }]} numberOfLines={2}>
                {preview}
              </Text>
            ) : null}

            {!expanded && template.variables.length > 0 ? (
              <Text style={[styles.tagSummary, { color: theme.mutedForeground }]}>
                {t('replyTemplatesScreen.collapsedSummary', { count: template.variables.length })}
              </Text>
            ) : null}

            {!expanded && visibleVars.length > 0 ? (
              <View style={styles.varRow}>
                {visibleVars.map((fieldKey) => (
                  <ReplyTemplateFieldChip key={fieldKey} fieldKey={fieldKey} compact />
                ))}
                {hiddenVarCount > 0 ? (
                  <Text style={[styles.varMore, { color: theme.mutedForeground }]}>+{hiddenVarCount}</Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>

          {expanded ? (
            <View style={styles.expandedBody}>
              <ReplyTemplateBodyPreview body={template.body} />
              {template.variables.length > 0 ? (
                <Text style={[styles.usedTags, { color: theme.foregroundSubtitle }]}>
                  {t('replyTemplatesScreen.usedTags', { count: template.variables.length })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {mode === 'picker' || expanded ? (
            <View style={styles.footer}>
              {mode === 'picker' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('replyTemplatePicker.insertCta', { name: template.name })}
                  disabled={disabled || loading}
                  onPress={onInsert}
                  style={[styles.insertBtn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.insertLabel, { color: theme.primaryForeground }]}>
                    {t('replyTemplatePicker.insertCtaShort')}
                  </Text>
                </Pressable>
              ) : onEdit ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onEdit}
                  style={[styles.ghostBtn, { borderColor: theme.border }]}>
                  <Text style={[styles.ghostLabel, { color: theme.foreground }]}>{t('replyTemplatesScreen.editCta')}</Text>
                </Pressable>
              ) : (
                <View />
              )}

              {mode === 'picker' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    expanded
                      ? t('replyTemplatePicker.collapseDetailA11y')
                      : t('replyTemplatePicker.viewDetailA11y')
                  }
                  disabled={disabled}
                  onPress={onToggleExpanded}
                  style={[styles.detailBtn, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <Text style={[styles.detailLabel, { color: theme.foreground }]}>
                    {expanded ? t('replyTemplatePicker.collapseDetailCta') : t('replyTemplatePicker.viewDetailCta')}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={theme.mutedForeground}
                  />
                </Pressable>
              ) : expanded && onDelete ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={onDelete}
                  style={[styles.deleteBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={styles.deleteLabel}>{t('replyTemplatesScreen.deleteTemplateCta')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  preview: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  tagSummary: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  varRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  varMore: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    marginLeft: 2,
  },
  expandedBody: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  usedTags: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.body,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  insertBtn: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  insertLabel: {
    fontSize: fontSize.caption,
    fontWeight: '700',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
    marginLeft: 'auto',
  },
  detailLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  ghostLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
    marginLeft: 'auto',
  },
  deleteLabel: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    color: '#DC2626',
  },
});
