const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isEmailLikeLabel(value?: string | null): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  return EMAIL_LIKE.test(trimmed) || (trimmed.includes('@') && !trimmed.includes(' '));
}

/** Prefer cooperation title when brand label is a raw sender email. */
export function preferCooperationTitle(options: {
  brand?: string | null;
  title?: string | null;
}): string {
  const title = options.title?.trim() ?? '';
  const brand = options.brand?.trim() ?? '';
  if (title && isEmailLikeLabel(brand)) return title;
  return brand || title;
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
  if (!resolvedBrand || isEmailLikeLabel(resolvedBrand)) return false;
  return resolvedBrand !== resolvedTitle;
}
