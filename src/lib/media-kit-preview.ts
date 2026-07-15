import type { TFunction } from 'i18next';

import { battleReportOutcome } from '@/src/lib/battle-report-media-kit';
import { buildMediaKitContactUrl, slugifyDisplayName } from '@/src/lib/media-kit-contact-url';
import { migrateLegacyProfileBasics } from '@/src/lib/creator-profile-aggregate';
import { resolveMediaKitPreviewPlatforms } from '@/src/lib/platform-matrix-sync';
import type { CreatorProfileBasics } from '@/src/stores/session-store';
import { resolveMediaKitPublicProofs } from '@/src/lib/public-proof';
import type {
  BattleReportSummary,
  MediaKitCaseCard,
  MediaKitDocument,
  MediaKitPreview,
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
  const aboutTags = resolveMediaKitAboutTags(profile, document);
  if (aboutTags?.length) {
    return aboutTags.slice(0, 2).join(' · ');
  }
  return CREATOR_FALLBACK;
}

export function resolveMediaKitAboutTags(
  profile: CreatorProfileBasics | null | undefined,
  document: MediaKitDocument,
): string[] | undefined {
  if (profile?.nicheTags?.length) {
    return profile.nicheTags;
  }
  return document.aboutTags?.length ? document.aboutTags : undefined;
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
    aboutTags: resolveMediaKitAboutTags(profile, document),
    contactEmail: document.contactEmail,
    contactUrl: buildMediaKitContactUrl(slugifyDisplayName(displayName)),
    heroStats: document.heroStats,
    audience: document.audience,
    platforms: resolveMediaKitPreviewPlatforms(
      document.platforms,
      profile ? migrateLegacyProfileBasics(profile).platformProfiles : undefined,
    ),
    partnerships: document.partnerships,
    paymentTerms: document.paymentTerms,
    cases: mergeMediaKitCases(document.cases, battleReports, document.syncBattleReports !== false, campaignRecap),
    publicProofs: resolveMediaKitPublicProofs(publicProofCatalog, document.enabledPublicProofIds),
    inviteCta: document.inviteCta ?? '',
  };

  const publicPackages = document.publicPackageIds === undefined
    ? rateCardPackages
    : rateCardPackages.filter((pkg) => document.publicPackageIds?.includes(pkg.id));
  preview.rateSummaries = rateSummariesFromPackages(publicPackages, t);
  preview.servicesTable = servicesTableFromPackages(publicPackages, t);

  return preview;
}

export function mediaKitRatesSyncedFromPackages(document: MediaKitDocument | undefined): boolean {
  return document !== undefined;
}
