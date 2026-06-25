import { resolveOpportunityReplyDraftId } from '@/src/lib/opportunity-reply-draft';

describe('resolveOpportunityReplyDraftId', () => {
  it('prefers aiReply when present', () => {
    expect(resolveOpportunityReplyDraftId({ aiReply: '10', quote: '20' })).toBe('10');
  });

  it('falls back to quote when aiReply is empty', () => {
    expect(resolveOpportunityReplyDraftId({ aiReply: '', quote: '20' })).toBe('20');
  });
});
