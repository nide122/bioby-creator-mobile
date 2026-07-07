import type { RateCardPackage } from '@/src/types/domain';

export function reorderRateCardPackages(
  packages: RateCardPackage[],
  fromId: string,
  toId: string,
): RateCardPackage[] {
  if (fromId === toId) return packages;
  const fromIndex = packages.findIndex((pkg) => pkg.id === fromId);
  const toIndex = packages.findIndex((pkg) => pkg.id === toId);
  if (fromIndex < 0 || toIndex < 0) return packages;

  const next = [...packages];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function hasSamePackageOrder(a: RateCardPackage[], b: RateCardPackage[]): boolean {
  return a.length === b.length && a.every((pkg, index) => pkg.id === b[index]?.id);
}
