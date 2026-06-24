import {
  bodyToDisplayText,
  displayTextToBody,
  insertInlineFieldAt,
  normalizeInlineDelete,
  removeFieldKeyFromBody,
} from '@/src/lib/reply-template-inline-text';

const t = (key: string) =>
  ({
    'replyTemplateFields.brandName': '品牌方',
    'replyTemplateFields.cooperationTitle': '合作标题',
    'replyTemplateFields.deliverables': '交付物',
  })[key] ?? key;

describe('reply-template-inline-text', () => {
  it('round-trips body tokens through inline display labels', () => {
    const body = '欢迎你，⟦brandName⟧，我的交付物是：⟦deliverables⟧';
    const display = bodyToDisplayText(body, t);
    expect(display).toBe('欢迎你，【品牌方】，我的交付物是：【交付物】');
    expect(displayTextToBody(display, t)).toBe(body);
  });

  it('inserts inline label at cursor without breaking surrounding text', () => {
    const inserted = insertInlineFieldAt('欢迎你，', { start: 3, end: 3 }, 'brandName', t);
    expect(inserted.text).toBe('欢迎你【品牌方】，');
  });

  it('removes a whole inline label when backspacing inside it', () => {
    const display = '你好【品牌方】世界';
    const normalized = normalizeInlineDelete(display, '你好世界', { start: 5, end: 5 }, t);
    expect(normalized?.text).toBe('你好世界');
  });

  it('removes all occurrences of a field key from body', () => {
    expect(removeFieldKeyFromBody('⟦brandName⟧和⟦brandName⟧', 'brandName')).toBe('和');
  });
});
