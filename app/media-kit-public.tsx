import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { MediaKitPreviewSections } from '@/src/components/MediaKitPreviewSections';
import { HubScreen, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { resolveSectionOrderFromDocument } from '@/src/lib/media-kit-sections';
import { mediaKitRatesSyncedFromPackages } from '@/src/lib/media-kit-preview';
import { useMediaKitDocument, useMediaKitPreview } from '@/src/hooks/use-growth';

export default function MediaKitPublicScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const kit = useMediaKitPreview();
  const documentQuery = useMediaKitDocument();

  if (kit.isPending || documentQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('mediaKitPublicScreen.loadingA11y')} color={theme.primary} />
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
  const sectionOrder = resolveSectionOrderFromDocument(documentQuery.data);
  const ratesSyncedFromPackages = mediaKitRatesSyncedFromPackages(documentQuery.data);

  return (
    <HubScreen
      eyebrow={t('mediaKitPublicScreen.eyebrow')}
      title={t('mediaKitPublicScreen.title')}
      lead={t('mediaKitPublicScreen.description')}>
      <MediaKitPreviewSections
        data={data}
        headline={data.headline}
        bio={data.bio}
        sectionOrder={sectionOrder}
        variant="public"
        ratesSyncedFromPackages={ratesSyncedFromPackages}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
