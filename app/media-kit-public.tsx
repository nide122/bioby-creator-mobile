import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { MediaKitPreviewSections } from '@/src/components/MediaKitPreviewSections';
import { HubScreen, QueryRetryCard } from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { palette } from '@/constants/tokens';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import { resolveSectionOrderFromDocument } from '@/src/lib/media-kit-sections';
import { mediaKitRatesSyncedFromPackages } from '@/src/lib/media-kit-preview';
import { useMediaKitDocument, useMediaKitPreview } from '@/src/hooks/use-growth';
import { useSessionStore } from '@/src/stores/session-store';

export default function MediaKitPublicScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];

  const kit = useMediaKitPreview();
  const documentQuery = useMediaKitDocument();
  const profile = useSessionStore((s) => s.profileBasics);

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
  const useProfileOverlay = !shouldUseBackendApi();
  const headline =
    useProfileOverlay && profile?.displayName
      ? `${profile.displayName}｜${profile.nicheTags?.slice(0, 2).join(' · ') || profile.niche}`
      : data.headline;
  const bio = useProfileOverlay && profile?.bio ? profile.bio : data.bio;
  const sectionOrder = resolveSectionOrderFromDocument(documentQuery.data);
  const ratesSyncedFromPackages = mediaKitRatesSyncedFromPackages(documentQuery.data);

  return (
    <HubScreen
      eyebrow={t('mediaKitPublicScreen.eyebrow')}
      title={t('mediaKitPublicScreen.title')}
      lead={t('mediaKitPublicScreen.description')}>
      <MediaKitPreviewSections
        data={data}
        headline={headline}
        bio={bio}
        sectionOrder={sectionOrder}
        variant="public"
        useProfileOverlay={useProfileOverlay}
        profile={profile}
        ratesSyncedFromPackages={ratesSyncedFromPackages}
      />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
