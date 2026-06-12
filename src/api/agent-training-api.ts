import { apiRequest } from '@/src/api/api-client';
import { shouldUseBackendApi } from '@/src/api/should-use-backend-api';
import type { AgentTrainingRule } from '@/src/stores/agent-training-store';
import type { InboxEmailCategory } from '@/src/types/domain';

export type AgentTrainingRuleDto = {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAtISO: string;
};

function mapRule(dto: AgentTrainingRuleDto): AgentTrainingRule {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    category: dto.category as InboxEmailCategory,
    createdAtISO: dto.createdAtISO,
  };
}

export async function fetchAgentTrainingRules(): Promise<AgentTrainingRule[]> {
  if (!shouldUseBackendApi()) return [];
  const items = await apiRequest<AgentTrainingRuleDto[]>('/api/v1/account/agent-training-rules');
  return items.map(mapRule);
}

export async function createAgentTrainingRule(
  input: Omit<AgentTrainingRule, 'id' | 'createdAtISO'>
): Promise<AgentTrainingRule> {
  if (!shouldUseBackendApi()) {
    return {
      ...input,
      id: `rule-local-${Date.now()}`,
      createdAtISO: new Date().toISOString(),
    };
  }
  const created = await apiRequest<AgentTrainingRuleDto>('/api/v1/account/agent-training-rules', {
    method: 'POST',
    body: {
      category: input.category,
      title: input.title,
      description: input.description,
    },
  });
  return mapRule(created);
}

export async function clearAgentTrainingRules(): Promise<void> {
  if (!shouldUseBackendApi()) return;
  await apiRequest('/api/v1/account/agent-training-rules', { method: 'DELETE' });
}
