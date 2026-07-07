import type {
  InboxDeliverablePackage,
  InboxRiskFlag,
  InboxThread,
  InboxThreadDetail,
  RateCardPackage,
} from '@/src/types/domain';
import type { RenderReplyTemplateInput } from '@/src/types/reply-template';
import { resolveOpportunityBrandLabel } from '@/src/lib/cooperation-display-name';

function joinList(values?: string[] | null): string | undefined {
  if (!values?.length) return undefined;
  const joined = values.map((v) => v.trim()).filter(Boolean).join(', ');
  return joined || undefined;
}

export function formatPackagesSummary(packages?: InboxDeliverablePackage[] | null): string | undefined {
  if (!packages?.length) return undefined;
  const lines = packages
    .map((pkg) => {
      const items = (pkg.items ?? [])
        .map((item) => item.name?.trim())
        .filter(Boolean)
        .join(' + ');
      if (!items) return null;
      const prefix = pkg.label?.trim() ? `${pkg.label.trim()}: ` : '';
      const summary = `${prefix}${items}`;
      return pkg.quoteDisplay?.trim() ? `${summary} (${pkg.quoteDisplay.trim()})` : summary;
    })
    .filter((line): line is string => !!line);
  return lines.length ? lines.join('; ') : undefined;
}

function flatItemNames(packages?: InboxDeliverablePackage[] | null): string[] {
  if (!packages?.length) return [];
  return packages.flatMap((pkg) =>
    (pkg.items ?? []).map((item) => item.name?.trim()).filter((name): name is string => !!name),
  );
}

function firstItemSchedule(packages?: InboxDeliverablePackage[] | null): string | undefined {
  for (const pkg of packages ?? []) {
    for (const item of pkg.items ?? []) {
      if (item.dueAtText?.trim()) return item.dueAtText.trim();
    }
  }
  return undefined;
}

export function resolvePrimaryRisk(thread?: {
  riskLabel?: string;
  riskFlags?: InboxRiskFlag[];
  contractRiskPreview?: InboxRiskFlag;
}): string | undefined {
  if (thread?.riskLabel?.trim()) return thread.riskLabel.trim();
  const flags = thread?.riskFlags ?? [];
  const ordered = [...flags].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const top = ordered[0]?.label?.trim();
  if (top) return top;
  return thread?.contractRiskPreview?.label?.trim() || undefined;
}

function severityRank(severity: InboxRiskFlag['severity']): number {
  if (severity === 'danger') return 3;
  if (severity === 'warning') return 2;
  return 1;
}

export function formatRecommendedPackage(pkg?: RateCardPackage | null): string | undefined {
  if (!pkg) return undefined;
  const name = pkg.name?.trim() ?? '';
  const price = pkg.priceLabel?.trim() ?? '';
  if (name && price) return `${name} — ${price}`;
  return name || price || undefined;
}

export function pickRateCardPackage(
  packages?: RateCardPackage[] | null,
  rateCardPackageId?: string,
): RateCardPackage | undefined {
  if (!packages?.length) return undefined;
  if (rateCardPackageId) {
    const match = packages.find((pkg) => pkg.id === rateCardPackageId);
    if (match) return match;
  }
  return packages.find((pkg) => pkg.recommended) ?? packages[0];
}

export function resolveRateCardFloor(packages?: RateCardPackage[] | null): string | undefined {
  const pkg = pickRateCardPackage(packages);
  return pkg?.priceLabel?.trim() || undefined;
}

export type BuildReplyTemplateContextInput = {
  opportunityId?: string;
  thread?: Partial<InboxThreadDetail> & Partial<InboxThread>;
  creatorName?: string;
  rateCardPackages?: RateCardPackage[];
  rateCardPackageId?: string;
  /** UI-resolved brand label — wins over raw mailbox sender in thread.brandName. */
  displayBrandName?: string;
  /** Cooperation title when thread.subject is missing. */
  displayCooperationTitle?: string;
};

export function buildReplyTemplateContext(input: BuildReplyTemplateContextInput): RenderReplyTemplateInput {
  const thread = input.thread;
  const selectedPackage = pickRateCardPackage(input.rateCardPackages, input.rateCardPackageId);
  const brandName =
    input.displayBrandName?.trim() ||
    resolveOpportunityBrandLabel(thread?.brandName, thread?.subject, thread?.claimedBrandName) ||
    undefined;

  return {
    opportunityId: input.opportunityId ?? thread?.id,
    brandName,
    cooperationTitle: input.displayCooperationTitle?.trim() || thread?.subject,
    creatorName: input.creatorName,
    budgetDisplay: thread?.budgetDisplay,
    deliverables: joinList(flatItemNames(thread?.packages)),
    postingSchedule: firstItemSchedule(thread?.packages),
    usageRights: joinList(thread?.usageRights),
    packagesSummary: formatPackagesSummary(thread?.packages),
    primaryRisk: resolvePrimaryRisk(thread),
    recommendedPackage: formatRecommendedPackage(selectedPackage),
    rateCardFloor: resolveRateCardFloor(input.rateCardPackages),
    rateCardPackageId: input.rateCardPackageId ?? selectedPackage?.id,
  };
}
