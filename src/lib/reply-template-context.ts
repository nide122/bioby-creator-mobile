import type {
  InboxDeliverablePackage,
  InboxRiskFlag,
  InboxThread,
  InboxThreadDetail,
  RateCardPackage,
} from '@/src/types/domain';
import type { RenderReplyTemplateInput } from '@/src/types/reply-template';

function joinList(values?: string[] | null): string | undefined {
  if (!values?.length) return undefined;
  const joined = values.map((v) => v.trim()).filter(Boolean).join(', ');
  return joined || undefined;
}

export function formatPackagesSummary(packages?: InboxDeliverablePackage[] | null): string | undefined {
  if (!packages?.length) return undefined;
  const lines = packages
    .filter((pkg) => pkg.deliverable?.trim())
    .map((pkg) => {
      const label = pkg.deliverable.trim();
      return pkg.budgetLabel?.trim() ? `${label} (${pkg.budgetLabel.trim()})` : label;
    });
  return lines.length ? lines.join('; ') : undefined;
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
};

export function buildReplyTemplateContext(input: BuildReplyTemplateContextInput): RenderReplyTemplateInput {
  const thread = input.thread;
  const selectedPackage = pickRateCardPackage(input.rateCardPackages, input.rateCardPackageId);

  return {
    opportunityId: input.opportunityId ?? thread?.id,
    brandName: thread?.brandName,
    cooperationTitle: thread?.subject,
    creatorName: input.creatorName,
    budgetLabel: thread?.budgetLabel,
    deliverables: joinList(thread?.deliverables),
    postingSchedule: thread?.postingSchedule,
    usageRights: joinList(thread?.usageRights),
    packagesSummary: formatPackagesSummary(thread?.packages),
    primaryRisk: resolvePrimaryRisk(thread),
    recommendedPackage: formatRecommendedPackage(selectedPackage),
    rateCardFloor: resolveRateCardFloor(input.rateCardPackages),
    rateCardPackageId: input.rateCardPackageId ?? selectedPackage?.id,
  };
}
