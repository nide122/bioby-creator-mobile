import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import { downloadEmailAttachment } from '@/src/api/mailbox-api';
import { dedupeVisibleAttachments, isPdfAttachment } from '@/components/mail/email-attachment-utils';

type Props = {
  messageId: string;
  attachments: EmailAttachment[];
  onSummarizePdf?: (attachment: EmailAttachment) => void;
  summarizingAttachmentId?: string | null;
};

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailAttachmentsList({
  messageId,
  attachments,
  onSummarizePdf,
  summarizingAttachmentId,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const visible = dedupeVisibleAttachments(attachments);

  if (visible.length === 0) {
    return null;
  }

  const openAttachment = async (attachment: EmailAttachment) => {
    try {
      const blob = await downloadEmailAttachment(messageId, attachment.id);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }
      const base64 = await blobToBase64(blob);
      const uri = `${FileSystem.cacheDirectory}${sanitizeFilename(attachment.filename)}`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
        return;
      }
      await Linking.openURL(uri);
    } catch {
      // Surface errors via future toast; keep UI stable for now.
    }
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
        {visible.map((attachment) => (
          <View key={attachment.id} style={styles.rowWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void openAttachment(attachment)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: theme.border, backgroundColor: theme.secondary },
                pressed && { opacity: 0.88 },
              ]}>
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
              <Ionicons name="download-outline" size={16} color={theme.foregroundEyebrow} />
            </Pressable>
            {onSummarizePdf && isPdfAttachment(attachment) ? (
              <Pressable
                accessibilityRole="button"
                disabled={summarizingAttachmentId === attachment.id}
                onPress={() => onSummarizePdf(attachment)}
                style={({ pressed }) => [
                  styles.summarizeButton,
                  { borderColor: theme.border, backgroundColor: theme.background },
                  pressed && { opacity: 0.88 },
                ]}>
                <Ionicons name="sparkles-outline" size={14} color={theme.primary} />
                <Text style={[styles.summarizeLabel, { color: theme.primary }]}>
                  {summarizingAttachmentId === attachment.id
                    ? t('contractSummary.extracting')
                    : t('contractSummary.summarizeAttachment')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
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
  list: { gap: spacing.xs },
  rowWrap: { gap: spacing.xs },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: { flex: 1, gap: 2 },
  filename: { fontSize: fontSize.bodySmall, fontWeight: '600', lineHeight: lineHeight.body },
  meta: { fontSize: fontSize.eyebrow },
  summarizeButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  summarizeLabel: { fontSize: fontSize.eyebrow, fontWeight: '700' },
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

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, '_').trim() || 'attachment';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
