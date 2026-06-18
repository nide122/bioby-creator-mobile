import {
  globalRulesProcessingScope,
  rulesProcessingScope,
  threadUsesRulesProcessing,
} from '@/src/lib/ai-processing-labels';

describe('ai-processing-labels', () => {
  it('detects thread-level rules usage', () => {
    expect(threadUsesRulesProcessing({ classificationSource: 'llm', briefExtractionSource: 'llm' })).toBe(false);
    expect(threadUsesRulesProcessing({ classificationSource: 'rules', briefExtractionSource: 'llm' })).toBe(true);
    expect(rulesProcessingScope({ classificationSource: 'rules', briefExtractionSource: 'llm' })).toBe('classification');
    expect(rulesProcessingScope({ classificationSource: 'llm', briefExtractionSource: 'rules' })).toBe('brief');
    expect(rulesProcessingScope({ classificationSource: 'rules', briefExtractionSource: 'rules' })).toBe('both');
  });

  it('detects global rules mode from mailbox capabilities', () => {
    expect(
      globalRulesProcessingScope({
        classificationMode: 'llm',
        briefExtractionMode: 'llm',
        classificationLlmConfigured: true,
        briefLlmConfigured: true,
        rulesFallbackEnabled: true,
      })
    ).toBeNull();
    expect(
      globalRulesProcessingScope({
        classificationMode: 'rules',
        briefExtractionMode: 'rules',
        classificationLlmConfigured: false,
        briefLlmConfigured: false,
        rulesFallbackEnabled: true,
      })
    ).toBe('both');
  });
});
