import { formatDeadlineLine, formatDeadlineAt } from '@/src/lib/deadline-display';

const t = (key: string, params?: Record<string, string | number>) => {
  const templates: Record<string, string> = {
    'inboxThreadDetail.deadlineCountdown.kinds.reply_by': '回复截止',
    'inboxThreadDetail.deadlineCountdown.kinds.deliver_by': '交稿截止',
    'inboxThreadDetail.deadlineCountdown.kinds.post_by': '发布截止',
    'inboxThreadDetail.deadlineCountdown.kinds.fallback': '截止时间',
    'inboxThreadDetail.deadlineCountdown.hoursRemaining': `还剩 ${params?.hours} 小时`,
    'inboxThreadDetail.deadlineCountdown.daysRemaining': `还剩 ${params?.days} 天`,
    'inboxThreadDetail.deadlineCountdown.daysOverdue': `已过期 ${params?.days} 天`,
    'inboxThreadDetail.deadlineCountdown.lineWithCountdown': `${params?.kind} · ${params?.date}（${params?.relative}）`,
    'inboxThreadDetail.deadlineCountdown.lineDateOnly': `${params?.kind} · ${params?.date}`,
    'inboxThreadDetail.deadlineCountdown.itemScheduleWithCountdown':
      `${params?.kind} ${params?.date}（${params?.relative}）`,
    'inboxThreadDetail.deadlineCountdown.itemScheduleNoKindWithCountdown':
      `${params?.date}（${params?.relative}）`,
    'inboxThreadDetail.deadlineCountdown.itemScheduleDateOnly': `${params?.kind} ${params?.date}`,
  };
  return templates[key] ?? key;
};

describe('formatDeadlineAt', () => {
  it('formats ISO deadline in zh-CN locale', () => {
    const label = formatDeadlineAt('2026-06-28T12:00:00Z', 'zh-CN');
    expect(label).toBeTruthy();
    expect(label).toMatch(/6/);
  });
});

describe('formatDeadlineLine', () => {
  const now = new Date('2026-06-27T12:00:00Z');

  it('shows kind, date, and remaining days for thread reply deadline', () => {
    const line = formatDeadlineLine(t, {
      atISO: '2026-07-02T12:00:00Z',
      kind: 'reply_by',
      locale: 'zh-CN',
      context: 'thread',
      now,
    });
    expect(line).toMatch(/^回复截止 · /);
    expect(line).toContain('还剩 5 天');
  });

  it('shows kind, date, and overdue days for deliver deadline', () => {
    const line = formatDeadlineLine(t, {
      atISO: '2026-06-20T12:00:00Z',
      kind: 'deliver_by',
      locale: 'zh-CN',
      context: 'thread',
      now,
    });
    expect(line).toMatch(/^交稿截止 · /);
    expect(line).toContain('已过期 7 天');
  });

  it('uses item schedule format for deliverable due dates', () => {
    const line = formatDeadlineLine(t, {
      atISO: '2026-07-02T12:00:00Z',
      kind: 'post_by',
      locale: 'zh-CN',
      context: 'item',
      now,
    });
    expect(line).toMatch(/^发布截止 /);
    expect(line).toContain('还剩 5 天');
  });

  it('falls back to deadline text when ISO is missing', () => {
    const line = formatDeadlineLine(t, {
      text: '48小时内回复',
      locale: 'zh-CN',
      context: 'thread',
      now,
    });
    expect(line).toBe('48小时内回复');
  });
});
