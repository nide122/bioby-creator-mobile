import type { RateCardPackage } from '@/src/types/domain';

export type RateCardPackageDto = {
  id: string;
  externalKey?: string | null;
  name: string;
  payload: Record<string, unknown>;
};

export function mapRateCardDto(dto: RateCardPackageDto): RateCardPackage {
  const p = dto.payload ?? {};
  const deliverables = Array.isArray(p.deliverables) ? (p.deliverables as string[]) : [];
  const highlights = Array.isArray(p.highlights) ? (p.highlights as string[]) : [];
  return {
    id: dto.externalKey ?? dto.id,
    name: dto.name,
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

export type RateCardUpsertRequestDto = {
  packages: Array<{
    id: string;
    name: string;
    tagline: string;
    priceLabel: string;
    deliverables: string[];
    revisionRounds: string;
    usageRights: string;
    prepayLabel: string;
    addOnHint: string;
    highlights: string[];
    recommended?: boolean;
  }>;
};

export function toRateCardUpsertRequest(packages: RateCardPackage[]): RateCardUpsertRequestDto {
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
