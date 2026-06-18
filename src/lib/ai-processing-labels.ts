import type { AiProcessingSource, InboxThreadDetail } from '@/src/types/domain';

export type AiProcessingMode = AiProcessingSource;

export type AiProcessingCapabilities = {
  classificationMode: AiProcessingMode;
  briefExtractionMode: AiProcessingMode;
  classificationLlmConfigured: boolean;
  briefLlmConfigured: boolean;
  rulesFallbackEnabled: boolean;
};

export function threadUsesRulesProcessing(thread: {
  classificationSource?: AiProcessingSource;
  briefExtractionSource?: AiProcessingSource;
}): boolean {
  return thread.classificationSource === 'rules' || thread.briefExtractionSource === 'rules';
}

export type RulesProcessingScope = 'classification' | 'brief' | 'both';

export function rulesProcessingScope(thread: {
  classificationSource?: AiProcessingSource;
  briefExtractionSource?: AiProcessingSource;
}): RulesProcessingScope | null {
  const classificationRules = thread.classificationSource === 'rules';
  const briefRules = thread.briefExtractionSource === 'rules';
  if (classificationRules && briefRules) return 'both';
  if (classificationRules) return 'classification';
  if (briefRules) return 'brief';
  return null;
}

export function globalRulesProcessingScope(
  capabilities?: AiProcessingCapabilities | null
): RulesProcessingScope | null {
  if (!capabilities) return null;
  const classificationRules = capabilities.classificationMode === 'rules';
  const briefRules = capabilities.briefExtractionMode === 'rules';
  if (classificationRules && briefRules) return 'both';
  if (classificationRules) return 'classification';
  if (briefRules) return 'brief';
  return null;
}

export function rulesScopeI18nKey(
  scope: RulesProcessingScope,
  prefix: 'inboxScreen.aiRulesBannerBody' | 'inboxThreadDetail.aiRulesCalloutBody'
): `${typeof prefix}.${RulesProcessingScope}` {
  return `${prefix}.${scope}`;
}

export function isRulesSource(source?: AiProcessingSource | null): source is 'rules' {
  return source === 'rules';
}

export function detailShowsBriefRules(thread: InboxThreadDetail): boolean {
  return (
    thread.category === 'commercial' &&
    thread.extractionStatus !== 'SKIPPED' &&
    thread.briefExtractionSource === 'rules'
  );
}
