import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  HubListRow,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, spacing } from '@/constants/tokens';
import { alertAction } from '@/src/lib/app-dialog';
import { copyTextToClipboard } from '@/src/lib/copy-to-clipboard';
import { isContactUrlCopyable } from '@/src/lib/media-kit-contact-url';
import { resolveSectionOrderFromDocument } from '@/src/lib/media-kit-sections';
import {
  buildMediaKitPdfFilename,
  buildShareHtml,
  buildShareMessage,
  shareMediaKitPdf,
} from '@/src/lib/media-kit-share';
import { useMediaKitDocument, useMediaKitPreview } from '@/src/hooks/use-growth';

export default function MediaKitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const [sharingPdf, setSharingPdf] = useState(false);

  const kit = useMediaKitPreview();
  const documentQuery = useMediaKitDocument();

  if (kit.isPending || documentQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('mediaKitScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (kit.error || !kit.data) {
    const msg = kit.error?.message ?? t('mediaKitScreen.emptyDataFallback');
    return (
      <PlaceholderScreen
        title={t('mediaKitScreen.loadFailedTitle')}
        description={t('mediaKitScreen.retryDesc')}>
        <QueryRetryCard
          message={msg}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['growth', 'media-kit'] })}
        />
      </PlaceholderScreen>
    );
  }

  const data = kit.data;
  const shareCopy = buildShareMessage(data, data.headline, data.bio, t('mediaKitScreen.signatureFooter'), t);
  const sectionOrder = resolveSectionOrderFromDocument(documentQuery.data);

  const sharePublicProfile = async () => {
    if (sharingPdf) return;
    setSharingPdf(true);
    try {
      const html = buildShareHtml(data, data.headline, data.bio, t('mediaKitScreen.signatureFooter'), sectionOrder, t);
      await shareMediaKitPdf({
        html,
        filename: buildMediaKitPdfFilename(data.headline),
        dialogTitle: t('mediaKitScreen.shareSheetTitle'),
      });
    } catch {
      void alertAction(t('mediaKitScreen.shareFailTitle'), t('mediaKitScreen.shareFailDesc'));
    } finally {
      setSharingPdf(false);
    }
  };

  const copyContactUrl = async () => {
    const url = data.contactUrl;
    if (!url) return;
    try {
      await copyTextToClipboard(url);
      void alertAction(t('mediaKitScreen.linkCopiedTitle'), t('mediaKitScreen.linkCopiedDesc'));
    } catch {
      void alertAction(t('mediaKitScreen.linkCopyFailTitle'), t('mediaKitScreen.linkCopyFailDesc'));
    }
  };

  const copyFullText = async () => {
    try {
      await copyTextToClipboard(shareCopy);
      void alertAction(t('mediaKitScreen.fullTextCopiedTitle'), t('mediaKitScreen.fullTextCopiedDesc'));
    } catch {
      void alertAction(t('mediaKitScreen.linkCopyFailTitle'), t('mediaKitScreen.linkCopyFailDesc'));
    }
  };

  const canCopyContactUrl = isContactUrlCopyable(data.contactUrl);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        testID="screen-media-kit"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: theme.mutedForeground }]}>{t('mediaKitScreen.description')}</Text>

        <SettingsGroup>
          <HubListRow
            icon="create-outline"
            title={t('mediaKitScreen.ctaEdit')}
            subtitle={t('mediaKitScreen.ctaEditHint')}
            onPress={() => router.push('/media-kit-edit' as Href)}
          />
          <HubListRow
            icon="eye-outline"
            title={t('mediaKitScreen.ctaPublicPreview')}
            subtitle={t('mediaKitScreen.ctaPublicPreviewHint')}
            onPress={() => router.push('/media-kit-public' as Href)}
          />
          {canCopyContactUrl ? (
            <HubListRow
              icon="link-outline"
              title={t('mediaKitScreen.copyLink')}
              subtitle={t('mediaKitScreen.copyLinkHint')}
              onPress={() => void copyContactUrl()}
            />
          ) : (
            <HubListRow
              icon="person-outline"
              title={t('mediaKitScreen.contactUrlProfileCta')}
              subtitle={t('mediaKitScreen.contactUrlProfileHint')}
              onPress={() => router.push('/settings/profile' as Href)}
            />
          )}
          <HubListRow
            icon="share-outline"
            title={t('mediaKitScreen.ctaShareFullKit')}
            subtitle={
              sharingPdf ? t('mediaKitScreen.ctaShareFullKitGenerating') : t('mediaKitScreen.ctaShareFullKitHint')
            }
            onPress={() => void sharePublicProfile()}
          />
          <HubListRow
            icon="mail-outline"
            title={t('mediaKitScreen.ctaEmailSignature')}
            subtitle={t('mediaKitScreen.ctaEmailSignatureHint')}
            onPress={() => void copyFullText()}
          />
          <HubListRow
            icon="shield-checkmark-outline"
            title={t('mediaKitScreen.ctaFulfillmentAppendix')}
            subtitle={t('mediaKitScreen.ctaFulfillmentAppendixHint')}
            onPress={() => router.push('/trust-passport' as Href)}
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: layout.tabBarScrollInset,
    gap: spacing.lg,
  },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.bodyRelaxed },
});
