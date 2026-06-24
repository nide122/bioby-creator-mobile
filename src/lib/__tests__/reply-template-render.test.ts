import {
  extractReplyTemplateVariables,
  normalizeReplyTemplateBody,
  parseReplyTemplateBody,
  renderReplyTemplate,
  serializeReplyTemplateBody,
} from '@/src/lib/reply-template-render';

describe('reply-template-render', () => {
  it('normalizes legacy placeholders into field tokens', () => {
    expect(normalizeReplyTemplateBody('Hi {{brandName}}, re {{threadSubject}}')).toBe(
      'Hi ⟦brandName⟧, re ⟦cooperationTitle⟧',
    );
  });

  it('extracts unique field keys in order', () => {
    expect(
      extractReplyTemplateVariables('Hi ⟦brandName⟧, re ⟦cooperationTitle⟧ and ⟦brandName⟧'),
    ).toEqual(['brandName', 'cooperationTitle']);
  });

  it('parses and serializes colored tag tokens', () => {
    const segments = parseReplyTemplateBody('Hi ⟦brandName⟧ there');
    expect(serializeReplyTemplateBody(segments)).toBe('Hi ⟦brandName⟧ there');
  });

  it('replaces known fields and keeps unknown tokens', () => {
    const rendered = renderReplyTemplate('Hi ⟦brandName⟧, thanks for ⟦cooperationTitle⟧ and ⟦missing⟧.', {
      brandName: 'Glow Recipe',
      cooperationTitle: 'TikTok launch',
    });
    expect(rendered).toBe('Hi Glow Recipe, thanks for TikTok launch and ⟦missing⟧.');
  });

  it('uses localized labels when values are missing', () => {
    const rendered = renderReplyTemplate('Hi ⟦brandName⟧', {}, {
      missingLabel: () => '品牌方',
    });
    expect(rendered).toBe('Hi 品牌方');
  });
});
