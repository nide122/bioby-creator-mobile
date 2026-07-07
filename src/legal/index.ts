import { normalizeLocale } from '@/src/i18n';
import i18n from '@/src/i18n';

import { homeByLocale } from './home-content';
import { privacyByLocale } from './privacy-content';
import { termsByLocale } from './terms-content';

export function resolveLegalLocale() {
  return normalizeLocale(i18n.language);
}

export function getPrivacyDocument() {
  return privacyByLocale[resolveLegalLocale()];
}

export function getTermsDocument() {
  return termsByLocale[resolveLegalLocale()];
}

export function getHomeContent() {
  return homeByLocale[resolveLegalLocale()];
}
