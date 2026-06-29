import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContractSummaryCard } from '@/components/deals/ContractSummaryCard';
import { EmailAttachmentPreviewModal } from '@/components/mail/EmailAttachmentPreviewModal';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { ContractSummary } from '@/src/types/domain';
import type { ContractSummary as ApiContractSummary } from '@/src/api/contract-summary-api';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import {
  dedupeVisibleAttachments,
  isParseableDocumentAttachment,
  isPreviewableAttachment,
} from '@/components/mail/email-attachment-utils';
import { fetchEmailAttachmentBlob } from '@/src/lib/email-attachment-download';
import {
  attachmentMailboxReconnectMessage,
  isAttachmentMailboxConnectionError,
} from '@/src/lib/email-attachment-errors';
import { alertAction } from '@/src/lib/app-dialog';
import {
  buildAttachmentPreviewContent,
  type AttachmentPreviewContent,
} from '@/src/lib/email-attachment-preview-content';

export type EmailAttachmentSummaryHandlers = {
  documentSummaries: ApiContractSummary[];
  contractSummary?: ApiContractSummary | null;
  /** False before brief/deal confirmation — only document summary may be saved. */
  contractSaveAllowed?: boolean;
  attachmentDrafts: Record<string, ApiContractSummary>;
  isAttachmentParsing?: (attachmentId: string) => boolean;
  deleting?: boolean;
  saving?: boolean;
  savingTarget?: 'contract' | 'document' | null;
  isAttachmentDraftUnsaved?: (attachmentId: string) => boolean;
  onDraftChange?: (attachmentId: string, patch: Partial<ApiContractSummary>) => void;
  onSaveDocument?: (attachmentId: string) => void;
  onSaveContract?: (attachmentId: string) => void;
  onContractSaveBlocked?: () => void;
  onCancelDraft?: (attachmentId: string) => void;
  onDeleteDocument?: (attachmentId: string) => void;
  onDeleteContract?: () => void;
};

type Props = {
  messageId: string;
  attachments: EmailAttachment[];
  mailboxEmailAddress?: string | null;
  onSummarizePdf?: (attachment: EmailAttachment) => void;
  summaryHandlers?: EmailAttachmentSummaryHandlers;
};

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function webHoverTitle(label: string): { title?: string } {
  return Platform.OS === 'web' ? { title: label } : {};
}

function attachmentHasSummary(
  attachmentId: string,
  handlers: EmailAttachmentSummaryHandlers
): boolean {
  if (handlers.isAttachmentParsing?.(attachmentId)) return true;
  if (handlers.attachmentDrafts[attachmentId]) return true;
  if (handlers.documentSummaries.some((row) => row.emailAttachmentId === attachmentId)) return true;
  if (handlers.contractSummary?.emailAttachmentId === attachmentId) return true;
  return false;
}

function AttachmentSummaryBlock({
  attachment,
  embedded = false,
  handlers,
}: {
  attachment: EmailAttachment;
  embedded?: boolean;
  handlers: EmailAttachmentSummaryHandlers;
}) {
  const attachmentId = attachment.id;
  const draft = handlers.attachmentDrafts[attachmentId];
  const parsing = handlers.isAttachmentParsing?.(attachmentId) ?? false;
  const activeDraft = !!draft || parsing;
  const savedDocument = handlers.documentSummaries.find((row) => row.emailAttachmentId === attachmentId);
  const contractSaveAllowed = handlers.contractSaveAllowed ?? true;
  const savedContract =
    contractSaveAllowed && handlers.contractSummary?.emailAttachmentId === attachmentId
      ? handlers.contractSummary
      : null;
  const unsaved = handlers.isAttachmentDraftUnsaved?.(attachmentId) ?? !!draft;

  if (activeDraft) {
    const displaySummary =
      draft ??
      (parsing
        ? ({
            sourceFilename: attachment.filename,
            status: 'DRAFT',
            source: 'EMAIL_ATTACHMENT',
          } satisfies ApiContractSummary)
        : null);
    return (
      <ContractSummaryCard
        embedded={embedded}
        summary={(displaySummary ?? null) as ContractSummary | null}
        loading={parsing && !draft}
        saving={handlers.saving}
        savingTarget={handlers.savingTarget}
        deleting={handlers.deleting}
        unsaved={unsaved}
        editable={!!draft && draft.status !== 'FAILED'}
        saveLayout="email"
        headerStyle="attachmentFilename"
        collapsible
        contractSaveAllowed={contractSaveAllowed}
        onChange={(patch) => handlers.onDraftChange?.(attachmentId, patch)}
        onSaveDocument={() => handlers.onSaveDocument?.(attachmentId)}
        onSaveContract={() => handlers.onSaveContract?.(attachmentId)}
        onContractSaveBlocked={handlers.onContractSaveBlocked}
        onCancel={() => handlers.onCancelDraft?.(attachmentId)}
      />
    );
  }

  if (savedContract) {
    return (
      <ContractSummaryCard
        embedded={embedded}
        summary={savedContract as ContractSummary}
        editable={false}
        headerStyle="attachmentFilename"
        collapsible
        deleting={handlers.deleting}
        onDelete={() => handlers.onDeleteContract?.()}
      />
    );
  }

  if (savedDocument) {
    return (
      <ContractSummaryCard
        embedded={embedded}
        summary={savedDocument as ContractSummary}
        editable={false}
        headerStyle="attachmentFilename"
        collapsible
        deleting={handlers.deleting}
        onDelete={() => handlers.onDeleteDocument?.(attachmentId)}
      />
    );
  }

  return null;
}

export function EmailAttachmentsList({
  messageId,
  attachments,
  mailboxEmailAddress,
  onSummarizePdf,
  summaryHandlers,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const visible = dedupeVisibleAttachments(attachments);
  const previewRevokeRef = useRef<(() => void) | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<EmailAttachment | null>(null);
  const [previewContent, setPreviewContent] = useState<AttachmentPreviewContent | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const clearPreviewResources = useCallback(() => {
    previewRevokeRef.current?.();
    previewRevokeRef.current = null;
    setPreviewContent(null);
  }, []);

  useEffect(() => () => clearPreviewResources(), [clearPreviewResources]);

  const previewFetchErrorMessage = () =>
    attachmentMailboxReconnectMessage(t, 'preview', mailboxEmailAddress);

  if (visible.length === 0) {
    return null;
  }

  const downloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const payload = await fetchEmailAttachmentBlob(messageId, attachment.id, attachment.filename, {
        inline: false,
        mimeType: attachment.mimeType,
      });
      try {
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = payload.uri;
          link.download = attachment.filename;
          link.click();
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(payload.uri);
          return;
        }
        await Linking.openURL(payload.uri);
      } finally {
        payload.revoke();
      }
    } catch (error) {
      if (isAttachmentMailboxConnectionError(error)) {
        void alertAction(t('emailAttachments.fetchFailedTitle'), attachmentMailboxReconnectMessage(t, 'download', mailboxEmailAddress));
      }
    }
  };

  const openPreview = async (attachment: EmailAttachment) => {
    clearPreviewResources();
    setPreviewAttachment(attachment);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const payload = await fetchEmailAttachmentBlob(messageId, attachment.id, attachment.filename, {
        inline: true,
        mimeType: attachment.mimeType,
      });
      try {
        const content = await buildAttachmentPreviewContent(
          attachment,
          payload.blob,
          payload.uri,
          payload.mimeType,
        );
        if (content.mode === 'unsupported') {
          setPreviewError(t('emailAttachments.previewUnsupported'));
          payload.revoke();
          return;
        }
        if (content.mode === 'pdf' || content.mode === 'image') {
          previewRevokeRef.current = payload.revoke;
        } else {
          payload.revoke();
        }
        setPreviewContent(content);
      } catch {
        payload.revoke();
        setPreviewError(t('emailAttachments.previewFailedProcessing'));
      }
    } catch (error) {
      if (isAttachmentMailboxConnectionError(error)) {
        setPreviewError(previewFetchErrorMessage());
      } else {
        closePreview();
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    clearPreviewResources();
    setPreviewAttachment(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  return (
    <View style={styles.wrap} testID="email-attachments-list">
      <View style={styles.header}>
        <Ionicons name="attach-outline" size={16} color={theme.foregroundEyebrow} />
        <Text style={[styles.headerLabel, { color: theme.foregroundEyebrow }]}>
          {t('emailAttachments.title', { count: visible.length })}
        </Text>
      </View>
      <View style={styles.list}>
        {visible.map((attachment) => {
          const parsingThisAttachment =
            summaryHandlers?.isAttachmentParsing?.(attachment.id) ?? false;
          const canParse = !!onSummarizePdf && isParseableDocumentAttachment(attachment);
          const canPreview = isPreviewableAttachment(attachment);
          const showSummary =
            summaryHandlers && isParseableDocumentAttachment(attachment) && attachmentHasSummary(attachment.id, summaryHandlers);
          const attachmentRow = (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => (canPreview ? void openPreview(attachment) : void downloadAttachment(attachment))}
                style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.88 }]}>
                <Ionicons name="document-outline" size={18} color={theme.primary} />
                <View style={styles.copy}>
                  <Text style={[styles.filename, { color: theme.foreground }]} numberOfLines={2}>
                    {attachment.filename}
                  </Text>
                  {attachment.sizeBytes ? (
                    <Text style={[styles.meta, { color: theme.mutedForeground }]}>
                      {formatFileSize(attachment.sizeBytes)}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <View style={styles.actions}>
                {canParse ? (
                  <Pressable
                    {...webHoverTitle(
                      parsingThisAttachment
                        ? t('contractSummary.extracting')
                        : t('contractSummary.summarizeAttachment'),
                    )}
                    accessibilityRole="button"
                    accessibilityLabel={
                      parsingThisAttachment
                        ? t('contractSummary.extracting')
                        : t('contractSummary.summarizeAttachment')
                    }
                    disabled={parsingThisAttachment}
                    hitSlop={8}
                    onPress={() => onSummarizePdf(attachment)}
                    style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.88 }]}>
                    {parsingThisAttachment ? (
                      <ActivityIndicator color={theme.primary} size="small" />
                    ) : (
                      <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
                    )}
                  </Pressable>
                ) : null}
                {canPreview ? (
                  <Pressable
                    {...webHoverTitle(t('emailAttachments.previewTooltip'))}
                    accessibilityRole="button"
                    accessibilityLabel={t('emailAttachments.previewA11y', { filename: attachment.filename })}
                    hitSlop={8}
                    onPress={() => void openPreview(attachment)}
                    style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.88 }]}>
                    <Ionicons name="eye-outline" size={16} color={theme.foregroundEyebrow} />
                  </Pressable>
                ) : null}
                <Pressable
                  {...webHoverTitle(t('emailAttachments.downloadTooltip'))}
                  accessibilityRole="button"
                  accessibilityLabel={t('emailAttachments.downloadA11y', { filename: attachment.filename })}
                  hitSlop={8}
                  onPress={() => void downloadAttachment(attachment)}
                  style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.88 }]}>
                  <Ionicons name="download-outline" size={16} color={theme.foregroundEyebrow} />
                </Pressable>
              </View>
            </>
          );
          return (
            <View key={attachment.id} style={styles.rowWrap}>
              {showSummary ? (
                <View style={[styles.group, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  <View style={styles.rowGrouped}>{attachmentRow}</View>
                  <View style={[styles.summarySlot, { borderTopColor: theme.border }]}>
                    <AttachmentSummaryBlock embedded attachment={attachment} handlers={summaryHandlers} />
                  </View>
                </View>
              ) : (
                <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
                  {attachmentRow}
                </View>
              )}
            </View>
          );
        })}
      </View>
      <EmailAttachmentPreviewModal
        attachment={previewAttachment}
        error={previewError}
        loading={previewLoading}
        previewContent={previewContent}
        onClose={closePreview}
      />
    </View>
  );
}

export function EmailAttachmentBadge({ count }: { count: number }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { borderColor: theme.border, backgroundColor: theme.secondary }]}>
      <Ionicons name="attach-outline" size={12} color={theme.foregroundEyebrow} />
      <Text style={[styles.badgeText, { color: theme.foregroundEyebrow }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerLabel: { fontSize: fontSize.caption, fontWeight: '700' },
  list: { gap: spacing.sm },
  rowWrap: {},
  group: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowGrouped: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 32,
  },
  copy: { flex: 1, gap: 2 },
  filename: { fontSize: fontSize.bodySmall, fontWeight: '600', lineHeight: lineHeight.body },
  meta: { fontSize: fontSize.eyebrow },
  summarySlot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: { fontSize: fontSize.eyebrow, fontWeight: '700' },
});
