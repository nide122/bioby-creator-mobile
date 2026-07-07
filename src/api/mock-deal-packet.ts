import { MOCK_DEAL_PACKET_BY_ID } from '@/src/data/mock-deal-catalog';
import type { DealPacketView } from '@/src/types/deal-workflow';
import { mockDelay } from '@/src/lib/mock-delay';

export async function fetchMockDealPacket(dealId: string): Promise<DealPacketView> {
  await mockDelay(200);
  const row = MOCK_DEAL_PACKET_BY_ID[dealId];
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
