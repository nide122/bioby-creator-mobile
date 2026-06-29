import type { ReplyTemplate } from '@/src/types/reply-template';

const SHRINK_SCOPE_BODY = `Hi ⟦brandName⟧,

Thanks for sharing the brief. Based on the current scope (⟦deliverables⟧) and the budget noted (⟦budgetLabel⟧), I want to align on a package that works for both sides.

Options I can offer:
- Reduce deliverables or usage rights to fit the budget
- Adjust review rounds or timeline (⟦postingSchedule⟧)
- A lighter package with clear boundaries on what is included

If you share which elements are must-haves vs. flexible, I can send a revised scope and quote.`;

const ASK_MORE_MONEY_BODY = `Hi ⟦brandName⟧,

Thanks for the brief. For the scope you outlined (⟦deliverables⟧) and usage (⟦usageRights⟧), my rate-card floor for this type of work starts around ⟦rateCardFloor⟧.

The budget mentioned (⟦budgetLabel⟧) is below what I can deliver at that scope. To move forward, we could:
- Increase the budget to align with the deliverables and usage
- Adjust scope or usage so pricing matches your target
- Split into phases with separate pricing

Happy to find a structure that works once budget and scope are aligned.`;

const ASK_EXTENSION_BODY = `Hi ⟦brandName⟧,

Thanks for the update on this collaboration.

Given the current deliverables (⟦deliverables⟧) and the timeline noted (⟦postingSchedule⟧), I need a bit more time to deliver at the quality level we agreed on.

Could we extend the publish / delivery date? Once you confirm a revised deadline, I will update my quote and schedule accordingly.

Current budget reference: ⟦budgetLabel⟧.`;

const REQUEST_USAGE_RIGHTS_BODY = `Hi ⟦brandName⟧,

Before I finalize pricing, I want to align on usage rights for this campaign.

From the brief, usage looks like: ⟦usageRights⟧.
Deliverables: ⟦deliverables⟧.
Budget noted: ⟦budgetLabel⟧.

Could you share written authorization or license terms (channels, duration, exclusivity, paid vs. organic use)? Once usage is documented, I can confirm a quote that reflects those rights.`;

export const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: 'tpl-quote-follow',
    name: 'Quote follow-up',
    body: 'Hi ⟦brandName⟧,\n\nThanks for reaching out about ⟦cooperationTitle⟧. I can share a structured quote once we confirm ⟦deliverables⟧, usage, and ⟦postingSchedule⟧.\n\nBest,\n⟦creatorName⟧',
    variables: ['brandName', 'cooperationTitle', 'deliverables', 'postingSchedule', 'creatorName'],
    isDefault: true,
    sortOrder: 0,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-scope-clarify',
    name: 'Clarify scope',
    body: 'Hi ⟦brandName⟧,\n\nBefore I quote on ⟦cooperationTitle⟧, could you confirm revision rounds, usage rights, and the target publish window?\n\nThanks,\n⟦creatorName⟧',
    variables: ['brandName', 'cooperationTitle', 'creatorName'],
    isDefault: false,
    sortOrder: 1,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-shrink-scope',
    name: 'Reduce scope',
    body: SHRINK_SCOPE_BODY,
    variables: ['brandName', 'deliverables', 'budgetLabel', 'postingSchedule'],
    isDefault: false,
    sortOrder: 2,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-ask-more-money',
    name: 'Ask for higher rate',
    body: ASK_MORE_MONEY_BODY,
    variables: ['brandName', 'deliverables', 'usageRights', 'rateCardFloor', 'budgetLabel'],
    isDefault: false,
    sortOrder: 3,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-ask-extension',
    name: 'Request extension',
    body: ASK_EXTENSION_BODY,
    variables: ['brandName', 'deliverables', 'postingSchedule', 'budgetLabel'],
    isDefault: false,
    sortOrder: 4,
    updatedAtISO: new Date().toISOString(),
  },
  {
    id: 'tpl-request-usage-rights',
    name: 'Written usage rights',
    body: REQUEST_USAGE_RIGHTS_BODY,
    variables: ['brandName', 'usageRights', 'deliverables', 'budgetLabel'],
    isDefault: false,
    sortOrder: 5,
    updatedAtISO: new Date().toISOString(),
  },
];

export function mergeDefaultReplyTemplates(templates: ReplyTemplate[]): ReplyTemplate[] {
  const byId = new Map(templates.map((row) => [row.id, row]));
  for (const seed of DEFAULT_REPLY_TEMPLATES) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, seed);
    }
  }
  return [...byId.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
