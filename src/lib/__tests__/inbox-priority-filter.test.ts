import { filterThreadsByPriorityChip } from '@/src/lib/inbox-priority-filter';
import { resolveDisplayInboxPriority } from '@/src/lib/resolve-inbox-priority';
import type { InboxThread } from '@/src/types/domain';

const baseThread = (overrides: Partial<InboxThread>): InboxThread => ({
  id: 'thread-1',
  subject: 'Collab request',
  preview: 'Preview',
  updatedAtISO: new Date().toISOString(),
  brandName: 'Glow Skin',
  category: 'commercial',
  leadStage: 'new',
  ...overrides,
});

describe('filterThreadsByPriorityChip', () => {
  it('filters visible priority buckets', () => {
    const threads = [
      baseThread({ id: 'p0', inboxPriority: 'p0', priorityScore: 90 }),
      baseThread({ id: 'p1', inboxPriority: 'p1', priorityScore: 70 }),
      baseThread({ id: 'archived', inboxPriority: 'p3', priorityScore: 10 }),
    ];

    expect(filterThreadsByPriorityChip(threads, 'p0').map((thread) => thread.id)).toEqual(['p0']);
    expect(filterThreadsByPriorityChip(threads, 'p1').map((thread) => thread.id)).toEqual(['p1']);
    expect(filterThreadsByPriorityChip(threads, 'archived').map((thread) => thread.id)).toEqual(['archived']);
  });

  it('uses display priority for archived bucket', () => {
    const thread = baseThread({ id: 'hidden', inboxPriority: 'p3', priorityScore: 5 });
    expect(resolveDisplayInboxPriority(thread as unknown as import('@/src/lib/resolve-inbox-priority').InboxPriorityInput)).toBeUndefined();
    expect(filterThreadsByPriorityChip([thread], 'archived')).toHaveLength(1);
  });
});
