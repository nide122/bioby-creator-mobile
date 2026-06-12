import { useEffect, useMemo, useState } from 'react';
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
import { useAssetsHubNavigation } from '@/src/hooks/use-assets-hub-navigation';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import {
  getTextInputProps,
  getTextInputStyle,
  HubListRow,
  HubScreen,
  HubStaticRow,
  QueryRetryCard,
  SectionCard,
  SettingsGroup,
} from '@/components/product';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useColorScheme } from '@/components/useColorScheme';
import { fontSize, layout, lineHeight, palette, radii, spacing } from '@/constants/tokens';
import {
  CONTENT_FORMAT_KEYS,
  createPlatformRateId,
  ensurePlatformRates,
  formatI18nKey,
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
  ContentFormatKey,
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
  };

  const updateCase = (index: number, patch: Partial<MediaKitCaseCard>) => {
    setCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeCase = (index: number) => {
    setCases((prev) => prev.filter((_, i) => i !== index));
  };

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

        <SectionCard
          title={t('mediaKitEditScreen.platformRatesTitle')}
          subtitle={t('mediaKitEditScreen.platformRatesSubtitle')}>
          <View style={{ gap: spacing.md }}>
            {platformRates.map((row, index) => (
              <View key={row.id} style={[styles.platformBlock, { borderColor: theme.border }]}>
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPlatformName')} />
                <TextInput
                  value={row.platform}
                  onChangeText={(value) => {
                    const next = [...platformRates];
                    next[index] = { ...next[index], platform: value };
                    setPlatformRates(next);
                  }}
                  placeholder="YouTube"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelContentFormat')} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
                  {CONTENT_FORMAT_KEYS.map((formatKey) => {
                    const active = row.formatKey === formatKey;
                    return (
                      <Pressable
                        key={`${row.id}-${formatKey}`}
                        accessibilityRole="button"
                        onPress={() => {
                          const next = [...platformRates];
                          next[index] = { ...next[index], formatKey };
                          setPlatformRates(next);
                        }}
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
                  onChangeText={(value) => {
                    const next = [...platformRates];
                    next[index] = { ...next[index], priceLabel: value };
                    setPlatformRates(next);
                  }}
                  placeholder="$800+"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPlatformRates(platformRates.filter((_, i) => i !== index))}
                  style={styles.removeRow}>
                  <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                    {t('mediaKitEditScreen.removeRateRow')}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setPlatformRates([
                  ...platformRates,
                  {
                    id: createPlatformRateId(),
                    platform: '',
                    formatKey: 'short_video' as ContentFormatKey,
                    priceLabel: '',
                  },
                ])
              }
              style={[styles.addRateButton, { borderColor: theme.border }]}>
              <Text style={[styles.addRateLabel, { color: theme.primary }]}>{t('mediaKitEditScreen.addRateRow')}</Text>
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.contactTitle')}>
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
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.tagsTitle')}>
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
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.statsTitle')}>
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
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.audienceTitle')}>
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
        </SectionCard>

        <SectionCard
          title={t('mediaKitEditScreen.channelsTitle')}
          subtitle={t('mediaKitEditScreen.channelsSubtitle')}>
          <View style={{ gap: spacing.md }}>
            {platforms.map((row, index) => (
              <View key={`platform-${index}`} style={[styles.platformBlock, { borderColor: theme.border }]}>
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelPlatformName')} />
                <TextInput
                  value={row.name}
                  onChangeText={(value) => {
                    const next = [...platforms];
                    next[index] = { ...next[index], name: value };
                    setPlatforms(next);
                  }}
                  placeholder="TikTok"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelFollowers')} />
                <TextInput
                  value={row.followersRange}
                  onChangeText={(value) => {
                    const next = [...platforms];
                    next[index] = { ...next[index], followersRange: value };
                    setPlatforms(next);
                  }}
                  placeholder="380k–520k"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelHandle')} />
                <TextInput
                  value={row.handle ?? ''}
                  onChangeText={(value) => {
                    const next = [...platforms];
                    next[index] = { ...next[index], handle: value };
                    setPlatforms(next);
                  }}
                  autoCapitalize="none"
                  placeholder="@handle"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelMonthlyViews')} />
                <TextInput
                  value={row.monthlyViews ?? ''}
                  onChangeText={(value) => {
                    const next = [...platforms];
                    next[index] = { ...next[index], monthlyViews: value };
                    setPlatforms(next);
                  }}
                  placeholder="~1.2M / mo"
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelNicheNote')} />
                <TextInput
                  value={row.nicheNote}
                  onChangeText={(value) => {
                    const next = [...platforms];
                    next[index] = { ...next[index], nicheNote: value };
                    setPlatforms(next);
                  }}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                {platforms.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPlatforms(platforms.filter((_, i) => i !== index))}
                    style={styles.removeRow}>
                    <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                      {t('mediaKitEditScreen.removePlatformRow')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setPlatforms([...platforms, createEmptyPlatform()])}
              style={[styles.addRateButton, { borderColor: theme.border }]}>
              <Text style={[styles.addRateLabel, { color: theme.primary }]}>
                {t('mediaKitEditScreen.addPlatformRow')}
              </Text>
            </Pressable>
          </View>
        </SectionCard>

        {trustProofRows.length ? (
          <SectionCard
            title={t('mediaKitEditScreen.trustProofTitle')}
            subtitle={t('mediaKitEditScreen.trustProofSubtitle')}>
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
          </SectionCard>
        ) : null}

        <SectionCard
          title={t('mediaKitEditScreen.casesTitle')}
          subtitle={t('mediaKitEditScreen.casesSubtitle')}>
          <View style={{ gap: spacing.md }}>
            {cases.map((row, index) => (
              <View key={row.id} style={[styles.platformBlock, { borderColor: theme.border }]}>
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseTitle')} />
                <TextInput
                  value={row.title}
                  onChangeText={(value) => updateCase(index, { title: value })}
                  placeholder={t('mediaKitEditScreen.placeholderCaseTitle')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseIndustry')} />
                <TextInput
                  value={row.industry}
                  onChangeText={(value) => updateCase(index, { industry: value })}
                  placeholder={t('mediaKitEditScreen.placeholderCaseIndustry')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseResultSummary')} />
                <TextInput
                  value={row.resultSummary ?? ''}
                  onChangeText={(value) => updateCase(index, { resultSummary: value })}
                  placeholder={t('mediaKitEditScreen.placeholderCaseResultSummary')}
                  {...getTextInputProps(theme)}
                  style={getTextInputStyle(theme)}
                />
                <FieldLabel theme={theme} label={t('mediaKitEditScreen.labelCaseOutcome')} />
                <TextInput
                  value={row.outcomeNote}
                  onChangeText={(value) => updateCase(index, { outcomeNote: value })}
                  placeholder={t('mediaKitEditScreen.placeholderCaseOutcome')}
                  {...getTextInputProps(theme)}
                  style={[getTextInputStyle(theme, { multiline: true }), styles.multiline]}
                  multiline
                />
                <Pressable accessibilityRole="button" onPress={() => removeCase(index)} style={styles.removeRow}>
                  <Text style={{ color: theme.mutedForeground, fontSize: fontSize.caption }}>
                    {t('mediaKitEditScreen.removeCase')}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setCases((prev) => [...prev, createManualCase()])}
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
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.layoutGroupTitle')} subtitle={t('mediaKitEditScreen.layoutGroupSubtitle')}>
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
        </SectionCard>

        <SectionCard title={t('mediaKitEditScreen.syncTitle')} subtitle={t('mediaKitEditScreen.syncSubtitle')}>
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
        </SectionCard>

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
  platformBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
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
