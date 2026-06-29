import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import type { EmailAttachment } from '@/src/api/mailbox-api';
import type { AttachmentPreviewContent } from '@/src/lib/email-attachment-preview-content';

type Props = {
  attachment: EmailAttachment | null;
  previewContent: AttachmentPreviewContent | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function EmailAttachmentPreviewModal({
  attachment,
  previewContent,
  loading,
  error,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { width, height } = useWindowDimensions();
  const visible = !!attachment;
  const previewHeight = height * 0.72;

  const renderPdfPreview = (previewUri: string) => {
    if (Platform.OS === 'web') {
      return createElement(
        'div',
        {
          style: {
            border: 'none',
            borderRadius: radii.md,
            height: previewHeight,
            overflow: 'hidden',
            width: '100%',
          },
        },
        createElement('embed', {
          src: previewUri,
          type: 'application/pdf',
          title: attachment?.filename ?? 'preview',
          style: {
            border: 'none',
            height: '100%',
            width: '100%',
          },
        }),
      );
    }
    const baseUrl =
      previewUri.lastIndexOf('/') >= 0 ? previewUri.slice(0, previewUri.lastIndexOf('/') + 1) : undefined;
    return (
      <WebView
        allowFileAccess
        allowFileAccessFromFileURLs
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        source={{
          baseUrl,
          html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;padding:0;overflow:hidden;background:#111;"><embed src="${previewUri}" type="application/pdf" width="100%" height="100%" style="border:0;display:block;" /></body></html>`,
        }}
        style={{ flex: 1, minHeight: previewHeight }}
      />
    );
  };

  const renderHtmlPreview = (html: string) => {
    if (Platform.OS === 'web') {
      return createElement('iframe', {
        srcDoc: html,
        title: attachment?.filename ?? 'preview',
        sandbox: 'allow-same-origin',
        style: {
          border: 'none',
          borderRadius: radii.md,
          height: previewHeight,
          width: '100%',
          backgroundColor: '#fff',
        },
      });
    }
    return (
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, minHeight: previewHeight, backgroundColor: '#fff' }}
      />
    );
  };

  const renderTextPreview = (text: string) => (
    <ScrollView
      style={{ maxHeight: previewHeight }}
      contentContainerStyle={styles.textScrollContent}
      nestedScrollEnabled>
      <Text selectable style={[styles.textPreview, { color: theme.foreground }]}>
        {text}
      </Text>
    </ScrollView>
  );

  const renderBody = () => {
    if (!previewContent) return null;
    switch (previewContent.mode) {
      case 'pdf':
        return previewContent.uri ? renderPdfPreview(previewContent.uri) : null;
      case 'image':
        if (!previewContent.uri) return null;
        if (Platform.OS === 'web') {
          return createElement('img', {
            src: previewContent.uri,
            alt: attachment?.filename ?? '',
            style: {
              maxHeight: previewHeight,
              maxWidth: '100%',
              objectFit: 'contain',
            },
          });
        }
        return (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: previewContent.uri }}
            resizeMode="contain"
            style={{ width: '100%', height: previewHeight }}
          />
        );
      case 'html-document':
      case 'spreadsheet':
        return previewContent.html ? renderHtmlPreview(previewContent.html) : null;
      case 'text':
        return previewContent.text ? renderTextPreview(previewContent.text) : null;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('emailAttachments.previewCloseA11y')}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              maxHeight: height * 0.92,
              width: Math.min(width * 0.96, 960),
            },
          ]}
          pointerEvents="box-none">
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.foreground }]} numberOfLines={2}>
              {attachment?.filename ?? ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('emailAttachments.previewCloseA11y')}
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.88 }]}>
              <Ionicons name="close" size={20} color={theme.foreground} />
            </Pressable>
          </View>
          <View style={styles.body}>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={[styles.hint, { color: theme.mutedForeground }]}>
                  {t('emailAttachments.previewLoading')}
                </Text>
              </View>
            ) : null}
            {!loading && error ? (
              <View style={styles.centered}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            {!loading && !error && previewContent ? renderBody() : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.bodySmall,
    fontWeight: '600',
    lineHeight: lineHeight.body,
  },
  closeButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  body: {
    minHeight: 280,
    padding: spacing.md,
  },
  centered: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 240,
    paddingHorizontal: spacing.lg,
  },
  hint: {
    fontSize: fontSize.bodySmall,
    textAlign: 'center',
  },
  error: {
    color: '#F87171',
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
    textAlign: 'center',
  },
  textScrollContent: {
    paddingBottom: spacing.md,
  },
  textPreview: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
});

