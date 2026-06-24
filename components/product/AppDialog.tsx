import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { elevation, fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import appI18n from '@/src/i18n';
import {
  registerAppDialog,
  unregisterAppDialog,
  type AlertDialogOptions,
  type ConfirmDialogOptions,
} from '@/src/lib/app-dialog';

type DialogRequest =
  | ({ variant: 'confirm' } & ConfirmDialogOptions & { resolve: (confirmed: boolean) => void })
  | ({ variant: 'alert' } & AlertDialogOptions & { resolve: () => void });

function AppDialogCard({
  request,
  onDismiss,
  onConfirm,
}: {
  request: DialogRequest;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const destructive = request.variant === 'confirm' && request.destructive;
  const confirmLabel =
    request.variant === 'confirm' ? request.confirmLabel : (request.dismissLabel ?? appI18n.t('common.ok'));

  return (
    <View style={styles.backdrop}>
      <Pressable
        accessibilityRole="none"
        accessibilityLabel={appI18n.t('common.dismissDialog')}
        style={styles.backdropHit}
        onPress={onDismiss}
      />
      <View
        style={[
          styles.card,
          elevation.surface,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}>
        <Text style={[styles.title, { color: theme.foreground }]}>{request.title}</Text>
        <Text style={[styles.message, { color: theme.mutedForeground }]}>{request.message}</Text>
        <View style={styles.actions}>
          {request.variant === 'confirm' ? (
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={[styles.secondaryButton, { borderColor: theme.border }]}>
              <Text style={[styles.secondaryLabel, { color: theme.foreground }]}>{request.cancelLabel}</Text>
            </Pressable>
          ) : null}
          <View style={styles.actionsSpacer} />
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={[
              styles.primaryButton,
              destructive
                ? { backgroundColor: '#EF4444' }
                : { backgroundColor: theme.primary },
            ]}>
            <Text
              style={[
                styles.primaryLabel,
                { color: destructive ? '#FFFFFF' : theme.primaryForeground },
              ]}>
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function AppDialogHost({ children }: PropsWithChildren) {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const dismiss = useCallback(
    (confirmed: boolean) => {
      if (!request) return;
      if (request.variant === 'confirm') {
        request.resolve(confirmed);
      } else {
        request.resolve();
      }
      setRequest(null);
    },
    [request]
  );

  useEffect(() => {
    registerAppDialog({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          setRequest({ variant: 'confirm', ...options, resolve });
        }),
      alert: (options) =>
        new Promise<void>((resolve) => {
          setRequest({ variant: 'alert', ...options, resolve });
        }),
    });
    return unregisterAppDialog;
  }, []);

  return (
    <>
      {children}
      <Modal
        visible={request != null}
        transparent
        animationType="fade"
        onRequestClose={() => dismiss(false)}>
        {request ? (
          <AppDialogCard
            request={request}
            onDismiss={() => dismiss(false)}
            onConfirm={() => dismiss(true)}
          />
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: 'rgba(5, 7, 6, 0.72)',
  },
  backdropHit: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  title: {
    fontSize: fontSize.cardTitle,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: lineHeight.lead,
  },
  message: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.bodyRelaxed,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    width: '100%',
  },
  actionsSpacer: { flex: 1 },
  primaryButton: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  secondaryLabel: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
