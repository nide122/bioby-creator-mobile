import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import {
  Badge,
  getTextInputProps,
  getTextInputStyle,
  HubListRow,
  HubScreen,
  HubStaticRow,
  QueryRetryCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import { PlatformIcon } from '@/src/components/PlatformIcon';
import {
  CONTENT_FORMAT_KEYS,
  createPlatformRateId,
  ensurePlatformRates,
  formatI18nKey,
  PLATFORM_RATE_SUGGESTIONS,
} from '@/src/lib/media-kit-formats';
import { useMediaKitDocument, useUpsertMediaKitDocument } from '@/src/hooks/use-growth';
import { useBattleReports } from '@/src/hooks/use-battle-reports';
import { usePublicProofCatalog } from '@/src/hooks/use-trust-metrics';
import {
  dedupePublicProofCatalog,
  localizePublicProofItem,
  publicProofToggleHint,
} from '@/src/lib/public-proof';
import {
  DEFAULT_MEDIA_KIT_SECTION_ORDER,
  moveSectionOrder,
  resolveSectionOrder,
} from '@/src/lib/media-kit-sections';
import type {
  MediaKitCaseCard,
  MediaKitDocument,
  MediaKitHeroStat,
  MediaKitPlatformRow,
  MediaKitSectionId,
  PlatformRateEntry,
} from '@/src/types/domain';

function createCaseId(): string {
  return `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createManualCase(): MediaKitCaseCard {
  return {
    id: createCaseId(),
    title: '',
    industry: '',
    outcomeNote: '',
    resultSummary: '',
  };
}

function normalizeCases(rows: MediaKitCaseCard[]): MediaKitCaseCard[] {
  return rows
    .filter((row) => row.title.trim())
    .map((row) => ({
      id: row.id,
      title: row.title.trim(),
      industry: row.industry.trim(),
      outcomeNote: row.outcomeNote.trim(),
      resultSummary: row.resultSummary?.trim() || undefined,
    }));
}

function splitCsv(value: string): string[] {
  return value
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureHeroStats(stats: MediaKitHeroStat[] | undefined): MediaKitHeroStat[] {
  const rows = [...(stats ?? [])];
  while (rows.length < 3) {
    rows.push({ label: '', value: '' });
  }
  return rows.slice(0, 3);
}

function createEmptyPlatform(): MediaKitPlatformRow {
  return { name: '', followersRange: '', nicheNote: '' };
}

/** At least one editable row; no fixed upper cap. */
function ensurePlatforms(platforms: MediaKitPlatformRow[] | undefined): MediaKitPlatformRow[] {
  const rows = [...(platforms ?? [])];
  return rows.length > 0 ? rows : [createEmptyPlatform()];
}

type MediaKitEditSectionId =
  | 'platformRates'
  | 'contact'
  | 'tags'
  | 'stats'
  | 'audience'
  | 'channels'
  | 'trustProof'
  | 'cases'
  | 'layout'
  | 'sync';

function truncateText(value: string, max = 72): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function joinSummary(parts: string[], separator = ' · '): string | undefined {
  const line = parts.map((part) => part.trim()).filter(Boolean).join(separator);
  return line || undefined;
}

function toggleEditSection(
  sections: Set<MediaKitEditSectionId>,
  sectionId: MediaKitEditSectionId
): Set<MediaKitEditSectionId> {
  const next = new Set(sections);
  if (next.has(sectionId)) next.delete(sectionId);
  else next.add(sectionId);
  return next;
}

function expandEditSection(
  sections: Set<MediaKitEditSectionId>,
  sectionId: MediaKitEditSectionId
): Set<MediaKitEditSectionId> {
  const next = new Set(sections);
  next.add(sectionId);
  return next;
}

export default function MediaKitEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const assetsNav = useAssetsHubNavigation();
  const queryClient = useQueryClient();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = palette[colorScheme];
  const insets = useSafeAreaInsets();
  /** Clearance above the system home/gesture bar (insets can be 0 on first frame). */
  const floatingBottom = useMemo(() => {
    if (Platform.OS === 'web') return spacing.md;
    const initialBottom = initialWindowMetrics?.insets.bottom ?? 0;
    const fromContext = Math.max(insets.bottom, initialBottom);
    const systemBarFallback = Platform.OS === 'ios' ? 34 : 24;
    return Math.max(fromContext, systemBarFallback) + spacing.sm;
  }, [insets.bottom]);
  const scrollBottomInset = layout.touchMin + spacing.md + floatingBottom;

  const documentQuery = useMediaKitDocument();
  const saveMutation = useUpsertMediaKitDocument();
  const battleReports = useBattleReports();
  const publicProofCatalog = usePublicProofCatalog();

  const [aboutTagsText, setAboutTagsText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [heroStats, setHeroStats] = useState<MediaKitHeroStat[]>(ensureHeroStats([]));
  const [topLocations, setTopLocations] = useState('');
  const [genderAge, setGenderAge] = useState('');
  const [postingCadence, setPostingCadence] = useState('');
  const [platforms, setPlatforms] = useState<MediaKitPlatformRow[]>(ensurePlatforms([]));
  const [partnershipsText, setPartnershipsText] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [inviteCta, setInviteCta] = useState('');
  const [platformRates, setPlatformRates] = useState<PlatformRateEntry[]>(ensurePlatformRates([]));
  const [expandedPlatformRateId, setExpandedPlatformRateId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<MediaKitEditSectionId>>(() => new Set());
  const [expandedChannelIndex, setExpandedChannelIndex] = useState<number | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [syncRateCards, setSyncRateCards] = useState(false);
  const [syncBattleReports, setSyncBattleReports] = useState(true);
  const [cases, setCases] = useState<MediaKitCaseCard[]>([]);
  const [sectionOrder, setSectionOrder] = useState<MediaKitSectionId[]>([...DEFAULT_MEDIA_KIT_SECTION_ORDER]);
  const [enabledPublicProofIds, setEnabledPublicProofIds] = useState<string[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!documentQuery.data) return;
    const doc = documentQuery.data;
    setAboutTagsText((doc.aboutTags ?? []).join(', '));
    setContactEmail(doc.contactEmail ?? '');
    setHeroStats(ensureHeroStats(doc.heroStats));
    setTopLocations(doc.audience?.topLocations ?? '');
    setGenderAge(doc.audience?.genderAge ?? '');
    setPostingCadence(doc.audience?.postingCadence ?? '');
    setPlatforms(ensurePlatforms(doc.platforms));
    setPartnershipsText((doc.partnerships ?? []).join(', '));
    setPaymentTerms(doc.paymentTerms ?? '');
    setInviteCta(doc.inviteCta ?? '');
    setPlatformRates(ensurePlatformRates(doc.platformRates));
    setSyncRateCards(doc.syncRateCards === true);
    setSyncBattleReports(doc.syncBattleReports !== false);
    const loadedCases = doc.cases ?? [];
    setCases(loadedCases);
    setSectionOrder(resolveSectionOrder(doc.sectionOrder));
    setEnabledPublicProofIds(doc.enabledPublicProofIds ?? []);
  }, [documentQuery.data]);

  const canSave = useMemo(
    () =>
      contactEmail.trim().includes('@') &&
      inviteCta.trim().length >= 8 &&
      platforms.some((row) => row.name.trim()),
    [contactEmail, inviteCta, platforms]
  );

  const buildDocument = (): MediaKitDocument => ({
    aboutTags: splitCsv(aboutTagsText),
    contactEmail: contactEmail.trim(),
    heroStats: heroStats.filter((row) => row.label.trim() && row.value.trim()),
    audience: {
      topLocations: topLocations.trim(),
      genderAge: genderAge.trim(),
      postingCadence: postingCadence.trim(),
    },
    platforms: platforms.filter((row) => row.name.trim()),
    partnerships: splitCsv(partnershipsText),
    paymentTerms: paymentTerms.trim(),
    inviteCta: inviteCta.trim(),
    platformRates: platformRates.filter((row) => row.platform.trim() && row.priceLabel.trim()),
    syncRateCards,
    syncBattleReports,
    cases: normalizeCases(cases),
    enabledPublicProofIds,
    sectionOrder,
  });

  const togglePublicProof = (proofId: string, enabled: boolean) => {
    setEnabledPublicProofIds((prev) => {
      if (enabled) return prev.includes(proofId) ? prev : [...prev, proofId];
      return prev.filter((id) => id !== proofId);
    });
  };

  const trustProofRows = useMemo(
    () =>
      dedupePublicProofCatalog(publicProofCatalog.data ?? []).map((proof) =>
        localizePublicProofItem(proof, t)
      ),
    [publicProofCatalog.data, t]
  );

  const shareableBattleReports = battleReports.data?.filter((report) => report.shareableToMediaKit) ?? [];
  const importedBattleReportIds = useMemo(
    () => new Set(cases.map((row) => row.id)),
    [cases]
  );

  const importBattleReport = (reportId: string) => {
    const report = shareableBattleReports.find((row) => row.id === reportId);
    if (!report || importedBattleReportIds.has(report.id)) return;
    setCases((prev) => [
      ...prev,
      {
        id: report.id,
        title: report.title,
        industry: t('mediaKitEditScreen.caseDefaultIndustry'),
        outcomeNote: report.lesson,
        resultSummary: report.metrics[0] ?? undefined,
      },
    ]);
    setExpandedSections((prev) => expandEditSection(prev, 'cases'));
    setExpandedCaseId(report.id);
  };

  const updateCase = (index: number, patch: Partial<MediaKitCaseCard>) => {
    setCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeCase = (index: number) => {
    setCases((prev) => {
      const removed = prev[index];
      setExpandedCaseId((current) => (removed && current === removed.id ? null : current));
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePlatformRate = (index: number, patch: Partial<PlatformRateEntry>) => {
    setPlatformRates((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const updatePlatform = (index: number, patch: Partial<MediaKitPlatformRow>) => {
    setPlatforms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const platformRateSummary = useMemo(() => {
    const platformsSummary = platformRates
      .map((row) => row.platform.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
    return t('mediaKitEditScreen.platformRatesSummary', {
      count: platformRates.length,
      platforms: platformsSummary || t('mediaKitEditScreen.sectionEmptySummary'),
    });
  }, [platformRates, t]);

  const contactSummary = useMemo(
    () =>
      joinSummary([contactEmail, truncateText(inviteCta, 48)]) ??
      t('mediaKitEditScreen.sectionEmptySummary'),
    [contactEmail, inviteCta, t]
  );

  const tagsSummary = useMemo(() => {
    const tags = splitCsv(aboutTagsText).slice(0, 3).join(', ');
    const brands = splitCsv(partnershipsText).slice(0, 2).join(', ');
    return joinSummary([tags, brands]) ?? t('mediaKitEditScreen.sectionEmptySummary');
  }, [aboutTagsText, partnershipsText, t]);

  const statsSummary = useMemo(() => {
    const filled = heroStats
      .filter((row) => row.label.trim() && row.value.trim())
      .map((row) => `${row.label.trim()}: ${row.value.trim()}`);
    return filled.join(' · ') || t('mediaKitEditScreen.sectionEmptySummary');
  }, [heroStats, t]);

  const audienceSummary = useMemo(
    () =>
      joinSummary([topLocations, genderAge, postingCadence]) ?? t('mediaKitEditScreen.sectionEmptySummary'),
    [topLocations, genderAge, postingCadence, t]
  );

  const channelsSummary = useMemo(() => {
    const names = platforms
      .map((row) => row.name.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(', ');
    return (
      joinSummary([
        t('mediaKitEditScreen.channelsSummary', { count: platforms.length }),
        names,
      ]) ?? t('mediaKitEditScreen.sectionEmptySummary')
    );
  }, [platforms, t]);

  const trustProofSummary = useMemo(
    () =>
      t('mediaKitEditScreen.trustProofSummary', {
        enabled: enabledPublicProofIds.length,
        total: trustProofRows.length,
      }),
    [enabledPublicProofIds.length, trustProofRows.length, t]
  );

  const casesSummary = useMemo(() => {
    const titles = cases
      .map((row) => row.title.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    return (
      joinSummary([
        t('mediaKitEditScreen.casesSummary', { count: cases.length }),
        titles,
      ]) ?? t('mediaKitEditScreen.sectionEmptySummary')
    );
  }, [cases, t]);

  const layoutSummary = useMemo(
    () =>
      sectionOrder.map((sectionId) => t(`mediaKitEditScreen.section.${sectionId}`)).join(' → ') ||
      t('mediaKitEditScreen.sectionEmptySummary'),
    [sectionOrder, t]
  );

  const syncSummary = useMemo(
    () =>
      joinSummary([
        `${t('mediaKitEditScreen.syncRateCards')}: ${syncRateCards ? t('mediaKitEditScreen.toggleOn') : t('mediaKitEditScreen.toggleOff')}`,
        `${t('mediaKitEditScreen.syncBattleReports')}: ${syncBattleReports ? t('mediaKitEditScreen.toggleOn') : t('mediaKitEditScreen.toggleOff')}`,
      ]) ?? t('mediaKitEditScreen.sectionEmptySummary'),
    [syncRateCards, syncBattleReports, t]
  );

  const onSave = async () => {
    if (!canSave) return;
    try {
      await saveMutation.mutateAsync(buildDocument());
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      // mutation error surfaced via saveMutation.error if needed
    }
  };

  if (documentQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} accessibilityLabel={t('mediaKitEditScreen.loadingA11y')} />
      </View>
    );
  }

  if (documentQuery.error || !documentQuery.data) {
    return (
      <PlaceholderScreen
        title={t('mediaKitEditScreen.loadFailedTitle')}
        description={t('mediaKitEditScreen.retryDesc')}>
        <QueryRetryCard
          message={documentQuery.error?.message ?? t('mediaKitEditScreen.emptyFallback')}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['growth', 'media-kit-document'] })}
        />
      </PlaceholderScreen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      enabled={Platform.OS === 'ios'}>
      <View style={styles.screen}>
        <HubScreen
          eyebrow={t('tabs.assets')}
          title={t('mediaKitEditScreen.title')}
          lead={t('mediaKitEditScreen.description')}
          scrollBottomInset={scrollBottomInset}>
        <SettingsGroup title={t('mediaKitEditScreen.profileGroupTitle')}>
          <HubListRow
            icon="person-outline"
            title={t('mediaKitEditScreen.ctaProfile')}
            subtitle={t('mediaKitEditScreen.ctaProfileHint')}
            onPress={() => router.push('/settings/profile' as Href)}
          />
          <HubListRow
            icon="pricetag-outline"
            title={t('mediaKitEditScreen.ctaPricing')}
            subtitle={t('mediaKitEditScreen.ctaPricingHint')}
            onPress={() => router.push('/pricing-edit' as Href)}
          />
        </SettingsGroup>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.platformRatesTitle')}
          subtitle={t('mediaKitEditScreen.platformRatesSubtitle')}
          expanded={expandedSections.has('platformRates')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'platformRates'))}
          summary={platformRateSummary}
          theme={theme}
          t={t}>
          <View style={{ gap: spacing.md }}>
            {platformRates.map((row, index) => (
              <PlatformRateEditCard
                key={row.id}
                index={index}
                row={row}
                expanded={expandedPlatformRateId === row.id}
                theme={theme}
                onToggle={() =>
                  setExpandedPlatformRateId((current) => (current === row.id ? null : row.id))
                }
                onUpdate={(patch) => updatePlatformRate(index, patch)}
                onRemove={() => {
                  setPlatformRates(platformRates.filter((_, i) => i !== index));
                  setExpandedPlatformRateId((current) => (current === row.id ? null : current));
                }}
                t={t}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const nextRow: PlatformRateEntry = {
                  id: createPlatformRateId(),
                  platform: '',
                  formatKey: 'short_video',
                  priceLabel: '',
                };
                setPlatformRates([...platformRates, nextRow]);
                setExpandedPlatformRateId(nextRow.id);
                setExpandedSections((prev) => expandEditSection(prev, 'platformRates'));
              }}
              style={[styles.addRateButton, { borderColor: theme.border }]}>
              <Text style={[styles.addRateLabel, { color: theme.primary }]}>{t('mediaKitEditScreen.addRateRow')}</Text>
            </Pressable>
          </View>
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.contactTitle')}
          expanded={expandedSections.has('contact')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'contact'))}
          summary={contactSummary}
          collapsedPreview={
            paymentTerms.trim() ? (
              <Text style={[styles.collapsedHint, { color: theme.mutedForeground }]}>
                {truncateText(paymentTerms, 96)}
              </Text>
            ) : null
          }
          theme={theme}
          t={t}>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelContactEmail')} />
          <TextInput
            value={contactEmail}
            onChangeText={setContactEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('mediaKitEditScreen.placeholderContactEmail')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelInviteCta')} />
          <TextInput
            value={inviteCta}
            onChangeText={setInviteCta}
            placeholder={t('mediaKitEditScreen.placeholderInviteCta')}
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
            multiline
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPaymentTerms')} />
          <TextInput
            value={paymentTerms}
            onChangeText={setPaymentTerms}
            placeholder={t('mediaKitEditScreen.placeholderPaymentTerms')}
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
            multiline
          />
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.tagsTitle')}
          expanded={expandedSections.has('tags')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'tags'))}
          summary={tagsSummary}
          theme={theme}
          t={t}>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelAboutTags')} />
          <TextInput
            value={aboutTagsText}
            onChangeText={setAboutTagsText}
            placeholder={t('mediaKitEditScreen.placeholderAboutTags')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPartnerships')} />
          <TextInput
            value={partnershipsText}
            onChangeText={setPartnershipsText}
            placeholder={t('mediaKitEditScreen.placeholderPartnerships')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.statsTitle')}
          expanded={expandedSections.has('stats')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'stats'))}
          summary={statsSummary}
          theme={theme}
          t={t}>
          {heroStats.map((row, index) => (
            <View key={`hero-${index}`} style={styles.rowPair}>
              <View style={styles.rowHalf}>
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelStatName')} />
                <TextInput
                  value={row.label}
                  onChangeText={(value) => {
                    const next = [...heroStats];
                    next[index] = { ...next[index], label: value };
                    setHeroStats(next);
                  }}
                  placeholder={t('mediaKitEditScreen.placeholderStatName')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
              </View>
              <View style={styles.rowHalf}>
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelStatValue')} />
                <TextInput
                  value={row.value}
                  onChangeText={(value) => {
                    const next = [...heroStats];
                    next[index] = { ...next[index], value: value };
                    setHeroStats(next);
                  }}
                  placeholder={t('mediaKitEditScreen.placeholderStatValue')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
              </View>
            </View>
          ))}
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.audienceTitle')}
          expanded={expandedSections.has('audience')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'audience'))}
          summary={audienceSummary}
          theme={theme}
          t={t}>
          <FieldLabel theme={theme} label={t('mediaKitScreen.audienceLocations')} />
          <TextInput
            value={topLocations}
            onChangeText={setTopLocations}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitScreen.audienceDemographics')} />
          <TextInput
            value={genderAge}
            onChangeText={setGenderAge}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitScreen.audienceCadence')} />
          <TextInput
            value={postingCadence}
            onChangeText={setPostingCadence}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.channelsTitle')}
          subtitle={t('mediaKitEditScreen.channelsSubtitle')}
          expanded={expandedSections.has('channels')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'channels'))}
          summary={channelsSummary}
          theme={theme}
          t={t}>
          <View style={{ gap: spacing.md }}>
            {platforms.map((row, index) => (
              <ChannelEditCard
                key={`platform-${index}`}
                index={index}
                row={row}
                expanded={expandedChannelIndex === index}
                canRemove={platforms.length > 1}
                theme={theme}
                onToggle={() =>
                  setExpandedChannelIndex((current) => (current === index ? null : index))
                }
                onUpdate={(patch) => updatePlatform(index, patch)}
                onRemove={() => {
                  setPlatforms(platforms.filter((_, i) => i !== index));
                  setExpandedChannelIndex((current) => {
                    if (current === null) return null;
                    if (current === index) return null;
                    return current > index ? current - 1 : current;
                  });
                }}
                t={t}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const nextIndex = platforms.length;
                setPlatforms([...platforms, createEmptyPlatform()]);
                setExpandedChannelIndex(nextIndex);
                setExpandedSections((prev) => expandEditSection(prev, 'channels'));
              }}
              style={[styles.addRateButton, { borderColor: theme.border }]}>
              <Text style={[styles.addRateLabel, { color: theme.primary }]}>
                {t('mediaKitEditScreen.addPlatformRow')}
              </Text>
            </Pressable>
          </View>
        </CollapsibleEditSection>

        {trustProofRows.length ? (
          <CollapsibleEditSection
            title={t('mediaKitEditScreen.trustProofTitle')}
            subtitle={t('mediaKitEditScreen.trustProofSubtitle')}
            expanded={expandedSections.has('trustProof')}
            onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'trustProof'))}
            summary={trustProofSummary}
            collapsedPreview={
              enabledPublicProofIds.length > 0 ? (
                <View style={styles.collapsedBadgeRow}>
                  {trustProofRows
                    .filter((proof) => enabledPublicProofIds.includes(proof.id))
                    .slice(0, 4)
                    .map((proof) => (
                      <Badge key={proof.id} tone="mint" label={proof.label} />
                    ))}
                </View>
              ) : null
            }
            theme={theme}
            t={t}>
            {trustProofRows.map((proof) => (
              <ToggleRow
                key={proof.trustMetricId || proof.id}
                theme={theme}
                label={proof.label}
                hint={publicProofToggleHint(proof)}
                value={enabledPublicProofIds.includes(proof.id)}
                onValueChange={(next) => togglePublicProof(proof.id, next)}
              />
            ))}
          </CollapsibleEditSection>
        ) : null}

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.casesTitle')}
          subtitle={t('mediaKitEditScreen.casesSubtitle')}
          expanded={expandedSections.has('cases')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'cases'))}
          summary={casesSummary}
          theme={theme}
          t={t}>
          <View style={{ gap: spacing.md }}>
            {cases.map((row, index) => (
              <CaseEditCard
                key={row.id}
                index={index}
                row={row}
                expanded={expandedCaseId === row.id}
                theme={theme}
                onToggle={() => setExpandedCaseId((current) => (current === row.id ? null : row.id))}
                onUpdate={(patch) => updateCase(index, patch)}
                onRemove={() => removeCase(index)}
                t={t}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const nextCase = createManualCase();
                setCases((prev) => [...prev, nextCase]);
                setExpandedCaseId(nextCase.id);
                setExpandedSections((prev) => expandEditSection(prev, 'cases'));
              }}
              style={[styles.addRateButton, { borderColor: theme.border }]}>
              <Text style={[styles.addRateLabel, { color: theme.primary }]}>
                {t('mediaKitEditScreen.addCase')}
              </Text>
            </Pressable>
          </View>
          {shareableBattleReports.length ? (
            <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
              <FieldLabel theme={theme} label={t('mediaKitEditScreen.importBattleReportsTitle')} />
              {shareableBattleReports.map((report) => {
                const imported = importedBattleReportIds.has(report.id);
                const rowProps = {
                  icon: 'trophy-outline' as const,
                  title: report.title,
                  subtitle: imported
                    ? t('mediaKitEditScreen.importBattleReportDone')
                    : t('mediaKitEditScreen.importBattleReportHint'),
                };
                return imported ? (
                  <HubStaticRow key={report.id} {...rowProps} />
                ) : (
                  <HubListRow
                    key={report.id}
                    {...rowProps}
                    onPress={() => importBattleReport(report.id)}
                  />
                );
              })}
            </View>
          ) : null}
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.layoutGroupTitle')}
          subtitle={t('mediaKitEditScreen.layoutGroupSubtitle')}
          expanded={expandedSections.has('layout')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'layout'))}
          summary={layoutSummary}
          theme={theme}
          t={t}>
          {sectionOrder.map((sectionId, index) => (
            <View key={sectionId} style={[styles.layoutRow, { borderColor: theme.border }]}>
              <Text style={[styles.layoutLabel, { color: theme.foreground }]}>
                {t(`mediaKitEditScreen.section.${sectionId}`)}
              </Text>
              <View style={styles.layoutActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={index === 0}
                  onPress={() => setSectionOrder((prev) => moveSectionOrder(prev, index, -1))}
                  style={[styles.layoutButton, { borderColor: theme.border, opacity: index === 0 ? 0.4 : 1 }]}>
                  <Text style={{ color: theme.foreground }}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={index === sectionOrder.length - 1}
                  onPress={() => setSectionOrder((prev) => moveSectionOrder(prev, index, 1))}
                  style={[
                    styles.layoutButton,
                    { borderColor: theme.border, opacity: index === sectionOrder.length - 1 ? 0.4 : 1 },
                  ]}>
                  <Text style={{ color: theme.foreground }}>↓</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </CollapsibleEditSection>

        <CollapsibleEditSection
          title={t('mediaKitEditScreen.syncTitle')}
          subtitle={t('mediaKitEditScreen.syncSubtitle')}
          expanded={expandedSections.has('sync')}
          onToggle={() => setExpandedSections((prev) => toggleEditSection(prev, 'sync'))}
          summary={syncSummary}
          theme={theme}
          t={t}>
          <ToggleRow
            theme={theme}
            label={t('mediaKitEditScreen.syncRateCards')}
            hint={t('mediaKitEditScreen.syncRateCardsHint')}
            value={syncRateCards}
            onValueChange={setSyncRateCards}
          />
          <ToggleRow
            theme={theme}
            label={t('mediaKitEditScreen.syncBattleReports')}
            hint={t('mediaKitEditScreen.syncBattleReportsHint')}
            value={syncBattleReports}
            onValueChange={setSyncBattleReports}
          />
        </CollapsibleEditSection>

        <Pressable
          accessibilityRole="button"
          onPress={() => assetsNav.openMediaKitPublic()}
          style={[styles.previewLink, { borderColor: theme.border }]}>
          <Text style={[styles.previewLabel, { color: theme.foreground }]}>{t('mediaKitEditScreen.ctaPreview')}</Text>
        </Pressable>
        </HubScreen>

        <View
          pointerEvents="box-none"
          style={[
            styles.floatingSave,
            { bottom: floatingBottom, paddingHorizontal: layout.tabScreenPaddingX },
          ]}>
          <Pressable
            accessibilityRole="button"
            disabled={!canSave || saveMutation.isPending}
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: canSave ? theme.primary : theme.secondary },
              pressed && canSave && { opacity: 0.9 },
            ]}>
            {saveMutation.isPending ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text style={[styles.saveLabel, { color: canSave ? theme.primaryForeground : theme.mutedForeground }]}>
                {savedFlash ? t('mediaKitEditScreen.saved') : t('mediaKitEditScreen.save')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, theme }: { label: string; theme: (typeof palette)['light'] }) {
  return <Text style={[styles.label, { color: theme.foregroundEyebrow }]}>{label}</Text>;
}

type CollapsibleEditSectionProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  summary?: string;
  collapsedPreview?: ReactNode;
  theme: (typeof palette)['light'];
  t: ReturnType<typeof useTranslation>['t'];
}>;

function CollapsibleEditSection({
  title,
  subtitle,
  expanded,
  onToggle,
  summary,
  collapsedPreview,
  theme,
  t,
  children,
}: CollapsibleEditSectionProps) {
  const headerSummary = summary ?? t('mediaKitEditScreen.sectionEmptySummary');

  return (
    <View style={[styles.editSection, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('mediaKitEditScreen.collapseSectionA11y', { name: title })
            : t('mediaKitEditScreen.expandSectionA11y', { name: title })
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.editSectionHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.editSectionHeaderText}>
          <Text style={[styles.editSectionTitle, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.editSectionSummary, { color: theme.mutedForeground }]} numberOfLines={2}>
            {headerSummary}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {!expanded && collapsedPreview ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mediaKitEditScreen.expandSectionA11y', { name: title })}
          onPress={onToggle}
          style={({ pressed }) => [styles.editSectionCollapsedPreview, pressed && { opacity: 0.85 }]}>
          {collapsedPreview}
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.editSectionBody}>
          {subtitle ? (
            <Text style={[styles.editSectionSubtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
          ) : null}
          {children}
        </View>
      ) : null}
    </View>
  );
}

type ChannelEditCardProps = {
  index: number;
  row: MediaKitPlatformRow;
  expanded: boolean;
  canRemove: boolean;
  theme: (typeof palette)['light'];
  onToggle: () => void;
  onUpdate: (patch: Partial<MediaKitPlatformRow>) => void;
  onRemove: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

function ChannelEditCard({
  index,
  row,
  expanded,
  canRemove,
  theme,
  onToggle,
  onUpdate,
  onRemove,
  t,
}: ChannelEditCardProps) {
  const name = row.name.trim();
  const title = name || t('mediaKitEditScreen.channelFallbackTitle', { index: index + 1 });
  const summaryLine = joinSummary([row.followersRange, row.handle ?? '']) ?? t('mediaKitEditScreen.channelFallbackSubtitle');
  const headerSubtitle = expanded ? summaryLine : joinSummary([summaryLine, row.monthlyViews ?? '']) ?? summaryLine;

  return (
    <View style={[styles.rateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('mediaKitEditScreen.collapseChannelA11y', { name: title })
            : t('mediaKitEditScreen.expandChannelA11y', { name: title })
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.rateHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.rateHeaderText}>
          <Text style={[styles.rateTitle, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.rateSubtitle, { color: theme.mutedForeground }]}>{headerSubtitle}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mediaKitEditScreen.expandChannelA11y', { name: title })}
          onPress={onToggle}
          style={({ pressed }) => [styles.rateCollapsedPreview, pressed && { opacity: 0.85 }]}>
          <View style={styles.rateCollapsedContent}>
            {row.followersRange.trim() ? <Badge tone="neutral" label={row.followersRange.trim()} /> : null}
            {row.nicheNote.trim() ? (
              <Text style={[styles.collapsedHint, { color: theme.foreground }]} numberOfLines={2}>
                {row.nicheNote.trim()}
              </Text>
            ) : null}
            {!row.followersRange.trim() && !row.nicheNote.trim() ? (
              <Text style={[styles.collapsedHint, { color: theme.mutedForeground }]}>
                {t('mediaKitEditScreen.channelFallbackSubtitle')}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.rateBody}>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPlatformName')} />
          <TextInput
            value={row.name}
            onChangeText={(value) => onUpdate({ name: value })}
            placeholder="TikTok"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelFollowers')} />
          <TextInput
            value={row.followersRange}
            onChangeText={(value) => onUpdate({ followersRange: value })}
            placeholder="380k–520k"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelHandle')} />
          <TextInput
            value={row.handle ?? ''}
            onChangeText={(value) => onUpdate({ handle: value })}
            autoCapitalize="none"
            placeholder="@handle"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelMonthlyViews')} />
          <TextInput
            value={row.monthlyViews ?? ''}
            onChangeText={(value) => onUpdate({ monthlyViews: value })}
            placeholder="~1.2M / mo"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelNicheNote')} />
          <TextInput
            value={row.nicheNote}
            onChangeText={(value) => onUpdate({ nicheNote: value })}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          {canRemove ? (
            <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeRow}>
              <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                {t('mediaKitEditScreen.removePlatformRow')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type CaseEditCardProps = {
  index: number;
  row: MediaKitCaseCard;
  expanded: boolean;
  theme: (typeof palette)['light'];
  onToggle: () => void;
  onUpdate: (patch: Partial<MediaKitCaseCard>) => void;
  onRemove: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

function CaseEditCard({
  index,
  row,
  expanded,
  theme,
  onToggle,
  onUpdate,
  onRemove,
  t,
}: CaseEditCardProps) {
  const title = row.title.trim() || t('mediaKitEditScreen.caseFallbackTitle', { index: index + 1 });
  const industry = row.industry.trim();
  const resultSummary = row.resultSummary?.trim() ?? '';
  const headerSubtitle =
    expanded || !industry
      ? industry || t('mediaKitEditScreen.caseFallbackSubtitle')
      : joinSummary([industry, resultSummary]) ?? industry;

  return (
    <View style={[styles.rateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('mediaKitEditScreen.collapseCaseA11y', { name: title })
            : t('mediaKitEditScreen.expandCaseA11y', { name: title })
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.rateHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.rateHeaderText}>
          <Text style={[styles.rateTitle, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.rateSubtitle, { color: theme.mutedForeground }]} numberOfLines={2}>
            {headerSubtitle}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mediaKitEditScreen.expandCaseA11y', { name: title })}
          onPress={onToggle}
          style={({ pressed }) => [styles.rateCollapsedPreview, pressed && { opacity: 0.85 }]}>
          <View style={styles.rateCollapsedContent}>
            {resultSummary ? (
              <Text style={[styles.rateCollapsedPrice, { color: theme.foreground }]} numberOfLines={2}>
                {resultSummary}
              </Text>
            ) : null}
            {row.outcomeNote.trim() ? (
              <Text style={[styles.collapsedHint, { color: theme.mutedForeground }]} numberOfLines={3}>
                {row.outcomeNote.trim()}
              </Text>
            ) : null}
            {!resultSummary && !row.outcomeNote.trim() ? (
              <Text style={[styles.collapsedHint, { color: theme.mutedForeground }]}>
                {t('mediaKitEditScreen.caseFallbackSubtitle')}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.rateBody}>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseTitle')} />
          <TextInput
            value={row.title}
            onChangeText={(value) => onUpdate({ title: value })}
            placeholder={t('mediaKitEditScreen.placeholderCaseTitle')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseIndustry')} />
          <TextInput
            value={row.industry}
            onChangeText={(value) => onUpdate({ industry: value })}
            placeholder={t('mediaKitEditScreen.placeholderCaseIndustry')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseResultSummary')} />
          <TextInput
            value={row.resultSummary ?? ''}
            onChangeText={(value) => onUpdate({ resultSummary: value })}
            placeholder={t('mediaKitEditScreen.placeholderCaseResultSummary')}
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseOutcome')} />
          <TextInput
            value={row.outcomeNote}
            onChangeText={(value) => onUpdate({ outcomeNote: value })}
            placeholder={t('mediaKitEditScreen.placeholderCaseOutcome')}
            {...getTextInputProps(theme)}
            style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
            multiline
          />
          <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeRow}>
            <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
              {t('mediaKitEditScreen.removeCase')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type PlatformRateEditCardProps = {
  index: number;
  row: PlatformRateEntry;
  expanded: boolean;
  theme: (typeof palette)['light'];
  onToggle: () => void;
  onUpdate: (patch: Partial<PlatformRateEntry>) => void;
  onRemove: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

function PlatformRateEditCard({
  index,
  row,
  expanded,
  theme,
  onToggle,
  onUpdate,
  onRemove,
  t,
}: PlatformRateEditCardProps) {
  const platform = row.platform.trim();
  const priceLabel = row.priceLabel.trim();
  const formatLabel = t(formatI18nKey(row.formatKey));
  const title = platform || t('mediaKitEditScreen.rateRowFallbackTitle', { index: index + 1 });
  const summaryLine = [formatLabel, priceLabel].filter(Boolean).join(' · ');
  const headerSubtitle =
    expanded || !summaryLine
      ? priceLabel || t('mediaKitEditScreen.rateRowFallbackSubtitle')
      : summaryLine;

  return (
    <View style={[styles.rateCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? t('mediaKitEditScreen.collapseRateRowA11y', { name: title })
            : t('mediaKitEditScreen.expandRateRowA11y', { name: title })
        }
        onPress={onToggle}
        style={({ pressed }) => [styles.rateHeader, pressed && { opacity: 0.85 }]}>
        {platform ? <PlatformIcon platform={platform} /> : null}
        <View style={styles.rateHeaderText}>
          <Text style={[styles.rateTitle, { color: theme.foreground }]}>{title}</Text>
          <Text style={[styles.rateSubtitle, { color: theme.mutedForeground }]}>{headerSubtitle}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.foregroundEyebrow}
        />
      </Pressable>

      {!expanded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mediaKitEditScreen.expandRateRowA11y', { name: title })}
          onPress={onToggle}
          style={({ pressed }) => [styles.rateCollapsedPreview, pressed && { opacity: 0.85 }]}>
          <View style={styles.rateCollapsedContent}>
            <Badge tone="neutral" label={formatLabel} />
            {priceLabel.length > 0 ? (
              <Text style={[styles.rateCollapsedPrice, { color: theme.foreground }]}>{priceLabel}</Text>
            ) : (
              <Text style={[styles.rateCollapsedHint, { color: theme.mutedForeground }]}>
                {t('mediaKitEditScreen.rateRowFallbackSubtitle')}
              </Text>
            )}
          </View>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.rateBody}>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPlatformName')} />
          <TextInput
            value={row.platform}
            onChangeText={(value) => onUpdate({ platform: value })}
            placeholder="YouTube"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformSuggestRow}>
            {PLATFORM_RATE_SUGGESTIONS.map((suggestion) => {
              const active = row.platform.trim().toLowerCase() === suggestion.toLowerCase();
              return (
                <Pressable
                  key={`${row.id}-${suggestion}`}
                  accessibilityRole="button"
                  onPress={() => onUpdate({ platform: suggestion })}
                  style={[
                    styles.platformSuggestChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.accentMintSoft : theme.card,
                    },
                  ]}>
                  <PlatformIcon platform={suggestion} size={16} />
                  <Text
                    style={[
                      styles.platformSuggestLabel,
                      { color: active ? theme.primary : theme.foreground },
                    ]}>
                    {suggestion}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelContentFormat')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
            {CONTENT_FORMAT_KEYS.map((formatKey) => {
              const active = row.formatKey === formatKey;
              return (
                <Pressable
                  key={`${row.id}-${formatKey}`}
                  accessibilityRole="button"
                  onPress={() => onUpdate({ formatKey })}
                  style={[
                    styles.formatChip,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.accentMintSoft : theme.card,
                    },
                  ]}>
                  <Text style={[styles.formatChipLabel, { color: active ? theme.primary : theme.foreground }]}>
                    {t(formatI18nKey(formatKey))}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPrice')} />
          <TextInput
            value={row.priceLabel}
            onChangeText={(value) => onUpdate({ priceLabel: value })}
            placeholder="$800+"
            {...getTextInputProps(theme)}
            style={getTextInputStyle(theme)}
          />
          <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeRow}>
            <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
              {t('mediaKitEditScreen.removeRateRow')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
  theme,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  theme: (typeof palette)['light'];
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={[styles.toggleLabel, { color: theme.foreground }]}>{label}</Text>
        <Text style={[styles.toggleHint, { color: theme.mutedForeground }]}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  label: { fontSize: fontSize.caption, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  rowPair: { flexDirection: 'row', gap: spacing.md },
  rowHalf: { flex: 1 },
  editSection: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editSectionHeaderText: { flex: 1, gap: spacing.xs },
  editSectionTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  editSectionSummary: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  editSectionSubtitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
    marginBottom: spacing.xs,
  },
  editSectionCollapsedPreview: { marginTop: -spacing.xs },
  editSectionBody: { gap: spacing.sm, marginTop: spacing.xs },
  collapsedBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  collapsedHint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  rateCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateHeaderText: { flex: 1, gap: spacing.xs },
  rateTitle: {
    fontSize: fontSize.body,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  rateSubtitle: {
    fontSize: fontSize.bodySmall,
    lineHeight: lineHeight.body,
  },
  rateCollapsedPreview: { marginTop: -spacing.xs },
  rateCollapsedContent: { gap: spacing.sm },
  rateCollapsedPrice: { fontSize: fontSize.body, fontWeight: '700', lineHeight: lineHeight.body },
  rateCollapsedHint: { fontSize: fontSize.bodySmall, lineHeight: lineHeight.bodyRelaxed },
  rateBody: { gap: spacing.xs },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  toggleLabel: { fontSize: fontSize.body, fontWeight: '600' },
  toggleHint: { fontSize: fontSize.caption, lineHeight: lineHeight.body },
  screen: { flex: 1 },
  floatingSave: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  saveButton: {
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { fontSize: fontSize.body, fontWeight: '700' },
  previewLink: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  previewLabel: { fontSize: fontSize.body, fontWeight: '600' },
  formatRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  platformSuggestRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  platformSuggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  platformSuggestLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  formatChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  formatChipLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  removeRow: { alignSelf: 'flex-start', marginTop: spacing.xs },
  addRateButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    minHeight: layout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRateLabel: { fontSize: fontSize.body, fontWeight: '700' },
  layoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  layoutLabel: { fontSize: fontSize.body, fontWeight: '600', flex: 1 },
  layoutActions: { flexDirection: 'row', gap: spacing.sm },
  layoutButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
