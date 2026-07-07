import type { RateCardPackageView, RateCardUpsertRequest } from '@/src/types/api';
import type { RateCardPackage } from '@/src/types/domain';

/** @deprecated Use RateCardPackageView from `@/src/types/api`. */
export type RateCardPackageDto = RateCardPackageView;

/** @deprecated Use RateCardUpsertRequest from `@/src/types/api`. */
export type RateCardUpsertRequestDto = RateCardUpsertRequest;

export function mapRateCardDto(dto: RateCardPackageView): RateCardPackage {
  const p = (dto.payload ?? {}) as Record<string, unknown>;
  const deliverables = Array.isArray(p.deliverables) ? (p.deliverables as string[]) : [];
  const highlights = Array.isArray(p.highlights) ? (p.highlights as string[]) : [];
  return {
    id: dto.externalKey ?? dto.id ?? '',
    name: dto.name ?? '',
    tagline: String(p.tagline ?? ''),
    priceLabel: String(p.priceLabel ?? ''),
    deliverables,
    revisionRounds: String(p.revisionRounds ?? ''),
    usageRights: String(p.usageRights ?? ''),
    prepayLabel: String(p.prepayLabel ?? ''),
    addOnHint: String(p.addOnHint ?? ''),
    highlights,
    recommended: p.recommended === true,
  };
}

export function toRateCardUpsertRequest(packages: RateCardPackage[]): RateCardUpsertRequest {
  return {
    packages: packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      tagline: pkg.tagline,
      priceLabel: pkg.priceLabel,
      deliverables: pkg.deliverables,
      revisionRounds: pkg.revisionRounds,
      usageRights: pkg.usageRights,
      prepayLabel: pkg.prepayLabel,
      addOnHint: pkg.addOnHint,
      highlights: pkg.highlights,
      recommended: pkg.recommended ? true : undefined,
    })),
  };
}
