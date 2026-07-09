import { isOpportunityPathClosed } from '@/src/lib/opportunity-path-step';
import { resolveDisplayInboxPriority, type InboxPriorityInput } from '@/src/lib/resolve-inbox-priority';
import type { InboxThread } from '@/src/types/domain';

export type InboxPriorityChip = 'p0' | 'p1' | 'p2' | 'archived';

function asPriorityInput(thread: InboxThread): InboxPriorityInput {
  return thread as unknown as InboxPriorityInput;
}

export function filterThreadsByPriorityChip(threads: InboxThread[], chip: InboxPriorityChip): InboxThread[] {
  if (chip === 'archived') {
    return threads.filter(
      (thread) => !isOpportunityPathClosed(asPriorityInput(thread)) && !resolveDisplayInboxPriority(asPriorityInput(thread)),
    );
  }
  return threads.filter((thread) => resolveDisplayInboxPriority(asPriorityInput(thread)) === chip);
}
