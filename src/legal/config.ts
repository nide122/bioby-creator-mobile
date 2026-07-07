/** Public legal / OAuth compliance copy — override via EXPO_PUBLIC_* at build time. */
export const legalConfig = {
  /** Chinese trade / display name */
  companyName: process.env.EXPO_PUBLIC_LEGAL_COMPANY_NAME?.trim() || '百拜科技',
  /** Registered English legal entity name */
  companyLegalNameEn:
    process.env.EXPO_PUBLIC_LEGAL_COMPANY_LEGAL_NAME_EN?.trim() ||
    'Bioby AI Technology (HK) Limited',
  registeredAddress:
    process.env.EXPO_PUBLIC_LEGAL_REGISTERED_ADDRESS?.trim() ||
    'Unit C, 9/F Winning House, No.72-76 Wing Lok Street, Sheung Wan, Hong Kong',
  privacyEmail: process.env.EXPO_PUBLIC_LEGAL_PRIVACY_EMAIL?.trim() || 'hello@bioby.ai',
  supportEmail: process.env.EXPO_PUBLIC_LEGAL_SUPPORT_EMAIL?.trim() || 'hello@bioby.ai',
  legalEmail: process.env.EXPO_PUBLIC_LEGAL_EMAIL?.trim() || 'hello@bioby.ai',
  effectiveDate: process.env.EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE?.trim() || '2026-06-26',
} as const;

/** Locale-aware strings derived from {@link legalConfig}. */
export const legalEntityLabels = {
  dataControllerZh: `${legalConfig.companyName}（${legalConfig.companyLegalNameEn}）`,
  dataControllerEn: legalConfig.companyLegalNameEn,
  registeredAddressZh: `注册地址：${legalConfig.registeredAddress}`,
  registeredAddressEn: `Registered address: ${legalConfig.registeredAddress}`,
} as const;
