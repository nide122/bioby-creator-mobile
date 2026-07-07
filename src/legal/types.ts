export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  intro?: string[];
  sections: LegalSection[];
};

export type MarketingFeature = {
  title: string;
  body: string;
};

export type MarketingHomeContent = {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroNote: string;
  /** Punctuation or text immediately after the privacy-policy link (e.g. "." in English). */
  heroNoteAfterLink?: string;
  aboutTitle: string;
  aboutParagraphs: string[];
  featuresTitle: string;
  features: MarketingFeature[];
  trustTitle: string;
  trustBullets: string[];
  ctaPrimary: string;
  ctaSecondary: string;
};
