import i18n from '@/src/i18n';

import {
  localizeDeliveryFeedbackNote,
  localizeDeliveryTimeline,
  localizeDeliveryUploads,
} from '@/src/lib/delivery-workflow-i18n';
import type { DealDeliveryStep, DealUploadRow } from '@/src/types/deal-workflow';

function t(key: string): string {
  return i18n.t(key);
}

const apiTimeline: DealDeliveryStep[] = [
  {
    id: 'brief',
    title: 'Brief locked',
    due: 'Done',
    status: 'done',
    owner: 'You',
    note: 'Terms confirmed from inbox brief.',
  },
  {
    id: 'kickoff',
    title: 'Kick off production',
    due: 'Within 3 business days',
    status: 'current',
    owner: 'You',
    note: 'Open the packet and confirm deliverables before filming.',
  },
];

const apiUploads: DealUploadRow[] = [
  { id: 'script', title: 'Script draft', state: 'Not started' },
  { id: 'rough', title: 'Rough cut', state: 'Uploaded' },
];

describe('delivery-workflow-i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('localizes timeline steps from API English by step id', () => {
    const localized = localizeDeliveryTimeline(apiTimeline, t);
    expect(localized[0].title).toBe('范围与使用权已确认');
    expect(localized[1].title).toBe('开拍制作');
    expect(localized[1].owner).toBe('你');
    expect(localized[0].status).toBe('done');
    expect(localized[1].status).toBe('current');
  });

  it('localizes upload titles from API English by upload id', () => {
    const localized = localizeDeliveryUploads(apiUploads, t);
    expect(localized[0].title).toBe('脚本');
    expect(localized[1].title).toBe('初剪');
  });

  it('localizes known backend feedback notes', () => {
    expect(
      localizeDeliveryFeedbackNote(
        'Escrow activates after prepay. Upload script → rough → final from the Delivery workspace.',
        t
      )
    ).toBe('预付款入账后托管生效。请在此页依次登记脚本 → 初剪 → 终稿。');
  });
});
