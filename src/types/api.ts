/**
 * Thin aliases over OpenAPI-generated wire types.
 * UI/domain unions live in `domain.ts`; mappers narrow string fields at the boundary.
 */
import type { components } from '@/src/types/generated/api';

export type { components, operations, paths } from '@/src/types/generated/api';

export type DecisionActionView = components['schemas']['DecisionActionView'];
export type DecisionCardView = components['schemas']['DecisionCardView'];
export type TodayDecisionsResponse = components['schemas']['TodayDecisionsResponse'];

export type DraftListItemView = components['schemas']['DraftListItemView'];
export type DraftDetailView = components['schemas']['DraftDetailView'];
export type GeneratedReplyDraftView = components['schemas']['GeneratedReplyDraftView'];
export type SuggestedReplyPurposeView = components['schemas']['SuggestedReplyPurposeView'];

export type OpportunityMessageStatsView = components['schemas']['OpportunityMessageStatsView'];
export type OpportunityListItemView = components['schemas']['OpportunityListItemView'];
export type OpportunityListPageView = components['schemas']['OpportunityListPageView'];
export type OpportunityDetailView = components['schemas']['OpportunityDetailView'];
export type ContractSummaryView = components['schemas']['ContractSummaryView'];
export type BriefView = components['schemas']['BriefView'];
export type OpportunityTimelineView = components['schemas']['OpportunityTimelineView'];
export type LatestApprovedScriptView = components['schemas']['LatestApprovedScriptView'];

export type DealListItemView = components['schemas']['DealListItemView'];
/** Wire DTO from GET /deals/{id}/packet — UI shape is `deal-workflow`.DealPacketView */
export type DealPacketWireView = components['schemas']['DealPacketView'];
export type DealFulfillmentStatusWireView = components['schemas']['DealFulfillmentStatusView'];

export type AccountOverviewView = components['schemas']['AccountOverviewView'];
export type CreatorProfileView = components['schemas']['CreatorProfileView'];
export type CreatorVerificationView = components['schemas']['CreatorVerificationView'];
export type OnboardingStatusView = components['schemas']['OnboardingStatusView'];
export type OnboardingStepStatusView = components['schemas']['OnboardingStepStatusView'];
export type SubscriptionUsageView = components['schemas']['SubscriptionUsageView'];
export type TeamRoleView = components['schemas']['TeamRoleView'];
export type MailboxConnectionView = components['schemas']['MailboxConnectionView'];
export type MailboxOverviewView = components['schemas']['MailboxOverviewView'];
export type MailboxOAuthProviderStatusView = components['schemas']['MailboxOAuthProviderStatusView'];

export type PaymentLineView = components['schemas']['PaymentLineView'];
export type PaymentsOverviewView = components['schemas']['PaymentsOverviewView'];
export type DisputeCaseView = components['schemas']['DisputeCaseView'];

export type ReplyTemplateView = components['schemas']['ReplyTemplateView'];
export type RenderedReplyTemplateView = components['schemas']['RenderedReplyTemplateView'];

export type TrustMetricView = components['schemas']['TrustMetricView'];

export type RateCardPackageView = components['schemas']['RateCardPackageView'];
export type RateCardUpsertRequest = components['schemas']['RateCardUpsertRequest'];
export type RateCardPackageInput = components['schemas']['RateCardPackageInput'];

export type BattleReportView = components['schemas']['BattleReportView'];
