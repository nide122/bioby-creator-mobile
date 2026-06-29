const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const ANGLE_ADDR = /^(.+?)\s*<([^>]+)>$/;
const COMPACT_ANGLE_ADDR = /^[^<@\s]+<[^>@]+@[^>]+>$/i;

export function isEmailLikeLabel(value?: string | null): boolean {
  return isSenderLikeLabel(value);
}

/** Raw mailbox / RFC5322 sender strings that should not be shown as brand names. */
export function isSenderLikeLabel(value?: string | null): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  if (EMAIL_LIKE.test(trimmed)) return true;
  if (trimmed.includes('@') && !trimmed.includes(' ')) return true;
  const angle = trimmed.match(ANGLE_ADDR);
  if (angle) {
    const addr = angle[2]?.trim() ?? '';
    return EMAIL_LIKE.test(addr) || (addr.includes('@') && !addr.includes(' '));
  }
  if (COMPACT_ANGLE_ADDR.test(trimmed)) return true;
  if (trimmed.includes('@') && (trimmed.includes('<') || trimmed.includes('>'))) return true;
  return false;
}

/** Prefer cooperation title when brand label is a raw sender email. */
export function preferCooperationTitle(options: {
  brand?: string | null;
  title?: string | null;
}): string {
  const title = options.title?.trim() ?? '';
  const brand = options.brand?.trim() ?? '';
  if (title && isSenderLikeLabel(brand)) return title;
  return brand || title;
}

/** Best-effort brand label for chips — never a mailbox address. */
export function resolveOpportunityBrandLabel(
  brand?: string | null,
  title?: string | null,
  claimedBrandName?: string | null,
): string | null {
  const claimed = claimedBrandName?.trim();
  if (claimed && !isSenderLikeLabel(claimed)) return claimed;
  const brandTrim = brand?.trim() ?? '';
  if (brandTrim && !isSenderLikeLabel(brandTrim)) return brandTrim;
  return null;
}

/** Header/lead line: title only when brand is an email; otherwise brand · title. */
export function cooperationLeadLine(brand?: string | null, title?: string | null): string {
  const resolvedTitle = title?.trim() ?? '';
  const resolvedBrand = preferCooperationTitle({ brand, title });
  if (!resolvedTitle || resolvedBrand === resolvedTitle) return resolvedBrand;
  return `${resolvedBrand} · ${resolvedTitle}`;
}

/** Show distinct brand eyebrow only when it adds context beyond the title. */
export function shouldShowCooperationBrandEyebrow(brand?: string | null, title?: string | null): boolean {
  const resolvedBrand = brand?.trim() ?? '';
  const resolvedTitle = title?.trim() ?? '';
  if (!resolvedBrand || isSenderLikeLabel(resolvedBrand)) return false;
  return resolvedBrand !== resolvedTitle;
}
