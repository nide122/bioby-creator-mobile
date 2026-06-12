import type {
  MediaKitAudience,
  MediaKitCaseCard,
  ContentFormatKey,
  CreatorPublicSnapshot,
  MediaKitDocument,
  MediaKitHeroStat,
  MediaKitPlatformRow,
  MediaKitPreview,
  MediaKitRateSummary,
  MediaKitSectionId,
  MediaKitServiceRow,
  PlatformRateEntry,
  ProposalPreview,
  PublicProofItem,
} from '@/src/types/domain';

import { normalizeStartingPrice } from '@/src/lib/media-kit-preview';
import { resolveMediaKitContactUrl } from '@/src/lib/media-kit-contact-url';

type JsonObject = Record<string, unknown>;

function headlineDisplayName(headline: string | undefined): string | undefined {
  if (!headline?.trim()) return undefined;
  const name = headline.split('|')[0]?.trim();
  return name || undefined;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
}

function mapHeroStats(raw: unknown): MediaKitHeroStat[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const label = asString(row.label);
      const value = asString(row.value);
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((r): r is MediaKitHeroStat => r != null);
}

function mapPlatforms(raw: unknown): MediaKitPlatformRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MediaKitPlatformRow[] = [];
  for (const item of raw) {
    const row = item as JsonObject;
    const name = asString(row.name);
    if (!name) continue;
    const platform: MediaKitPlatformRow = {
      name,
      followersRange: asString(row.followersRange) ?? '',
      nicheNote: asString(row.nicheNote) ?? '',
    };
    const monthlyViews = asString(row.monthlyViews);
    const handle = asString(row.handle);
    if (monthlyViews) platform.monthlyViews = monthlyViews;
    if (handle) platform.handle = handle;
    rows.push(platform);
  }
  return rows;
}

function mapCases(raw: unknown): MediaKitCaseCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const id = asString(row.id);
      const title = asString(row.title);
      if (!id || !title) return null;
      return {
        id,
        title,
        industry: asString(row.industry) ?? '',
        outcomeNote: asString(row.outcomeNote) ?? '',
        resultSummary: asString(row.resultSummary) ?? undefined,
      };
    })
    .filter((r): r is MediaKitCaseCard => r != null);
}

function mapRateSummaries(raw: unknown): MediaKitRateSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const id = asString(row.id) ?? asString(row.title);
      const title = asString(row.title);
      const startingPrice = asString(row.startingPrice);
      if (!id || !title || !startingPrice) return null;
      return {
        id,
        title,
        startingPrice: normalizeStartingPrice(startingPrice),
        description: asString(row.description) ?? '',
      };
    })
    .filter((r): r is MediaKitRateSummary => r != null);
}

function mapServicesTable(raw: unknown): MediaKitServiceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const service = asString(row.service);
      const fee = asString(row.fee);
      if (!service || !fee) return null;
      return { service, fee };
    })
    .filter((r): r is MediaKitServiceRow => r != null);
}

const FORMAT_KEYS: ContentFormatKey[] = [
  'image_post',
  'carousel',
  'short_video',
  'long_video',
  'story',
  'live',
  'mention',
];

function isFormatKey(value: string): value is ContentFormatKey {
  return (FORMAT_KEYS as string[]).includes(value);
}

function mapPlatformRates(raw: unknown): PlatformRateEntry[] {
  if (!Array.isArray(raw)) return [];
  const rows: PlatformRateEntry[] = [];
  for (const item of raw) {
    const row = item as JsonObject;
    const id = asString(row.id);
    const platform = asString(row.platform);
    const formatRaw = asString(row.formatKey);
    const priceLabel = asString(row.priceLabel);
    if (!id || !platform || !formatRaw || !priceLabel || !isFormatKey(formatRaw)) continue;
    rows.push({
      id,
      platform,
      formatKey: formatRaw,
      priceLabel,
      note: asString(row.note),
    });
  }
  return rows;
}

function mapPublicProofs(raw: unknown): PublicProofItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const id = asString(row.id);
      const trustMetricId = asString(row.trustMetricId);
      const label = asString(row.label);
      const value = asString(row.value);
      if (!id || !trustMetricId || !label || !value) return null;
      const proof: PublicProofItem = { id, trustMetricId, label, value };
      const trendNote = asString(row.trendNote);
      const disclaimer = asString(row.disclaimer);
      if (trendNote) proof.trendNote = trendNote;
      if (disclaimer) proof.disclaimer = disclaimer;
      return proof;
    })
    .filter((r): r is PublicProofItem => r != null);
}

function mapSectionOrder(raw: unknown): MediaKitSectionId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<MediaKitSectionId>([
    'about',
    'stats',
    'trust_proof',
    'audience',
    'channels',
    'rates',
    'services',
    'partnerships',
    'cases',
    'contact',
  ]);
  const order = raw
    .map((item) => String(item).trim() as MediaKitSectionId)
    .filter((id) => allowed.has(id));
  return order.length ? order : undefined;
}

function mapCreatorSnapshot(raw: unknown): CreatorPublicSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const root = raw as JsonObject;
  const headline = asString(root.headline);
  const bio = asString(root.bio);
  if (!headline || !bio) return undefined;
  return {
    headline,
    bio,
    heroStats: mapHeroStats(root.heroStats),
    platforms: mapPlatforms(root.platforms),
    cases: mapCases(root.cases),
  };
}

function mapAudience(raw: unknown): MediaKitAudience | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as JsonObject;
  const audience: MediaKitAudience = {
    topLocations: asString(row.topLocations),
    genderAge: asString(row.genderAge),
    postingCadence: asString(row.postingCadence),
  };
  if (!audience.topLocations && !audience.genderAge && !audience.postingCadence) {
    return undefined;
  }
  return audience;
}

export function mapMediaKitDocument(dto: unknown): MediaKitDocument {
  const root = (dto && typeof dto === 'object' ? dto : {}) as JsonObject;
  return {
    aboutTags: Array.isArray(root.aboutTags)
      ? root.aboutTags.map((t) => String(t)).filter(Boolean)
      : [],
    contactEmail: asString(root.contactEmail),
    heroStats: mapHeroStats(root.heroStats),
    audience: mapAudience(root.audience),
    platforms: mapPlatforms(root.platforms),
    rateSummaries: mapRateSummaries(root.rateSummaries),
    servicesTable: mapServicesTable(root.servicesTable),
    partnerships: Array.isArray(root.partnerships)
      ? root.partnerships.map((p) => String(p)).filter(Boolean)
      : [],
    paymentTerms: asString(root.paymentTerms),
    cases: mapCases(root.cases),
    inviteCta: asString(root.inviteCta),
    platformRates: mapPlatformRates(root.platformRates),
    syncRateCards: root.syncRateCards == null ? false : Boolean(root.syncRateCards),
    syncBattleReports: root.syncBattleReports == null ? true : Boolean(root.syncBattleReports),
    enabledPublicProofIds: Array.isArray(root.enabledPublicProofIds)
      ? root.enabledPublicProofIds.map((id) => String(id)).filter(Boolean)
      : undefined,
    sectionOrder: mapSectionOrder(root.sectionOrder),
  };
}

export function mapMediaKitDto(dto: unknown): MediaKitPreview {
  const root = (dto && typeof dto === 'object' ? dto : {}) as JsonObject;
  const headline = asString(root.headline) ?? 'Creator Media Kit';
  const preview: MediaKitPreview = {
    headline,
    bio: asString(root.bio) ?? '',
    aboutTags: Array.isArray(root.aboutTags)
      ? root.aboutTags.map((t) => String(t)).filter(Boolean)
      : [],
    contactEmail: asString(root.contactEmail),
    contactUrl: asString(root.contactUrl),
    heroStats: mapHeroStats(root.heroStats),
    audience: mapAudience(root.audience),
    platforms: mapPlatforms(root.platforms),
    rateSummaries: mapRateSummaries(root.rateSummaries),
    servicesTable: mapServicesTable(root.servicesTable),
    partnerships: Array.isArray(root.partnerships)
      ? root.partnerships.map((p) => String(p)).filter(Boolean)
      : [],
    paymentTerms: asString(root.paymentTerms),
    cases: mapCases(root.cases),
    publicProofs: mapPublicProofs(root.publicProofs),
    inviteCta: asString(root.inviteCta) ?? '',
  };
  return {
    ...preview,
    contactUrl: resolveMediaKitContactUrl(preview.contactUrl, headlineDisplayName(headline)),
  };
}

export function mapPublicMediaKitPayload(dto: unknown): {
  preview: MediaKitPreview;
  sectionOrder?: MediaKitSectionId[];
} {
  const root = (dto && typeof dto === 'object' ? dto : {}) as JsonObject;
  return {
    preview: mapMediaKitDto(root),
    sectionOrder: mapSectionOrder(root.sectionOrder),
  };
}

function mapProposalSkuLines(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as JsonObject;
      const id = asString(row.id);
      const platform = asString(row.platform);
      const deliverable = asString(row.deliverable);
      const turnaroundLabel = asString(row.turnaroundLabel);
      const priceLabel = asString(row.priceLabel);
      if (!id || !platform || !deliverable || !turnaroundLabel || !priceLabel) return null;
      return { id, platform, deliverable, turnaroundLabel, priceLabel };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);
}

function mapStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item)).filter(Boolean);
}

export function mapProposalPreview(dto: unknown): ProposalPreview {
  const root = (dto && typeof dto === 'object' ? dto : {}) as JsonObject;
  const id = asString(root.id) ?? 'sample';
  return {
    id,
    title: asString(root.title) ?? 'Proposal',
    brandHint: asString(root.brandHint) ?? '',
    creatorDisplayName: asString(root.creatorDisplayName) ?? 'Creator',
    executiveSummary: asString(root.executiveSummary) ?? '',
    skuLines: mapProposalSkuLines(root.skuLines),
    rightsBullets: mapStringList(root.rightsBullets),
    paymentBullets: mapStringList(root.paymentBullets),
    riskBullets: mapStringList(root.riskBullets),
    creatorSnapshot: mapCreatorSnapshot(root.creatorSnapshot),
  };
}
