import type { DecisionCard } from '@/src/types/domain';
import { useDecisionQueueStore } from '@/src/stores/decision-queue-store';

const sampleCard: DecisionCard = {
  id: 'dec-test',
  category: 'payout',
  entityName: 'Test Brand',
  headline: 'Test decision',
  aiNote: 'Test note',
  actions: [
    { id: 'go', label: 'Go', style: 'primary' },
    { id: 'later', label: 'Later', style: 'ghost' },
  ],
};

describe('decision-queue-store', () => {
  beforeEach(() => {
    useDecisionQueueStore.getState().clearEntries();
  });

  it('tracks resolve and defer dispositions', () => {
    useDecisionQueueStore.getState().resolve(sampleCard, 'Go');
    useDecisionQueueStore.getState().defer(sampleCard);

    const entries = useDecisionQueueStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0].disposition).toBe('resolved');
    expect(entries[1].disposition).toBe('deferred');
  });

  it('undoLast removes the latest entry', () => {
    useDecisionQueueStore.getState().defer(sampleCard);
    useDecisionQueueStore.getState().undoLast();
    expect(useDecisionQueueStore.getState().entries).toHaveLength(0);
  });

  it('reprocessDeferred drops deferred items only', () => {
    useDecisionQueueStore.getState().resolve(sampleCard, 'Go');
    useDecisionQueueStore.getState().defer({ ...sampleCard, id: 'dec-test-2' });
    useDecisionQueueStore.getState().reprocessDeferred();

    const entries = useDecisionQueueStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].disposition).toBe('resolved');
  });
});
