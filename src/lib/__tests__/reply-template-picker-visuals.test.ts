import { groupReplyTemplatesForPicker, plainReplyTemplatePreview } from '@/src/lib/reply-template-picker-visuals';
import { DEFAULT_REPLY_TEMPLATES } from '@/src/lib/default-reply-templates';

describe('reply-template-picker-visuals', () => {
  it('builds plain preview without inline field chips', () => {
    const preview = plainReplyTemplatePreview(
      'Hi ⟦brandName⟧,\n\nThanks for ⟦cooperationTitle⟧.',
    );
    expect(preview).toBe('Hi …, Thanks for ….');
    expect(preview).not.toContain('⟦');
  });

  it('groups negotiation templates separately', () => {
    const grouped = groupReplyTemplatesForPicker(DEFAULT_REPLY_TEMPLATES);
    expect(grouped.negotiation).toHaveLength(4);
    expect(grouped.general).toHaveLength(2);
  });
});
