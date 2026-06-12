import type {
  MediaKitDocument,
  MediaKitPreview,
  RateCardPackage,
  ProposalPreview,
} from '@/src/types/domain';
import i18n from '@/src/i18n';
import { buildMediaKitPreview } from '@/src/lib/media-kit-preview';
import { defaultPlatformRates } from '@/src/lib/media-kit-formats';
import { MOCK_BATTLE_REPORTS } from '@/src/api/mock-battle-reports';
import { MOCK_PUBLIC_PROOF_ITEMS } from '@/src/api/mock-trust';
import { battleReportToCaseCard } from '@/src/lib/battle-report-media-kit';
import { toCreatorPublicSnapshot } from '@/src/lib/media-kit-creator-snapshot';
import { mockDelay } from '@/src/lib/mock-delay';
import { useSessionStore } from '@/src/stores/session-store';

let growthQueryFailOnce = false;

/** Make the next Growth / Media Kit mock fetch fail once, for retry-state testing. */
export function primeMockGrowthQueryFailure() {
  growthQueryFailOnce = true;
}

function throwIfGrowthQueryPrimed() {
  if (growthQueryFailOnce) {
    growthQueryFailOnce = false;
    throw new Error('Network is unstable. Try again.');
  }
}

let RATE_CARD_PACKAGES: RateCardPackage[] = [
  {
    id: 'short-video',
    name: 'Short-form video',
    tagline: 'Best for first sponsored test',
    priceLabel: '$1.8k–$3.2k',
    deliverables: ['1 vertical video', 'Caption + required disclosure', 'Organic usage preview'],
    revisionRounds: '1 script round + 1 edit round',
    usageRights: 'Organic owned-channel use for 60 days',
    prepayLabel: '50% prepay before production',
    addOnHint: 'Paid usage, remix edits, or whitelisting priced separately.',
    highlights: ['Good fit when the brand has a clear brief.', 'Keeps rights narrow until performance is proven.'],
  },
  {
    id: 'launch-bundle',
    name: 'Launch bundle',
    tagline: 'Recommended for product launches',
    priceLabel: '$2.8k–$4.8k',
    deliverables: ['2 short-form videos', '2 script rounds', 'Launch-window posting plan'],
    revisionRounds: '2 script rounds + 1 final edit round',
    usageRights: 'Organic campaign use for 90 days',
    prepayLabel: '50% prepay, remainder after verification',
    addOnHint: 'Extra revision rounds and usage extensions trigger a new quote.',
    highlights: ['Balances proof, timing, and rate clarity.', 'Works well for skincare, lifestyle, and product education.'],
    recommended: true,
  },
  {
    id: 'live-plus-clips',
    name: 'Live + clips',
    tagline: 'High-touch activation',
    priceLabel: '$5k+',
    deliverables: ['1 live session', '3 clipped edits', 'Post-live recap metrics'],
    revisionRounds: 'Run-of-show approval + clip selection',
    usageRights: 'Organic recap use for 90 days',
    prepayLabel: '60% prepay before calendar hold',
    addOnHint: 'Paid amplification and exclusivity require manual approval.',
    highlights: ['Use only when calendar, brand assets, and claims review are ready.', 'Protects creator time with a stronger prepay rule.'],
  },
  {
    id: 'rights-extension',
    name: 'Rights extension',
    tagline: 'Add-on, not default',
    priceLabel: '+$900+',
    deliverables: ['Usage extension', 'Paid social edit review', 'Whitelist terms check'],
    revisionRounds: 'Scoped separately',
    usageRights: 'Term, channel, region, and edits must be named',
    prepayLabel: 'Prepay before rights are granted',
    addOnHint: 'Never bundle long-term or paid usage into the base quote.',
    highlights: ['Designed to make broad rights explicit.', 'Always requires manual review before sending.'],
  },
];

const PROPOSALS: Record<string, ProposalPreview> = {
  sample: {
    id: 'sample',
    title: 'Short-form collaboration proposal',
    brandHint: 'ClearSkin Lab · Skincare',
    creatorDisplayName: 'Mia Skin Notes',
    executiveSummary:
      'Recommended package: two short-form videos with standard organic usage. Claims review window included before publish.',
    skuLines: [
      {
        id: 'sku-1',
        platform: 'TikTok',
        deliverable: '2 vertical short-form videos, including 2 script rounds',
        turnaroundLabel: 'First publish within 12 business days',
        priceLabel: '$2,800+',
      },
      {
        id: 'sku-2',
        platform: 'Add-on',
        deliverable: 'Paid social edit / remix rights',
        turnaroundLabel: 'Timeline scoped separately',
        priceLabel: '+$900+',
      },
    ],
    rightsBullets: [
      'Default usage: organic campaign use + owned channels for 90 days.',
      'Paid usage, remix, and long-term retention require separate approval.',
    ],
    paymentBullets: [
      'Recommended path: prepay -> delivery -> verification -> settlement.',
      'This proposal is not a contract until both sides confirm the packet.',
    ],
    riskBullets: [
      'Claims may require brand legal review.',
      'Extra revision rounds may change fee or timing.',
    ],
  },
};

const MEDIA_KIT_DOCUMENT: MediaKitDocument = {
  aboutTags: ['Skincare education', 'Ingredient-first reviews', 'Family-friendly tone'],
  contactEmail: 'partnerships@miaskinnotes.example',
  heroStats: [
    { label: 'Monthly TikTok views', value: '1.2M' },
    { label: 'Monthly IG reach', value: '420K' },
    { label: 'YouTube monthly views', value: '90K' },
  ],
  audience: {
    topLocations: 'US 62% · Canada 18% · UK 8%',
    genderAge: 'Women 25–44 (primary) · Men 18–34 (secondary)',
    postingCadence: '3–4 posts / week across TikTok + IG',
  },
  platforms: [
    {
      name: 'TikTok',
      followersRange: '380k–520k',
      nicheNote: 'Skincare reviews · Stable hit rate',
      monthlyViews: '~1.2M / mo',
      handle: 'miaskinnotes',
    },
    {
      name: 'Instagram',
      followersRange: '120k–180k',
      nicheNote: 'Reels + carousel education',
      monthlyViews: '~420K reach / mo',
      handle: 'miaskinnotes',
    },
    {
      name: 'YouTube',
      followersRange: '60k–90k',
      nicheNote: 'Long-form reviews and recaps',
      monthlyViews: '~90K views / mo',
      handle: 'MiaSkinNotes',
    },
  ],
  partnerships: ['ClearSkin Lab', 'TrailPeak Gear', 'GlowNest', 'PureLeaf Co.'],
  paymentTerms: '* Fees due before production begins. 50% prepay to hold calendar.',
  cases: [
    {
      id: 'case-1',
      title: 'ClearSkin Lab | Barrier repair launch',
      industry: 'Skincare · UGC',
      resultSummary: '+22% CTR vs. category benchmark',
      outcomeNote: 'First publish in 48h; disclosure passed first check.',
    },
    {
      id: 'case-2',
      title: 'TrailPeak Gear | Camping light unboxing',
      industry: 'Outdoor · Lifestyle',
      resultSummary: '1.4M views · verification cleared in 24h',
      outcomeNote: 'Links and timestamps complete; moved cleanly into verification.',
    },
  ],
  inviteCta: 'Email with brief, timeline, and budget range — I reply within 2 business days.',
  platformRates: defaultPlatformRates(),
  syncRateCards: false,
  syncBattleReports: true,
  enabledPublicProofIds: ['proof-tm-punctual', 'proof-tm-disclosure'],
};

function buildMockMediaKitPreview(document: MediaKitDocument): MediaKitPreview {
  return buildMediaKitPreview({
    document,
    profile: useSessionStore.getState().profileBasics,
    battleReports: MOCK_BATTLE_REPORTS,
    rateCardPackages: RATE_CARD_PACKAGES,
    publicProofCatalog: MOCK_PUBLIC_PROOF_ITEMS,
    t: i18n.t.bind(i18n),
  });
}

export async function fetchMockRateCardPackages(): Promise<RateCardPackage[]> {
  await mockDelay(160);
  throwIfGrowthQueryPrimed();
  return structuredClone(RATE_CARD_PACKAGES);
}

export async function upsertMockRateCardPackages(packages: RateCardPackage[]): Promise<RateCardPackage[]> {
  await mockDelay(180);
  if (packages.length === 0) {
    throw new Error('rate_card_packages_required');
  }
  RATE_CARD_PACKAGES = structuredClone(packages);
  return structuredClone(RATE_CARD_PACKAGES);
}

export async function fetchMockProposalPreview(proposalId: string): Promise<ProposalPreview> {
  await mockDelay(140);
  const proposal = PROPOSALS[proposalId];
  if (!proposal) {
    throw new Error(`proposal_not_found:${proposalId}`);
  }
  const mediaKitPreview = buildMockMediaKitPreview(MEDIA_KIT_DOCUMENT);
  return {
    ...proposal,
    creatorSnapshot: toCreatorPublicSnapshot(mediaKitPreview),
  };
}

export async function fetchMockMediaKitDocument(): Promise<MediaKitDocument> {
  await mockDelay(120);
  throwIfGrowthQueryPrimed();
  return structuredClone(MEDIA_KIT_DOCUMENT);
}

export async function upsertMockMediaKitDocument(document: MediaKitDocument): Promise<MediaKitDocument> {
  await mockDelay(140);
  Object.assign(MEDIA_KIT_DOCUMENT, document);
  return structuredClone(MEDIA_KIT_DOCUMENT);
}

export async function fetchMockMediaKitPreview(): Promise<MediaKitPreview> {
  await mockDelay(130);
  throwIfGrowthQueryPrimed();
  return buildMockMediaKitPreview(MEDIA_KIT_DOCUMENT);
}

export async function importMockBattleReportToMediaKit(
  reportId: string,
  campaignRecapLabel = 'Campaign recap'
): Promise<MediaKitDocument> {
  await mockDelay(120);
  const report = MOCK_BATTLE_REPORTS.find((row) => row.id === reportId);
  if (!report) {
    throw new Error(`battle_report_not_found:${reportId}`);
  }
  report.shareableToMediaKit = true;
  const caseCard = battleReportToCaseCard(report, campaignRecapLabel);
  const existing = MEDIA_KIT_DOCUMENT.cases ?? [];
  if (!existing.some((row) => row.id === caseCard.id)) {
    MEDIA_KIT_DOCUMENT.cases = [...existing, caseCard];
  }
  return structuredClone(MEDIA_KIT_DOCUMENT);
}
