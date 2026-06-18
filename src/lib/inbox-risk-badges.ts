export type InboxActionReason = { code: string; message: string };

export const INBOX_RISK_REASON_CODES = ['DANGER_TERMS', 'BROAD_USAGE', 'DEADLINE_48H'] as const;

export type InboxRiskReasonCode = (typeof INBOX_RISK_REASON_CODES)[number];

export function inboxRiskReasons(
  actionReasons?: InboxActionReason[],
  limit = 2
): InboxActionReason[] {
  if (!actionReasons?.length) return [];
  return actionReasons.filter((reason) => INBOX_RISK_REASON_CODES.includes(reason.code as InboxRiskReasonCode)).slice(0, limit);
}

export function inboxRiskBadgeTone(code: string): 'warning' | 'neutral' {
  return code === 'DANGER_TERMS' || code === 'DEADLINE_48H' ? 'warning' : 'warning';
}
