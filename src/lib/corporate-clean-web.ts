import { Platform } from 'react-native';

/** Web-only class names from `styles/corporate-clean.css`. No-op on native. */
export const corporateCleanClass = {
  card: 'corporate-clean-card',
  gradient: 'corporate-clean-gradient',
  gradientText: 'corporate-clean-gradient-text',
  frosted: 'corporate-clean-frosted',
  animateIn: 'corporate-clean-animate-in',
  btnPrimary: 'corporate-clean-btn-primary',
  btnSecondary: 'corporate-clean-btn-secondary',
  row: 'corporate-clean-row',
  screen: 'corporate-clean-screen',
  tabBar: 'corporate-clean-tab-bar',
  authShell: 'corporate-clean-auth-shell',
  landingScreen: 'corporate-clean-landing-screen',
  landingHeroViewport: 'landing-hero-viewport',
  landingBottomDock: 'landing-bottom-dock',
  landingBottomLegalRow: 'landing-bottom-legal-row',
  landingHeroGradient: 'landing-hero-gradient',
  landingPreviewWrap: 'landing-preview-wrap',
  landingPreviewStage: 'landing-preview-stage',
  landingPreviewCard: 'landing-preview-card',
  landingPreviewCardInbox: 'landing-preview-card--inbox',
  landingPreviewCardSummary: 'landing-preview-card--summary',
  landingPreviewCardToday: 'landing-preview-card--today',
  landingPreviewFactCell: 'landing-preview-fact-cell',
  landingPreviewNoteBox: 'landing-preview-note-box',
  landingHeroHeadline: 'landing-hero-headline',
  landingHeroTitle: 'landing-hero-title',
  landingHeroSubtitle: 'landing-hero-subtitle',
} as const;

export function webClassName(...classes: Array<string | false | null | undefined>): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const merged = classes.filter(Boolean).join(' ');
  return merged || undefined;
}

export function isCorporateCleanWeb(): boolean {
  return Platform.OS === 'web';
}
