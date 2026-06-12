import type { TFunction } from 'i18next';

import { battleReportOutcome } from '@/src/lib/battle-report-media-kit';
import { buildMediaKitContactUrl, slugifyDisplayName } from '@/src/lib/media-kit-contact-url';
import { formatI18nKey } from '@/src/lib/media-kit-formats';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import { resolveMediaKitPublicProofs } from '@/src/lib/public-proof';
import type {
  BattleReportSummary,
  ContentFormatKey,
  MediaKitCaseCard,
  MediaKitDocument,
  MediaKitPreview,
  PlatformRateEntry,
  PublicProofItem,
  RateCardPackage,
} from '@/src/types/domain';

const CREATOR_FALLBACK = 'Creator';
const BIO_PLACEHOLDER_EN = 'Add your creator bio in Profile settings or Media Kit.';
const SEE_SERVICES_TABLE_EN = 'See services table for scope.';
const QUOTE_ON_REQUEST_EN = 'Quote on request';

export { slugifyDisplayName } from '@/src/lib/media-kit-contact-url';

/** Normalize legacy "起 $2,500" to "$2,500起". */
export function normalizeStartingPrice(price: string): string {
  const trimmed = price.trim();
  const legacyPrefix = trimmed.match(/^起\s*(.+)$/u);
  if (legacyPrefix) {
    const amount = legacyPrefix[1].trim();
    return amount.endsWith('起') ? amount : `${amount}起`;
  }
  return trimmed;
}

function headlineNiche(
  profile: CreatorProfileBasics | null | undefined,
  document: MediaKitDocument
): string {
  if (profile?.nicheTags?.length) {
    return profile.nicheTags.slice(0, 2).join(' · ');
  }
  if (document.aboutTags?.length) {
    return document.aboutTags.slice(0, 2).join(' · ');
  }
  return CREATOR_FALLBACK;
}

function fromPrice(price: string | undefined, t?: TFunction): string {
  if (!price?.trim()) {
    return t?.('mediaKitShare.quoteOnRequest') ?? QUOTE_ON_REQUEST_EN;
  }
  const normalized = normalizeStartingPrice(price);
  if (
    normalized.startsWith('from') ||
    normalized.startsWith('+') ||
    normalized.startsWith('从') ||
    normalized.endsWith('起')
  ) {
    return normalized;
  }
  const quoteOnRequest = t?.('mediaKitShare.quoteOnRequest');
  const isZh = quoteOnRequest === '面议';
  return isZh ? `${normalized}起` : `from ${normalized}`;
}

function formatLabel(formatKey: ContentFormatKey, t?: TFunction): string {
  return t?.(formatI18nKey(formatKey)) ?? formatKey;
}

function platformFormatService(platform: string, formatKey: ContentFormatKey, t?: TFunction): string {
  const platformName = platform.trim() || 'Platform';
  return `${platformName} · ${formatLabel(formatKey, t)}`;
}

function rateSummariesFromPlatformRates(rows: PlatformRateEntry[], t?: TFunction): MediaKitPreview['rateSummaries'] {
  const byPlatform = new Map<string, PlatformRateEntry>();
  for (const row of rows) {
    if (!row.platform.trim()) continue;
    if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, row);
  }
  return [...byPlatform.values()].slice(0, 4).map((row) => ({
    id: row.id || row.platform,
    title: row.platform,
    startingPrice: fromPrice(row.priceLabel, t),
    description: formatLabel(row.formatKey, t),
  }));
}

function servicesTableFromPlatformRates(rows: PlatformRateEntry[], t?: TFunction): MediaKitPreview['servicesTable'] {
  return rows
    .filter((row) => row.platform.trim() && row.formatKey)
    .map((row) => ({
      service: platformFormatService(row.platform, row.formatKey, t),
      fee: row.priceLabel.trim() || (t?.('mediaKitShare.quoteOnRequest') ?? QUOTE_ON_REQUEST_EN),
    }));
}

function rateSummariesFromPackages(packages: RateCardPackage[], t?: TFunction): MediaKitPreview['rateSummaries'] {
  return packages.slice(0, 3).map((pkg) => ({
    id: pkg.id,
    title: pkg.name,
    startingPrice: fromPrice(pkg.priceLabel, t),
    description: pkg.tagline.trim() || SEE_SERVICES_TABLE_EN,
  }));
}

function servicesTableFromPackages(packages: RateCardPackage[], t?: TFunction): MediaKitPreview['servicesTable'] {
  return packages.map((pkg) => ({
    service: pkg.name,
    fee: pkg.priceLabel.trim() || (t?.('mediaKitShare.quoteOnRequest') ?? QUOTE_ON_REQUEST_EN),
  }));
}

export function mergeMediaKitCases(
  documentCases: MediaKitCaseCard[] | undefined,
  battleReports: BattleReportSummary[] | undefined,
  syncBattleReports: boolean,
  campaignRecapLabel: string
): MediaKitCaseCard[] {
  const cases = [...(documentCases ?? [])];
  const existingIds = new Set(cases.map((item) => item.id));
  if (!syncBattleReports || !battleReports?.length) return cases;

  for (const report of battleReports) {
    if (!report.shareableToMediaKit || existingIds.has(report.id)) continue;
    cases.push({
      id: report.id,
      title: report.title,
      industry: campaignRecapLabel,
      outcomeNote: battleReportOutcome(report),
      resultSummary: report.metrics[0]?.trim() || undefined,
    });
    existingIds.add(report.id);
  }

  return cases;
}

export function buildMediaKitPreview(input: {
  document: MediaKitDocument;
  profile?: CreatorProfileBasics | null;
  battleReports?: BattleReportSummary[];
  rateCardPackages?: RateCardPackage[];
  publicProofCatalog?: PublicProofItem[];
  t?: TFunction;
}): MediaKitPreview {
  const { document, profile, battleReports, rateCardPackages = [], publicProofCatalog, t } = input;
  const displayName = profile?.displayName?.trim() || CREATOR_FALLBACK;
  const niche = headlineNiche(profile, document);
  const bio = profile?.bio?.trim() || BIO_PLACEHOLDER_EN;
  const campaignRecap = t?.('mediaKitShare.campaignRecap', { defaultValue: 'Campaign recap' }) ?? 'Campaign recap';

  const preview: MediaKitPreview = {
    headline: `${displayName} | ${niche}`,
    bio,
    aboutTags: document.aboutTags,
    contactEmail: document.contactEmail,
    contactUrl: buildMediaKitContactUrl(slugifyDisplayName(displayName)),
    heroStats: document.heroStats,
    audience: document.audience,
    platforms: document.platforms ?? [],
    partnerships: document.partnerships,
    paymentTerms: document.paymentTerms,
    cases: mergeMediaKitCases(document.cases, battleReports, document.syncBattleReports !== false, campaignRecap),
    publicProofs: resolveMediaKitPublicProofs(publicProofCatalog, document.enabledPublicProofIds),
    inviteCta: document.inviteCta ?? '',
  };

  if (document.platformRates?.length) {
    preview.rateSummaries = rateSummariesFromPlatformRates(document.platformRates, t);
    preview.servicesTable = servicesTableFromPlatformRates(document.platformRates, t);
  } else if (document.syncRateCards) {
    preview.rateSummaries = rateSummariesFromPackages(rateCardPackages, t);
    preview.servicesTable = servicesTableFromPackages(rateCardPackages, t);
  } else {
    preview.rateSummaries = document.rateSummaries?.map((row) => ({
      ...row,
      startingPrice: fromPrice(row.startingPrice, t),
    }));
    preview.servicesTable = document.servicesTable;
  }

  return preview;
}

export function mediaKitRatesSyncedFromPackages(document: MediaKitDocument | undefined): boolean {
  if (!document?.syncRateCards) return false;
  const hasPlatformRates = (document.platformRates ?? []).some(
    (row) => row.platform.trim() && row.priceLabel.trim()
  );
  return !hasPlatformRates;
}
