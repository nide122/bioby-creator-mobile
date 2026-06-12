import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { MediaKitPreviewSections } from '@/src/components/MediaKitPreviewSections';
import { HubScreen, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { usePublicMediaKit } from '@/src/hooks/use-public-media-kit';
import { resolveSectionOrder } from '@/src/lib/media-kit-sections';

export default function PublicMediaKitBySlugScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
  const query = usePublicMediaKit(normalizedSlug);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  if (!normalizedSlug) {
    return (
      <PlaceholderScreen
        title={t('mediaKitPublicSlug.notFoundTitle')}
        description={t('mediaKitPublicSlug.notFoundDesc')}
      />
    );
  }

  if (query.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator accessibilityLabel={t('mediaKitPublicScreen.loadingA11y')} color={theme.primary} />
      </View>
    );
  }

  if (query.error || !query.data) {
    const isNotFound = query.error && 'status' in query.error && query.error.status === 404;
    return (
      <PlaceholderScreen
        title={isNotFound ? t('mediaKitPublicSlug.notFoundTitle') : t('mediaKitScreen.loadFailedTitle')}
        description={isNotFound ? t('mediaKitPublicSlug.notFoundDesc') : t('mediaKitScreen.retryDesc')}>
        {!isNotFound ? (
          <QueryRetryCard
            message={query.error?.message ?? t('mediaKitScreen.emptyDataFallback')}
            onRetry={() => query.refetch()}
          />
        ) : null}
      </PlaceholderScreen>
    );
  }

  const { preview, sectionOrder } = query.data;

  return (
    <HubScreen
      eyebrow={t('mediaKitPublicScreen.eyebrow')}
      title={t('mediaKitPublicScreen.title')}
      lead={t('mediaKitPublicScreen.description')}>
      <MediaKitPreviewSections
        data={preview}
        headline={preview.headline}
        bio={preview.bio}
        sectionOrder={resolveSectionOrder(sectionOrder)}
        variant="public"
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
