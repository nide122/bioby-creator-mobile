import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { spacing } from '@/constants/tokens';
import { ApiError } from '@/src/api/api-client';
import { generateCreatorProfileSummary } from '@/src/api/creator-profile-generate-summary';
import { resolveCreatorProfileFromUrl } from '@/src/api/creator-profile-resolve';
import { canGenerateProfileSummary } from '@/src/api/mock-creator-profile-summary';
import {
  buildCreatorProfileBasics,
  buildProfileFactsSnapshot,
  isSummaryComplete,
  isSummaryEmpty,
  mergeSummarySuggestion,
  migrateLegacyProfileBasics,
  platformSlotFromResolved,
  prefillSummaryIfEmpty,
  summariesEqual,
  syncPlatformsList,
  listConnectedPlatformStatLines,
  listConnectedPresetPlatformKeys,
  validatePlatformUrl,
} from '@/src/lib/creator-profile-aggregate';
import { isProfileAiPromptDismissed } from '@/src/lib/creator-profile-ai-prefs';
import { useCountdown } from '@/src/hooks/use-countdown';
import { alertAction, confirmAction } from '@/src/lib/app-dialog';
import { parseProfileSummaryRateLimitCooldown } from '@/src/lib/format-cooldown-label';
import { resolveLanguagePreference, useLocaleStore } from '@/src/stores/locale-store';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import {
  PRESET_PLATFORM_KEYS,
  PRESET_TO_SOCIAL_KEY,
  type CreatorProfileSummary,
  type PresetPlatformKey,
  type SummaryAdoptOptions,
  type SummarySuggestion,
} from '@/src/types/creator-profile';

import { CreatorProfileSummarySection } from './CreatorProfileSummarySection';
import { CreatorProfileSummarySuggestionSheet } from './CreatorProfileSummarySuggestionSheet';
import { PlatformProfileCard } from './PlatformProfileCard';
import { PlatformProfileTabs } from './PlatformProfileTabs';

export type CreatorProfileEditorState = {
  payload: CreatorProfileBasics;
  canSubmit: boolean;
};

type Props = {
  testIdPrefix: string;
  profileBasics: CreatorProfileBasics | null;
  pendingDisplayName?: string | null;
  onStateChange: (state: CreatorProfileEditorState) => void;
};

function createDraftUrls(
  profiles: Record<PresetPlatformKey, import('@/src/types/creator-profile').CreatorPlatformProfile>,
): Record<PresetPlatformKey, string> {
  return {
    youtube: profiles.youtube.profileUrl ?? '',
    tiktok: profiles.tiktok.profileUrl ?? '',
    instagram: profiles.instagram.profileUrl ?? '',
  };
}

function formatAiGenerateErrorMessage(error: unknown, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (error instanceof ApiError && error.code === 'GENERATE_SUMMARY_ENDPOINT_MISSING') {
    return t('creatorProfileEditor.aiGenerateEndpointMissing');
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t('creatorProfileEditor.aiGenerateErrorFallback');
}

export function CreatorProfileEditor({
  testIdPrefix,
  profileBasics,
  pendingDisplayName,
  onStateChange,
}: Props) {
  const { t, i18n } = useTranslation();
  const languagePreference = useLocaleStore((state) => state.languagePreference);
  const locale = resolveLanguagePreference(languagePreference);

  const migrated = useMemo(
    () => migrateLegacyProfileBasics(profileBasics, pendingDisplayName),
    [pendingDisplayName, profileBasics],
  );

  const [activePlatform, setActivePlatform] = useState<PresetPlatformKey>('youtube');
  const [platformProfiles, setPlatformProfiles] = useState(migrated.platformProfiles);
  const [summary, setSummary] = useState(migrated.summary);
  const [draftUrls, setDraftUrls] = useState(() => createDraftUrls(migrated.platformProfiles));
  const [editingPlatform, setEditingPlatform] = useState<PresetPlatformKey | null>(null);
  const [resolvingPlatform, setResolvingPlatform] = useState<PresetPlatformKey | null>(null);
  const [refreshingPlatform, setRefreshingPlatform] = useState<PresetPlatformKey | null>(null);
  const [errors, setErrors] = useState<Record<PresetPlatformKey, string | null>>({
    youtube: null,
    tiktok: null,
    instagram: null,
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [rateLimitCooldownSeed, setRateLimitCooldownSeed] = useState<{
    seconds: number;
    nonce: number;
  } | null>(null);
  const rateLimitCooldownSeconds = useCountdown(
    rateLimitCooldownSeed?.seconds ?? null,
    rateLimitCooldownSeed?.nonce ?? 0,
  );
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const [suggestion, setSuggestion] = useState<SummarySuggestion | null>(null);
  const [summaryEditedByUser, setSummaryEditedByUser] = useState(false);
  const baselineSummaryRef = useRef(migrated.summary);

  useEffect(() => {
    setPlatformProfiles(migrated.platformProfiles);
    setSummary(migrated.summary);
    setDraftUrls(createDraftUrls(migrated.platformProfiles));
    setEditingPlatform(null);
    setErrors({ youtube: null, tiktok: null, instagram: null });
    baselineSummaryRef.current = migrated.summary;
    setSummaryEditedByUser(false);
  }, [migrated]);

  const connectedPlatforms = useMemo(
    () => PRESET_PLATFORM_KEYS.filter((key) => platformProfiles[key].status !== 'empty'),
    [platformProfiles],
  );

  const connectedPlatformsLabel = useMemo(
    () => syncPlatformsList(platformProfiles).join(' · '),
    [platformProfiles],
  );

  const platformStatLines = useMemo(
    () => listConnectedPlatformStatLines(platformProfiles),
    [platformProfiles],
  );

  const canGenerateAi = useMemo(
    () => canGenerateProfileSummary(platformProfiles),
    [platformProfiles],
  );

  const payload = useMemo(
    () => buildCreatorProfileBasics({ summary, platformProfiles }),
    [platformProfiles, summary],
  );

  const canSubmitFixed = useMemo(
    () => isSummaryComplete(summary) || connectedPlatforms.length > 0,
    [connectedPlatforms.length, summary],
  );

  useEffect(() => {
    onStateChange({ payload, canSubmit: canSubmitFixed });
  }, [canSubmitFixed, onStateChange, payload]);

  type SummaryUpdater = CreatorProfileSummary | ((prev: CreatorProfileSummary) => CreatorProfileSummary);

  const updateSummary = useCallback((updater: SummaryUpdater) => {
    setSummary((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!summariesEqual(next, baselineSummaryRef.current)) {
        setSummaryEditedByUser(true);
      }
      return next;
    });
  }, []);

  const buildFactsSnapshot = useCallback(
    () =>
      buildProfileFactsSnapshot({
        summary,
        platformProfiles,
        locale: i18n.language || locale,
      }),
    [i18n.language, locale, platformProfiles, summary],
  );

  const openSuggestionSheet = useCallback(async () => {
    if (!canGenerateAi || rateLimitCooldownSeconds != null) return;
    setSuggestionVisible(true);
    setGeneratingSummary(true);
    setSuggestion(null);
    try {
      const result = await generateCreatorProfileSummary(buildFactsSnapshot());
      setSuggestion(result);
    } catch (error) {
      setSuggestionVisible(false);
      const cooldown = parseProfileSummaryRateLimitCooldown(error);
      if (cooldown != null) {
        setRateLimitCooldownSeed({ seconds: cooldown, nonce: Date.now() });
        return;
      }
      const message = formatAiGenerateErrorMessage(error, t);
      await alertAction(t('creatorProfileEditor.aiGenerateErrorTitle'), message);
    } finally {
      setGeneratingSummary(false);
    }
  }, [buildFactsSnapshot, canGenerateAi, rateLimitCooldownSeconds, t]);

  const maybePromptAfterLookup = useCallback(
    async (nextSummary: typeof summary, connectedCount: number) => {
      if (!canGenerateProfileSummary(platformProfiles)) return;
      if (!isSummaryEmpty(nextSummary)) return;
      if (summaryEditedByUser) return;
      if (await isProfileAiPromptDismissed()) return;

      const isSecondPlatform = connectedCount >= 2;
      const confirmed = await confirmAction({
        title: t('creatorProfileEditor.aiPromptTitle'),
        message: isSecondPlatform
          ? t('creatorProfileEditor.aiPromptMessageMulti')
          : t('creatorProfileEditor.aiPromptMessageSingle'),
        confirmLabel: t('creatorProfileEditor.aiPromptConfirm'),
        cancelLabel: t('creatorProfileEditor.aiPromptCancel'),
      });
      if (!confirmed) return;
      await openSuggestionSheet();
    },
    [openSuggestionSheet, platformProfiles, summaryEditedByUser, t],
  );

  const updateDraftUrl = useCallback((platform: PresetPlatformKey, value: string) => {
    setDraftUrls((current) => ({ ...current, [platform]: value }));
    setErrors((current) => ({ ...current, [platform]: null }));
  }, []);

  const resolvePlatform = useCallback(
    async (platform: PresetPlatformKey, url: string, mode: 'lookup' | 'refresh') => {
      const trimmed = url.trim();
      if (trimmed.length < 6) {
        setErrors((current) => ({
          ...current,
          [platform]: 'Paste a full profile URL for this platform.',
        }));
        return;
      }

      if (!validatePlatformUrl(trimmed, platform)) {
        setErrors((current) => ({
          ...current,
          [platform]: `This link does not look like a ${platform} profile URL.`,
        }));
        return;
      }

      if (mode === 'lookup') setResolvingPlatform(platform);
      else setRefreshingPlatform(platform);

      setErrors((current) => ({ ...current, [platform]: null }));

      try {
        const resolved = await resolveCreatorProfileFromUrl(trimmed, PRESET_TO_SOCIAL_KEY[platform]);
        setPlatformProfiles((current) => {
          const nextProfiles = {
            ...current,
            [platform]: platformSlotFromResolved(platform, resolved),
          };
          if (mode === 'lookup') {
            setSummary((prevSummary) => {
              const nextSummary = prefillSummaryIfEmpty(prevSummary, resolved);
              void maybePromptAfterLookup(
                nextSummary,
                listConnectedPresetPlatformKeys(nextProfiles).length,
              );
              return nextSummary;
            });
          }
          return nextProfiles;
        });
        setDraftUrls((current) => ({ ...current, [platform]: resolved.canonicalUrl }));
        setEditingPlatform(null);
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [platform]: error instanceof Error ? error.message : 'We could not read this profile yet.',
        }));
      } finally {
        setResolvingPlatform(null);
        setRefreshingPlatform(null);
      }
    },
    [maybePromptAfterLookup],
  );

  const handleAdoptSuggestion = useCallback(
    (options: SummaryAdoptOptions) => {
      if (!suggestion) return;
      updateSummary((prev) => mergeSummarySuggestion(prev, suggestion, options));
      setSuggestionVisible(false);
      setSuggestion(null);
    },
    [suggestion, updateSummary],
  );

  const activeSlot = platformProfiles[activePlatform];
  const activeDraftUrl = draftUrls[activePlatform];
  const activeCanResolve =
    activeDraftUrl.trim().length >= 6 && resolvingPlatform !== activePlatform;

  return (
    <View style={styles.wrap} testID={`${testIdPrefix}-editor`}>
      <PlatformProfileTabs
        value={activePlatform}
        connectedPlatforms={connectedPlatforms}
        onChange={setActivePlatform}
      />

      <PlatformProfileCard
        platform={activePlatform}
        slot={activeSlot}
        isEditing={editingPlatform === activePlatform}
        profileUrl={activeDraftUrl}
        resolving={resolvingPlatform === activePlatform}
        refreshing={refreshingPlatform === activePlatform}
        error={errors[activePlatform]}
        canResolve={activeCanResolve}
        testIdPrefix={testIdPrefix}
        onChangeUrl={(value) => updateDraftUrl(activePlatform, value)}
        onResolve={() => void resolvePlatform(activePlatform, activeDraftUrl, 'lookup')}
        onEdit={() => {
          setEditingPlatform(activePlatform);
          setDraftUrls((current) => ({
            ...current,
            [activePlatform]: platformProfiles[activePlatform].profileUrl ?? current[activePlatform],
          }));
          setErrors((current) => ({ ...current, [activePlatform]: null }));
        }}
        onRefresh={() => {
          const url = platformProfiles[activePlatform].profileUrl ?? activeDraftUrl;
          void resolvePlatform(activePlatform, url, 'refresh');
        }}
      />

      <CreatorProfileSummarySection
        summary={summary}
        connectedPlatformsLabel={connectedPlatformsLabel}
        platformStatLines={platformStatLines}
        testIdPrefix={testIdPrefix}
        canGenerateAi={canGenerateAi}
        generatingAi={generatingSummary}
        rateLimitCooldownSeconds={rateLimitCooldownSeconds}
        onGenerateAi={() => void openSuggestionSheet()}
        onChangeSummary={updateSummary}
      />

      <CreatorProfileSummarySuggestionSheet
        visible={suggestionVisible}
        current={summary}
        suggestion={suggestion}
        generating={generatingSummary}
        onDismiss={() => {
          setSuggestionVisible(false);
          setSuggestion(null);
        }}
        onAdopt={handleAdoptSuggestion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
});
