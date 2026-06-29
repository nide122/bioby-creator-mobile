import Ionicons from '@expo/vector-icons/Ionicons';
import { createElement, useEffect } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, lineHeight, palette, spacing } from '@/constants/tokens';

const ERROR_TEXT_COLOR = '#F87171';

type Props = {
  src: string | null;
  error?: string | null;
  onClose: () => void;
};

export function EmailInlineImageViewer({ src, error = null, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const { width, height } = useWindowDimensions();
  const visible = !!src || !!error;

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
          accessibilityLabel={t('inboxMessageDetail.inlineImagePreviewCloseA11y')}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.container} pointerEvents="box-none">
          {error ? (
            <View style={styles.errorPanel}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('inboxMessageDetail.inlineImagePreviewCloseA11y')}
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="close" size={20} color={theme.foreground} />
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('inboxMessageDetail.inlineImagePreviewCloseA11y')}
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="close" size={20} color={theme.foreground} />
                </Pressable>
              </View>
              <View
                accessibilityLabel={t('inboxMessageDetail.inlineImagePreviewA11y')}
                style={styles.stage}
                pointerEvents="box-none">
                {src ? (
                  Platform.OS === 'web' ? (
                    createElement('img', {
                      src,
                      alt: '',
                      style: {
                        maxHeight: height * 0.82,
                        maxWidth: width * 0.94,
                        objectFit: 'contain',
                        width: 'auto',
                        height: 'auto',
                      },
                    })
                  ) : (
                    <Image
                      accessibilityIgnoresInvertColors
                      source={{ uri: src }}
                      resizeMode="contain"
                      style={{
                        width: width * 0.94,
                        height: height * 0.82,
                      }}
                    />
                  )
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: '100%',
    maxWidth: '100%',
    width: '100%',
  },
  errorPanel: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
    width: '100%',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  errorText: {
    color: ERROR_TEXT_COLOR,
    fontSize: fontSize.body,
    lineHeight: lineHeight.bodyRelaxed,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
});
