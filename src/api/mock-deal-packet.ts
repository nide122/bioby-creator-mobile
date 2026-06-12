import type { DealPacketView } from '@/src/types/deal-workflow';
import { mockDelay } from '@/src/lib/mock-delay';

const MOCK_PACKETS: Record<string, DealPacketView> = {
  'mock-deal-alpha': {
    dealId: 'mock-deal-alpha',
    title: '2 short videos | Claims review',
    brandPlaceholder: 'ClearSkin Lab',
    packet: {
      summary: 'Deliver and publish against packet, then move to verification.',
      deliverables: [
        { label: 'Deliverables', value: '2 short-form videos + pinned #ad disclosure' },
        { label: 'Publish window', value: 'First publish within 12 business days' },
        { label: 'Disclosure', value: '#ad in caption + pinned comment' },
        { label: 'Usage rights', value: 'Organic + owned channels · 90 days' },
      ],
      delivery: {
        timeline: [
          { id: 'brief', title: 'Brief locked', due: 'Done', status: 'done', owner: 'You', note: 'Aligned to packet.' },
          { id: 'script', title: 'Script approved', due: 'Done', status: 'done', owner: 'Creator', note: 'Two revision rounds.' },
          {
            id: 'rough-cut',
            title: 'Rough cut review',
            due: 'Due May 22',
            status: 'current',
            owner: 'Brand',
            note: '48h review window.',
          },
          {
            id: 'final',
            title: 'Final delivery',
            due: 'After approval',
            status: 'upcoming',
            owner: 'Creator',
            note: 'Move to verification after upload.',
          },
        ],
        uploads: [
          { id: 'script', title: 'Script v2', state: 'Approved' },
          { id: 'rough', title: 'Rough cut v1', state: 'In review' },
          { id: 'final', title: 'Final export', state: 'Not started' },
        ],
        feedbackNote: 'Brand is reviewing rough cut v1.',
      },
    },
  },
  'mock-deal-beta': {
    dealId: 'mock-deal-beta',
    title: 'Camping light unboxing + overlay',
    brandPlaceholder: 'TrailPeak Gear',
    packet: {
      summary: 'Post link submitted. Screenshots and metrics still needed.',
      deliverables: [
        { label: 'Deliverables', value: '1 unboxing + overlay edit' },
        { label: 'Publish window', value: 'Within 10 business days' },
        { label: 'Disclosure', value: '#ad + affiliate note if applicable' },
        { label: 'Usage rights', value: 'Organic · 90 days' },
      ],
      verification: {
        evidence: [
          { id: 'post-link', status: 'done' },
          { id: 'screenshot', status: 'reviewing' },
          { id: 'metrics', status: 'missing' },
        ],
        checklist: [
          { id: 'fit', passed: true },
          { id: 'quality', passed: true },
          { id: 'response', passed: true },
          { id: 'published', passed: true },
          { id: 'format', passed: false },
          { id: 'access', passed: true },
          { id: 'compliance', passed: true },
        ],
        payoutHint: 'Release after verification passes.',
      },
    },
  },
};

export async function fetchMockDealPacket(dealId: string): Promise<DealPacketView> {
  await mockDelay();
  const row = MOCK_PACKETS[dealId];
  if (!row) {
    return {
      dealId,
      title: 'Deal packet',
      brandPlaceholder: 'Brand',
      packet: {
        summary: 'Packet terms will appear here when connected to API.',
        deliverables: [],
      },
    };
  }
  return row;
}
