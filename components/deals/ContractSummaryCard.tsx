import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { AutoGrowTextInput } from '@/components/product/AutoGrowTextInput';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { ContractSummary, InboxRiskFlag } from '@/src/types/domain';
import { attentionItemText } from '@/src/lib/inbox-detail-labels';
import { documentKindLabelKey, isContractDocumentKind } from '@/src/lib/contract-document-kind';

export type ContractSummaryCardProps = {
  summary?: ContractSummary | null;
  loading?: boolean;
  saving?: boolean;
  savingTarget?: 'contract' | 'document' | null;
  unsaved?: boolean;
  editable?: boolean;
  embedded?: boolean;
  saveLayout?: 'contract' | 'email';
  headerStyle?: 'default' | 'attachmentFilename';
  /** When false, only document summary can be saved (before brief/deal confirmation). */
  contractSaveAllowed?: boolean;
  /** Called when user taps contract save before terms are confirmed. */
  onContractSaveBlocked?: () => void;
  onChange?: (patch: Partial<ContractSummary>) => void;
  onSave?: () => void;
  onSaveDocument?: () => void;
  onSaveContract?: () => void;
  onCancel?: () => void;
  onSummarizeAttachment?: () => void;
  summarizeDisabled?: boolean;
  onUploadPdf?: () => void;
  uploadDisabled?: boolean;
  /** When true, show expand/collapse control. Defaults to attachment-style headers. */
  collapsible?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
};

function severityColor(severity: InboxRiskFlag['severity'], theme: (typeof palette)['light']): string {
  if (severity === 'danger') return '#F87171';
  if (severity === 'warning') return '#FBBF24';
  return theme.foregroundEyebrow;
}

function linesFromList(items?: string[]): string {
  return (items ?? []).join('\n');
}

function listFromLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function EditableListField({
  label,
  value,
  editable,
  onChangeText,
  theme,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChangeText: (text: string) => void;
  theme: (typeof palette)['light'];
}) {
  if (!editable && !value.trim()) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>{label}</Text>
      {editable ? (
        <AutoGrowTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={theme.mutedForeground}
          selectionColor={`${theme.primary}55`}
          underlineColorAndroid="transparent"
          style={[styles.editableField, { color: theme.foregroundSubtitle }]}
        />
      ) : (
        value
          .split('\n')
          .filter(Boolean)
          .map((item) => (
            <Text key={item} style={[styles.body, { color: theme.foregroundSubtitle }]}>
              · {item}
            </Text>
          ))
      )}
    </View>
  );
}

export function ContractSummaryCard({
  summary,
  loading,
  saving,
  savingTarget,
  unsaved,
  editable,
  embedded,
  saveLayout = 'contract',
  headerStyle = 'default',
  onChange,
  onSave,
  onSaveDocument,
  onSaveContract,
  onCancel,
  onSummarizeAttachment,
  summarizeDisabled,
  onUploadPdf,
  uploadDisabled,
  collapsible,
  contractSaveAllowed = true,
  onContractSaveBlocked,
  onDelete,
  deleting,
}: ContractSummaryCardProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [collapsed, setCollapsed] = useState(false);

  if (!summary && !loading && !onSummarizeAttachment && !onUploadPdf) {
    return null;
  }

  const risks = summary?.riskFlags ?? [];
  const isContract = isContractDocumentKind(summary?.documentType);
  const useAttachmentHeader = headerStyle === 'attachmentFilename' || saveLayout === 'email';
  const canCollapse = collapsible ?? useAttachmentHeader;
  const cardTitle = useAttachmentHeader
    ? summary?.sourceFilename?.trim()
      ? t('contractSummary.filenameSummaryTitle', { filename: summary.sourceFilename.trim() })
      : t('contractSummary.documentTitle')
    : isContract
      ? t('contractSummary.title')
      : t('contractSummary.documentTitle');
  const cardHint = useAttachmentHeader
    ? t('contractSummary.documentSubtitle')
    : isContract
      ? t('contractSummary.subtitle')
      : t('contractSummary.documentSubtitle');
  const canEdit = editable && !!onChange;
  const showContent = !loading && summary && summary.status !== 'FAILED';
  const showSave = !!summary && (unsaved || summary.status === 'DRAFT' || !summary.persisted);
  const showCancel = !!onCancel && showSave;
  const showUploadPdf = !loading && !onSummarizeAttachment && !!onUploadPdf;
  const emailSaveMode = saveLayout === 'email' && (!!onSaveDocument || !!onSaveContract || !!onSave);
  const contractSaveHandler = onSaveContract ?? onSave;
  const handleContractSavePress = () => {
    if (!contractSaveAllowed) {
      onContractSaveBlocked?.();
      return;
    }
    contractSaveHandler?.();
  };
  const uploadLabel =
    summary?.persisted && !unsaved
      ? t('contractSummary.reuploadAction')
      : t('contractSummary.uploadAction');
  const showCollapseToggle = canCollapse && !loading && !!summary;
  const showDeleteButton =
    !loading &&
    !deleting &&
    ((summary?.persisted && !unsaved && !!onDelete) || (!!onCancel && showSave));
  const deleteIsDraft = !summary?.persisted || unsaved || summary?.status === 'DRAFT';

  const handleDeletePress = () => {
    if (deleteIsDraft && onCancel) {
      onCancel();
      setCollapsed(false);
      return;
    }
    void onDelete?.();
  };

  const kindBadge = summary ? (
    <View style={[styles.draftBadge, { borderColor: `${theme.primary}55`, backgroundColor: `${theme.primary}18` }]}>
      <Text style={[styles.draftBadgeText, { color: theme.primary }]}>
        {t(documentKindLabelKey(summary.documentType))}
      </Text>
    </View>
  ) : null;

  const collapseButton = showCollapseToggle ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={collapsed ? t('contractSummary.expandA11y') : t('contractSummary.collapseA11y')}
      hitSlop={8}
      onPress={() => setCollapsed((value) => !value)}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}>
      <Ionicons
        name={collapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
        size={18}
        color={theme.mutedForeground}
      />
    </Pressable>
  ) : null;

  const deleteButton = showDeleteButton ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        deleteIsDraft ? t('contractSummary.discardDraftA11y') : t('contractSummary.deleteSavedA11y')
      }
      hitSlop={8}
      disabled={deleting}
      onPress={handleDeletePress}
      style={({ pressed }) => [styles.iconButton, (pressed || deleting) && { opacity: 0.7 }]}>
      <Ionicons name="close" size={18} color={theme.mutedForeground} />
    </Pressable>
  ) : null;

  const headerActions =
    collapseButton || deleteButton ? (
      <View style={styles.headerActions}>
        {collapseButton}
        {deleteButton}
      </View>
    ) : null;

  if (collapsed && canCollapse && summary) {
    return (
      <View
        style={[
          embedded ? styles.embeddedWrap : styles.card,
          !embedded && styles.collapsedCard,
          !embedded && { borderColor: theme.border, backgroundColor: theme.secondary },
        ]}
        testID="contract-summary-card-collapsed">
        <View style={styles.collapsedRow}>
          <Ionicons name="document-text-outline" size={14} color={theme.primary} />
          <Text style={[styles.collapsedTitle, { color: theme.foreground }]} numberOfLines={1}>
            {cardTitle}
          </Text>
          {kindBadge}
          {headerActions}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        embedded ? styles.embeddedWrap : styles.card,
        !embedded && { borderColor: theme.border, backgroundColor: theme.secondary },
      ]}
      testID="contract-summary-card">
      {!embedded ? (
        <>
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <Ionicons name="document-text-outline" size={16} color={theme.primary} />
              <Text style={[styles.title, { color: theme.foreground, flex: 1 }]} numberOfLines={2}>
                {cardTitle}
              </Text>
              {kindBadge}
              {unsaved ? (
                <View style={[styles.draftBadge, { borderColor: '#F59E0B66', backgroundColor: '#F59E0B18' }]}>
                  <Text style={[styles.draftBadgeText, { color: '#B45309' }]}>{t('contractSummary.unsavedBadge')}</Text>
                </View>
              ) : summary?.persisted ? (
                <View style={[styles.draftBadge, { borderColor: '#34D39966', backgroundColor: '#34D39918' }]}>
                  <Text style={[styles.draftBadgeText, { color: '#059669' }]}>{t('contractSummary.savedBadge')}</Text>
                </View>
              ) : null}
            </View>
            {headerActions}
          </View>
          <Text style={[styles.hint, { color: theme.mutedForeground }]}>{cardHint}</Text>
        </>
      ) : unsaved || summary?.persisted || summary ? (
        <View style={styles.headerRow}>
          <View style={styles.header}>
            {kindBadge}
            {unsaved ? (
              <View style={[styles.draftBadge, { borderColor: '#F59E0B66', backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.draftBadgeText, { color: '#B45309' }]}>{t('contractSummary.unsavedBadge')}</Text>
              </View>
            ) : summary?.persisted ? (
              <View style={[styles.draftBadge, { borderColor: '#34D39966', backgroundColor: '#34D39918' }]}>
                <Text style={[styles.draftBadgeText, { color: '#059669' }]}>{t('contractSummary.savedBadge')}</Text>
              </View>
            ) : null}
          </View>
          {headerActions}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.body, { color: theme.mutedForeground }]}>
            {isContract ? t('contractSummary.extracting') : t('contractSummary.extractingDocument')}
          </Text>
        </View>
      ) : null}

      {!loading && summary?.status === 'FAILED' ? (
        <Text style={[styles.body, { color: '#F87171' }]}>
          {summary.errorMessage ?? t('contractSummary.failed')}
        </Text>
      ) : null}

      {showContent ? (
        <View style={{ gap: spacing.sm }}>
          {summary.sourceFilename && !useAttachmentHeader ? (
            <Text style={[styles.meta, { color: theme.mutedForeground }]}>
              {t('contractSummary.sourceFile', { filename: summary.sourceFilename })}
            </Text>
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>
              {t('contractSummary.summaryField')}
            </Text>
            {canEdit ? (
              <AutoGrowTextInput
                value={summary.summary ?? ''}
                onChangeText={(text) => onChange?.({ summary: text })}
                placeholder={t('contractSummary.summaryField')}
                placeholderTextColor={theme.mutedForeground}
                selectionColor={`${theme.primary}55`}
                underlineColorAndroid="transparent"
                style={[styles.editableField, styles.summaryField, { color: theme.foregroundSubtitle }]}
              />
            ) : summary.summary?.trim() ? (
              <Text style={[styles.summaryText, { color: theme.foregroundSubtitle }]}>{summary.summary.trim()}</Text>
            ) : null}
          </View>
          <EditableListField
            label={t('contractSummary.deliverablesTitle')}
            value={linesFromList(summary.deliverables)}
            editable={canEdit && isContract}
            onChangeText={(text) => onChange?.({ deliverables: listFromLines(text) })}
            theme={theme}
          />
          <EditableListField
            label={t('contractSummary.usageRightsTitle')}
            value={linesFromList(summary.usageRights)}
            editable={canEdit && isContract}
            onChangeText={(text) => onChange?.({ usageRights: listFromLines(text) })}
            theme={theme}
          />
          <EditableListField
            label={t('contractSummary.deadlinesTitle')}
            value={linesFromList(summary.deadlines)}
            editable={canEdit}
            onChangeText={(text) => onChange?.({ deadlines: listFromLines(text) })}
            theme={theme}
          />
          {risks.length > 0 && isContract ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>{t('contractSummary.risksTitle')}</Text>
              {risks.map((flag) => (
                <View key={flag.id} style={styles.riskRow}>
                  <View style={[styles.riskDot, { backgroundColor: severityColor(flag.severity, theme) }]} />
                  <Text style={[styles.body, { color: theme.foregroundSubtitle, flex: 1 }]}>
                    {attentionItemText(flag, t)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {showSave ? (
        <View style={{ gap: spacing.sm }}>
          {emailSaveMode ? (
            <>
              {showCancel ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || loading}
                  onPress={() => onCancel?.()}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { borderColor: theme.border, backgroundColor: theme.background },
                    (pressed || saving) && { opacity: 0.88 },
                  ]}>
                  <Ionicons name="close-outline" size={16} color={theme.foreground} />
                  <Text style={[styles.actionLabel, { color: theme.foreground }]}>
                    {t('contractSummary.cancelAction')}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || loading || !onSaveDocument}
                  onPress={onSaveDocument}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonHalf,
                    { borderColor: theme.border, backgroundColor: theme.background },
                    (pressed || saving) && { opacity: 0.88 },
                  ]}>
                  {saving && savingTarget === 'document' ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Ionicons name="document-outline" size={16} color={theme.primary} />
                  )}
                  <Text style={[styles.actionLabel, { color: theme.primary }]}>
                    {saving && savingTarget === 'document'
                      ? t('contractSummary.saving')
                      : t('contractSummary.saveDocumentAction')}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || loading || !contractSaveHandler}
                  onPress={handleContractSavePress}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonHalf,
                    { borderColor: theme.primary, backgroundColor: theme.primary },
                    (pressed || saving) && { opacity: 0.88 },
                  ]}>
                  {saving && savingTarget === 'contract' ? (
                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                  ) : (
                    <Ionicons name="save-outline" size={16} color={theme.primaryForeground} />
                  )}
                  <Text style={[styles.saveLabel, { color: theme.primaryForeground }]}>
                    {saving && savingTarget === 'contract'
                      ? t('contractSummary.saving')
                      : t('contractSummary.saveAction')}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.actionRow}>
              {showCancel ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || loading}
                  onPress={() => onCancel?.()}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonHalf,
                    { borderColor: theme.border, backgroundColor: theme.background },
                    (pressed || saving) && { opacity: 0.88 },
                  ]}>
                  <Ionicons name="close-outline" size={16} color={theme.foreground} />
                  <Text style={[styles.actionLabel, { color: theme.foreground }]}>
                    {t('contractSummary.cancelAction')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={saving || loading || !contractSaveHandler}
                onPress={handleContractSavePress}
                style={({ pressed }) => [
                  showCancel ? styles.saveButtonHalf : styles.saveButton,
                  { borderColor: theme.primary, backgroundColor: theme.primary },
                  (pressed || saving) && { opacity: 0.88 },
                ]}>
                {saving ? (
                  <ActivityIndicator size="small" color={theme.primaryForeground} />
                ) : (
                  <Ionicons name="save-outline" size={16} color={theme.primaryForeground} />
                )}
                <Text style={[styles.saveLabel, { color: theme.primaryForeground }]}>
                  {saving ? t('contractSummary.saving') : t('contractSummary.saveAction')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {!loading && (!summary || summary.status === 'FAILED' || !showContent) && onSummarizeAttachment ? (
        <Pressable
          accessibilityRole="button"
          disabled={summarizeDisabled || loading}
          onPress={onSummarizeAttachment}
          style={({ pressed }) => [
            styles.actionButton,
            { borderColor: theme.border, backgroundColor: theme.background },
            (pressed || summarizeDisabled) && { opacity: 0.85 },
          ]}>
          <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
          <Text style={[styles.actionLabel, { color: theme.primary }]}>{t('contractSummary.summarizeAction')}</Text>
        </Pressable>
      ) : null}

      {showUploadPdf ? (
        <Pressable
          accessibilityRole="button"
          disabled={uploadDisabled || loading}
          onPress={onUploadPdf}
          testID="contract-summary-upload-pdf"
          style={({ pressed }) => [
            styles.actionButton,
            showContent ? styles.secondaryActionButton : null,
            { borderColor: theme.border, backgroundColor: theme.background },
            (pressed || uploadDisabled) && { opacity: 0.85 },
          ]}>
          <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} />
          <Text style={[styles.actionLabel, { color: theme.primary }]}>{uploadLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  embeddedWrap: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
  },
  collapsedCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collapsedTitle: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    fontWeight: '700',
  },
  title: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  hint: { fontSize: fontSize.eyebrow, lineHeight: lineHeight.body },
  summaryText: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  label: { fontSize: fontSize.caption, fontWeight: '700' },
  body: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.body },
  meta: { fontSize: fontSize.eyebrow },
  editableField: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          overflow: 'hidden',
          resize: 'none',
        } as const)
      : {}),
  },
  summaryField: { width: '100%' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  riskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  riskDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  draftBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  draftBadgeText: { fontSize: fontSize.eyebrow, fontWeight: '700' },
  actionButton: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryActionButton: {
    marginTop: spacing.sm,
  },
  actionLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  actionRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonHalf: { flex: 1 },
  saveButton: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveLabel: { fontSize: fontSize.bodySmall, fontWeight: '700' },
  saveButtonHalf: {
    flex: 1,
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
