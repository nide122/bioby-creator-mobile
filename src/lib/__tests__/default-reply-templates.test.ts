import { DEFAULT_REPLY_TEMPLATES, mergeDefaultReplyTemplates } from '@/src/lib/default-reply-templates';
import type { ReplyTemplate } from '@/src/types/reply-template';

describe('mergeDefaultReplyTemplates', () => {
  it('adds missing built-in negotiation templates', () => {
    const existing: ReplyTemplate[] = [
      {
        id: 'tpl-custom',
        name: 'My custom',
        body: 'Hi',
        variables: [],
        isDefault: false,
        sortOrder: 99,
        updatedAtISO: '2025-01-01T00:00:00.000Z',
      },
    ];

    const merged = mergeDefaultReplyTemplates(existing);

    expect(merged).toHaveLength(DEFAULT_REPLY_TEMPLATES.length + 1);
    expect(merged.some((row) => row.id === 'tpl-shrink-scope')).toBe(true);
    expect(merged.some((row) => row.id === 'tpl-request-usage-rights')).toBe(true);
    expect(merged.some((row) => row.id === 'tpl-custom')).toBe(true);
  });
});
