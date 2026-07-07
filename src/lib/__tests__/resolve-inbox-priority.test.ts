import {
  countInboxPriorities,
  groupThreadsByInboxPriority,
  resolveDisplayInboxPriority,
} from '@/src/lib/resolve-inbox-priority';
import { isInboxPriorityUiEnabled } from '@/src/lib/inbox-priority-feature';
import { inboxPriorityBadgeTone } from '@/src/lib/inbox-priority-visuals';
import type { InboxThread } from '@/src/types/domain';

function thread(partial: Partial<InboxThread> & Pick<InboxThread, 'id'>): InboxThread {
  return {
    subject: 'Test',
    preview: '',
    updatedAtISO: '2026-06-23T10:00:00Z',
    brandName: 'Brand',
    category: 'commercial',
    leadStage: 'needs_reply',
    ...partial,
  };
}

describe('resolveDisplayInboxPriority', () => {
  it('uses backend inboxPriority when score is present', () => {
    const item = thread({
      id: '1',
      inboxPriority: 'p1',
      priorityScore: 60,
      leadValueBand: 'needs_negotiation',
    });
    expect(resolveDisplayInboxPriority(item)).toBe('p1');
  });

  it('falls back from legacy high_value band', () => {
    const item = thread({ id: '2', leadValueBand: 'high_value' });
    expect(resolveDisplayInboxPriority(item)).toBe('p1');
  });

  it('maps p3 to hidden unless escrow is active', () => {
    const item = thread({
      id: '3',
      inboxPriority: 'p3',
      priorityScore: 10,
      leadValueBand: 'archived',
    });
    expect(resolveDisplayInboxPriority(item)).toBeUndefined();
  });
});

describe('isInboxPriorityUiEnabled', () => {
  it('defaults to true when env is unset', () => {
    const previous = process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED;
    delete process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED;
    expect(isInboxPriorityUiEnabled([])).toBe(true);
    process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED = previous;
  });

  it('detects scored threads without env flag', () => {
    const previous = process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED;
    delete process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED;
    expect(isInboxPriorityUiEnabled([thread({ id: '1', priorityScore: 42 })])).toBe(true);
    process.env.EXPO_PUBLIC_INBOX_PRIORITY_ENABLED = previous;
  });
});

describe('inboxPriorityBadgeTone', () => {
  it('maps p0 to danger', () => {
    expect(inboxPriorityBadgeTone('p0')).toBe('danger');
  });
});

describe('countInboxPriorities', () => {
  it('counts visible buckets only', () => {
    const counts = countInboxPriorities([
      thread({ id: '1', inboxPriority: 'p0', priorityScore: 80 }),
      thread({ id: '2', inboxPriority: 'p1', priorityScore: 70 }),
      thread({ id: '3', inboxPriority: 'p3', priorityScore: 10 }),
    ]);
    expect(counts).toEqual({ p0: 1, p1: 1, p2: 0 });
  });
});

describe('groupThreadsByInboxPriority', () => {
  it('sorts p1 threads by valueSortKey before attention score', () => {
    const grouped = groupThreadsByInboxPriority([
      thread({
        id: 'low-margin',
        inboxPriority: 'p1',
        priorityScore: 90,
        valueSortKey: 200,
        updatedAtISO: '2026-06-23T12:00:00Z',
      }),
      thread({
        id: 'high-margin',
        inboxPriority: 'p1',
        priorityScore: 70,
        valueSortKey: 600,
        updatedAtISO: '2026-06-23T10:00:00Z',
      }),
    ]);
    expect(grouped.p1.map((item) => item.id)).toEqual(['high-margin', 'low-margin']);
  });
});
