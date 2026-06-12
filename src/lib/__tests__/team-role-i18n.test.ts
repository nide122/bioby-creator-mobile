import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { localizeTeamRole } from '@/src/lib/team-role-i18n';
import type { TeamRoleCard } from '@/src/types/domain';

const agentRole: TeamRoleCard = {
  id: 'agent',
  title: 'Agent',
  summary: 'Handles pitch triage, drafts, and delivery progress.',
  allowed: ['Process inbox leads', 'Generate and edit drafts', 'Move delivery and verification forward'],
  denied: ['Remove inbox access', 'Change payout account'],
};

describe('team-role-i18n', () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'zh',
      resources: {
        zh: {
          translation: {
            teamSettingsScreen: {
              roleCards: {
                agent: {
                  title: '经办',
                  summary: '负责商机筛选、草稿撰写及交付进度推进。',
                  allowed: {
                    processInboxLeads: '处理收件箱线索',
                    generateEditDrafts: '生成与编辑草稿',
                    moveDeliveryForward: '推进交付与验收',
                  },
                  denied: {
                    removeInboxAccess: '移除收件箱接入',
                    changePayoutAccount: '修改收款账户',
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('localizes team role cards by stable id', () => {
    const localized = localizeTeamRole(agentRole, i18n.t.bind(i18n));

    expect(localized.title).toBe('经办');
    expect(localized.summary).toBe('负责商机筛选、草稿撰写及交付进度推进。');
    expect(localized.allowed).toEqual(['处理收件箱线索', '生成与编辑草稿', '推进交付与验收']);
    expect(localized.denied).toEqual(['移除收件箱接入', '修改收款账户']);
  });
});
