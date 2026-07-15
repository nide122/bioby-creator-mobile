import type { PriorityAssessmentView } from '@/src/lib/priority-assessment';

/** UI 领域类型 — 对齐 PRD；API wire 类型见 src/types/generated/api.ts 与 src/types/api.ts */

import type { PresetPlatformKey } from '@/src/types/creator-profile';

// ─── Decision Queue ────────────────────────────────────────────────────────

/** 决策卡类型 — 对应创作者需要拍板的场景 */
export type DecisionCategory =
  | 'payout'        // 款项被阻塞，需要上传证明
  | 'opportunity'   // 平台推荐机会 / 品牌报价待决策
  | 'approval'      // AI 起草的回复/报价草稿待审批
  | 'delivery'      // 交付里程碑待操作
  | 'verification'; // 验证/存证待提交

export type DecisionActionStyle = 'primary' | 'secondary' | 'ghost';

export type DecisionAction = {
  id: string;
  label: string;
  style: DecisionActionStyle;
  /** 点击后跳转路径（与 onPressKey 二选一） */
  href?: string;
};

export type DecisionCard = {
  id: string;
  category: DecisionCategory;
  /** 品牌名或上下文实体名 */
  entityName: string;
  /** AI 从 evaluation_snapshot 提取的品牌名（与收件箱列表一致） */
  claimedBrandName?: string;
  /** 一行标题 */
  headline: string;
  /** AI 判断理由 — 用第一人称 "我" 代表 AI */
  aiNote: string;
  /** 紧迫性补充说明（可选） */
  urgencyNote?: string;
  /** 为什么这件事会进入 Today / 触发打扰 */
  interruptReason?: string;
  /** 金额/预算标签（可选） */
  amountLabel?: string;
  /** 来源说明：告知创作者这张卡源于哪封邮件或哪个订单 */
  sourceHint?: string;
  /** 点击来源跳转的路径 */
  sourceHref?: string;
  /** 机会类决策卡对应的价值档 — 用于高价值/需谈判配色 */
  leadValueBand?: LeadValueBand;
  /** P 档 — 优先于 leadValueBand 展示 */
  inboxPriority?: InboxPriority;
  /** Contract risks surfaced on opportunity decision cards. */
  contractRiskFlags?: InboxRiskFlag[];
  /** Estimated minutes to complete this decision (from API). */
  estimatedMinutes?: number;
  actions: DecisionAction[];
};

export type AiActionKind =
  | 'classified'
  | 'archived'
  | 'risk_flagged'
  | 'drafted'
  | 'recommended'
  | 'corrected';

export type AiActionLogEntry = {
  id: string;
  kind: AiActionKind;
  title: string;
  description: string;
  occurredAtISO: string;
  sourceHref?: string;
};

/** PRD §8.3：Creator 可见资金与结案阶段 */
export type EscrowLifecyclePhase =
  | 'awaiting_prepay'
  | 'escrowed'
  | 'in_execution'
  | 'pending_verification'
  | 'settled'
  | 'remediation'
  | 'disputed';

/** Backend BrandOpportunity.pipelinePhase — deal lifecycle on the opportunity row. */
export type OpportunityPipelinePhase =
  | 'INQUIRY'
  | 'NEGOTIATION'
  | 'CONTRACTED'
  | 'PRODUCTION'
  | 'BRAND_REVIEW'
  | 'REVISION'
  | 'SCHEDULED'
  | 'LIVE'
  | 'INVOICING'
  | 'CLOSED';

/** AI Inbox 线索阶段（Negotiation / Proposal 之前序） */
export type InboxLeadStage =
  | 'new'
  | 'needs_reply'
  | 'draft_ready'
  | 'quoted'
  | 'negotiating';

/** AI 分类：商务合作 vs 其他类型邮件 */
export type InboxEmailCategory =
  | 'commercial'   // 付费合作、报价、赞助
  | 'pr_sample'    // 寄样/试用，无付费
  | 'media'        // 媒体采访、内容合作
  | 'personal'     // 粉丝私信、个人邮件
  | 'spam'         // 垃圾营销
  | 'other';       // 未能明确分类

export type LeadValueBand = 'high_value' | 'needs_negotiation' | 'archived';

/** Inbox priority tier — aligned with backend InboxPriority wire values. */
export type InboxPriority = 'p0' | 'p1' | 'p2' | 'p3';

export type PriorityBreakdown = {
  brandFit: number;
  budgetValue: number;
  timelineUrgency: number;
  relationshipValue: number;
  effort: number;
  risk: number;
  rulesVersion?: string | null;
};

export type InboxMessageStats = {
  total: number;
  received: number;
  sent: number;
  unread: number;
  unreadReceived: number;
  unreadSent: number;
};

export type AiProcessingSource = 'llm' | 'rules' | 'snapshot';

export type MoneyAmount = {
  amount: number;
  currency: string;
};

export type InboxThread = {
  id: string;
  subject: string;
  preview: string;
  updatedAtISO: string;
  brandName: string;
  brandId?: string;
  claimedBrandName?: string;
  /** AI 自动分类结果 */
  category: InboxEmailCategory;
  /** 行动档 — 对齐后端 ActionTier */
  actionTier?: 'DECIDE_NOW' | 'DEVELOP' | 'AUTO_HANDLED';
  /** 价值档 — 对齐后端 LeadValueBand（过渡期） */
  leadValueBand?: LeadValueBand;
  /** P0–P3 优先级（PR-P3） */
  inboxPriority?: InboxPriority;
  priorityScore?: number | null;
  valueSortKey?: number | null;
  dealEconomics?: PriorityAssessmentView['dealEconomics'];
  priorityAssessment?: PriorityAssessmentView | null;
  priorityBreakdown?: PriorityBreakdown | null;
  classificationSortScore?: number;
  /** 可解释分类/分档理由 */
  actionReasons?: { code: string; message: string }[];
  /** 预算区间展示文案（摘录自信号，非成交价承诺） */
  budgetDisplay?: string;
  budgetAmount?: MoneyAmount;
  riskLabel?: string;
  /** Primary contract risk from brief extraction (list API). */
  contractRiskPreview?: InboxRiskFlag;
  ownerLabel?: string;
  nextActionLabel?: string;
  /** Number of source emails grouped into this opportunity/thread. */
  messageCount?: number;
  messageStats?: InboxMessageStats;
  leadStage: InboxLeadStage;
  /** AI 抽取的结构化信号 · 仅占位 */
  signals?: string[];
  /** 分类阶段摘要（LLM 或规则） */
  classificationSummary?: string;
  /** 多封邮件线程尚无线程级分类 snapshot（历史数据待 backfill） */
  classificationPending?: boolean;
  classificationSignals?: string[];
  /** Creator 已在服务端纠偏分类 */
  userCorrected?: boolean;
  classificationCorrectedAtISO?: string;
  classificationSource?: AiProcessingSource;
  briefExtractionSource?: AiProcessingSource;
  budgetFloorRatio?: number;
  exceptionalBudget?: boolean;
  pipelinePhase?: OpportunityPipelinePhase;
  dealEscrowPhase?: EscrowLifecyclePhase;
  /** Linked deal when the opportunity has been escalated. */
  dealId?: string;
  /** List/detail risk flags (detail payloads may include full sets). */
  riskFlags?: InboxRiskFlag[];
  packages?: InboxDeliverablePackage[];
  deliverables?: string[];
};

export type InboxMessageDirection = 'inbound' | 'outbound';

export type InboxMessage = {
  id: string;
  sentAtISO: string;
  fromLabel: string;
  snippet: string;
  subject?: string;
  direction?: InboxMessageDirection;
  read?: boolean;
  attachmentCount?: number;
};

export type InboxRiskSeverity = 'info' | 'warning' | 'danger';

export type InboxRiskFlag = {
  id: string;
  label: string;
  severity: InboxRiskSeverity;
  /** Rule code when present (e.g. BROAD_USAGE); otherwise derived from id. */
  code?: string;
  /** Server-authored bucket: contract clause risk vs reply attention gap. */
  kind?: 'contract' | 'attention';
  hint?: string;
  acknowledged?: boolean;
};

export type RiskClearedCheck = {
  code: string;
  label: string;
  detail?: string;
};

export type InboxDeliverableItem = {
  name: string;
  contentFormat?: string | null;
  platform?: string | null;
  quantity?: number;
  dueAtISO?: string | null;
  dueAtKind?: string | null;
  dueAtText?: string | null;
  dueAtUncertainty?: string | null;
  rateCardLineKeys?: string[];
};

export type InboxDeliverablePackage = {
  label?: string | null;
  quoteDisplay?: string | null;
  quoteAmount?: MoneyAmount | null;
  items: InboxDeliverableItem[];
};

export type LatestApprovedScript = {
  title: string;
  excerpt: string;
  sourceEmailMessageId?: string;
  confirmedAtISO?: string;
  extractionSource?: string;
};

/** AI Inbox 线程详情（mock）；接入 API 后可独立类型或由服务端拼装 */
export type InboxThreadDetail = InboxThread & {
  briefStage?: string;
  messages: InboxMessage[];
  riskFlags: InboxRiskFlag[];
  /** Resolved contract clause risks (API Phase 2). */
  contractRiskFlags?: InboxRiskFlag[];
  /** Resolved reply attention gaps (API Phase 2). */
  attentionFlags?: InboxRiskFlag[];
  /** Checks evaluated on the latest thread with no active risk. */
  clearedRiskChecks?: RiskClearedCheck[];
  recommendedActions: string[];
  riskNotes?: string[];
  systemHints?: string[];
  packages?: InboxDeliverablePackage[];
  attentionCount?: number;
  /** Mock：一键打开对应草稿模板 ID */
  suggestedDraftIds: { aiReply: string; quote: string };
  extractionStatus?: 'PENDING' | 'COMPLETE' | 'FAILED' | 'SKIPPED';
  extractionConfidence?: number;
  missingFields?: string[];
  usageRights?: string[];
  deadlineAtISO?: string;
  deadlineKind?: string;
  deadlineText?: string;
  classificationSource?: AiProcessingSource;
  briefExtractionSource?: AiProcessingSource;
  contractSummary?: ContractSummary;
  latestApprovedScript?: LatestApprovedScript;
  /** Human-readable posting window when extracted from brief. */
  postingSchedule?: string;
};

export type DocumentKind =
  | 'CONTRACT'
  | 'CREATOR_BRIEF'
  | 'INVOICE'
  | 'PROPOSAL'
  | 'MEDIA_KIT'
  | 'CORRESPONDENCE'
  | 'OTHER';

export type ContractSummary = {
  id?: string | null;
  opportunityId: string;
  status: 'DRAFT' | 'PENDING' | 'COMPLETE' | 'FAILED';
  source: 'EMAIL_ATTACHMENT' | 'UPLOAD';
  sourceFilename?: string | null;
  emailAttachmentId?: string | null;
  emailMessageId?: string | null;
  documentType?: DocumentKind | null;
  summary?: string | null;
  deliverables?: string[];
  usageRights?: string[];
  deadlines?: string[];
  riskFlags?: InboxRiskFlag[];
  confidence?: number | null;
  extractionSource?: string | null;
  promptVersion?: string | null;
  persisted?: boolean;
  errorMessage?: string | null;
  createdAtISO?: string;
  updatedAtISO?: string;
};

export type DealSummary = {
  id: string;
  brandId?: string;
  brandPlaceholder: string;
  brandName?: string;
  title: string;
  /** Associated opportunity thread when the deal was escalated from inbox. */
  opportunityThreadId?: string;
  escrowPhase: EscrowLifecyclePhase;
  /** Server-authored payment status; falls back to phase mapping when absent. */
  paymentStatusLabel?: string;
  /** 下一可执行节点（降低空等感） */
  nextMilestone?: string;
  /** 与 Qualified Creator Result 相关的摘要提示 */
  outcomeSummary?: string;
  /** 订单来源：creator 自己谈的 vs 平台主动推荐 */
  source: 'self' | 'recommended';
  /** 推荐匹配标签（仅 source=recommended 时有） */
  recommendBadge?: string;
  /** 推荐依据：为什么这个机会适合 creator */
  recommendReasons?: string[];
  /** 推荐机会的付款/托管说明 */
  recommendPayoutNote?: string;
  /** 推荐机会的风险边界说明 */
  recommendRiskNote?: string;
  /** Thread-level publish/delivery deadline from linked opportunity extraction. */
  deadlineAtISO?: string;
  deadlineKind?: string;
  deadlineText?: string;
};

export type DraftKind =
  | 'ai_reply'
  | 'quote'
  | 'follow_up'
  | 'clarify_budget'
  | 'counter_offer'
  | 'ack_and_schedule'
  | 'shrink_scope'
  | 'ask_more_money'
  | 'ask_extension'
  | 'request_usage_rights';

export type DraftSummary = {
  id: string;
  title: string;
  updatedAtISO: string;
  kind: DraftKind;
  /** 是否需要人工审批后才能发送（PRD：高风险动作不落自动发送） */
  requiresApproval?: boolean;
  sourceBrandHint?: string;
  sourceThreadId?: string;
  nextActionLabel?: string;
  approvalState?: 'pending' | 'approved';
};

/** 草稿详情；编辑器正文与未来服务端 revisions 对齐时可演进 */
export type DraftDetail = DraftSummary & {
  body: string;
  /** 来源收件线程 ID（从列表跳入草稿时可带上） */
  sourceThreadId?: string;
  approvedAtISO?: string;
  /** 同商机下的合作单 ID（API） */
  linkedDealId?: string;
  generationSource?: 'llm' | 'rules';
  replyPurpose?: string;
  emailSubject?: string;
};

export type PaymentLineItem = {
  id: string;
  dealId?: string;
  label: string;
  amountCents: number;
  currency: 'USD' | 'CNY';
  phase: EscrowLifecyclePhase;
  dealTitle?: string;
  /** Creator 可理解的下一步（体验：可执行、可预期） */
  nextStepHint?: string;
  expectedReleaseLabel?: string;
};

export type DisputeEvidenceStatus = 'missing' | 'submitted' | 'under_review' | 'accepted';

export type DisputeEvidenceItem = {
  id: string;
  label: string;
  status: DisputeEvidenceStatus;
  hint?: string;
};

export type DisputeCase = {
  id: string;
  /** Linked deal when known (API). */
  dealId?: string;
  title: string;
  state: 'open' | 'mediation' | 'resolved';
  /** PRD §10.3：原因码占位 */
  causeCode?: string;
  slaHint?: string;
  /** 结构化证据清单（mock） */
  evidenceItems?: DisputeEvidenceItem[];
  /** Creator 侧下一步动作文案（mock） */
  nextActionLabel?: string;
};

/** Growth · Creator 对品牌报价包（GET/PUT /rate-cards） */
export type RateCardPackage = {
  id: string;
  name: string;
  tagline: string;
  priceLabel: string;
  deliverables: string[];
  revisionRounds: string;
  usageRights: string;
  prepayLabel: string;
  addOnHint: string;
  highlights: string[];
  /** UI：突出推荐报价包 */
  recommended?: boolean;
};

/** Proposal · SKU 行（mock） */
export type ProposalSkuLine = {
  id: string;
  platform: string;
  deliverable: string;
  turnaroundLabel: string;
  priceLabel: string;
};

/** Proposal · 对外预览结构（mock） */
export type CreatorPublicSnapshot = {
  headline: string;
  bio: string;
  heroStats?: MediaKitHeroStat[];
  platforms: MediaKitPlatformRow[];
  cases: MediaKitCaseCard[];
};

export type ProposalPreview = {
  id: string;
  /** Internal Proposal draft id. Present only before creator confirmation. */
  draftId?: string;
  packageId?: string;
  opportunityId?: string;
  title: string;
  brandHint: string;
  creatorDisplayName: string;
  executiveSummary: string;
  skuLines: ProposalSkuLine[];
  rightsBullets: string[];
  paymentBullets: string[];
  riskBullets: string[];
  creatorSnapshot?: CreatorPublicSnapshot;
  preview?: boolean;
  saved?: boolean;
  generationSource?: string;
  version?: number;
  current?: boolean;
  /** Present only while confirming a generated revision draft. */
  baseProposalId?: string;
  rootProposalId?: string;
  proposedVersion?: number;
  /** Historical version that seeded a restore draft. */
  sourceProposalId?: string;
  sourceVersion?: number;
  restoredFromVersion?: number;
  revisionKind?: 'restore' | 'generate';
};

export type ProposalRevisionsResult = {
  restoreBlocked: boolean;
  revisions: ProposalPreview[];
};

export type MediaKitPlatformRow = {
  name: string;
  followersRange: string;
  nicheNote: string;
  monthlyViews?: string;
  handle?: string;
  /** Preset profile slot when row is sourced from creator profile (not deletable). */
  profileSource?: PresetPlatformKey;
  /** When false, hidden from brand-facing preview. Defaults to true. */
  visibleInPreview?: boolean;
};

export type MediaKitCaseCard = {
  id: string;
  title: string;
  industry: string;
  outcomeNote: string;
  /** Short headline result shown prominently on preview cards */
  resultSummary?: string;
};

export type MediaKitSectionId =
  | 'about'
  | 'stats'
  | 'audience'
  | 'channels'
  | 'rates'
  | 'services'
  | 'partnerships'
  | 'cases'
  | 'trust_proof'
  | 'contact';

/** Trust Passport metric eligible for optional public Media Kit display */
export type PublicProofItem = {
  id: string;
  trustMetricId: string;
  label: string;
  value: string;
  trendNote?: string;
  disclaimer?: string;
};

export type MediaKitHeroStat = { label: string; value: string };

export type MediaKitAudience = {
  topLocations?: string;
  genderAge?: string;
  postingCadence?: string;
};

export type MediaKitRateSummary = {
  id: string;
  title: string;
  startingPrice: string;
  description: string;
};

export type MediaKitServiceRow = { service: string; fee: string };

export type ContentFormatKey =
  | 'image_post'
  | 'carousel'
  | 'short_video'
  | 'long_video'
  | 'story'
  | 'live'
  | 'mention';

/** 平台 × 内容类型报价（优先于套餐价目表） */
export type PlatformRateEntry = {
  id: string;
  platform: string;
  formatKey: ContentFormatKey;
  priceLabel: string;
  note?: string;
};


/** Media Kit · 可编辑文档（GET/PUT /media-kit） */
export type MediaKitDocument = {
  aboutTags?: string[];
  contactEmail?: string;
  heroStats?: MediaKitHeroStat[];
  audience?: MediaKitAudience;
  platforms?: MediaKitPlatformRow[];
  rateSummaries?: MediaKitRateSummary[];
  servicesTable?: MediaKitServiceRow[];
  partnerships?: string[];
  paymentTerms?: string;
  cases?: MediaKitCaseCard[];
  inviteCta?: string;
  platformRates?: PlatformRateEntry[];
  syncRateCards?: boolean;
  /** Rate Card package ids selected for public Media Kit display. Missing means all packages. */
  publicPackageIds?: string[];
  syncBattleReports?: boolean;
  /** PublicProofItem ids opted in for Media Kit display */
  enabledPublicProofIds?: string[];
  sectionOrder?: MediaKitSectionId[];
};

/** Media Kit · 品牌向一页报价包（对齐网红 PDF 结构） */
export type MediaKitPreview = {
  headline: string;
  bio: string;
  aboutTags?: string[];
  contactEmail?: string;
  contactUrl?: string;
  heroStats?: MediaKitHeroStat[];
  audience?: MediaKitAudience;
  platforms: MediaKitPlatformRow[];
  rateSummaries?: MediaKitRateSummary[];
  servicesTable?: MediaKitServiceRow[];
  partnerships?: string[];
  paymentTerms?: string;
  cases: MediaKitCaseCard[];
  publicProofs?: PublicProofItem[];
  inviteCta: string;
};

/** 平台履约附录（对内，非品牌主阅读物） */
export type TrustMetricCard = {
  id: string;
  label: string;
  value: string;
  trendNote: string;
  disclaimer: string;
};

/** Payments · 总览摘要（Creator 可见，mock） */
export type PaymentsOverview = {
  currency: 'USD' | 'CNY';
  inEscrowCents: number;
  pendingVerificationCents: number;
  awaitingSettlementCents: number;
  footnote: string;
};

/** 团队成员（API / mock） */
export type TeamMemberStatus = 'ACTIVE' | 'INVITED';
export type TeamMemberRole = 'OWNER' | 'MEMBER';

export type TeamMember = {
  id: number;
  email: string;
  displayName: string | null;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  createdAt: string;
  /** MEMBER = registered user; EMAIL = unregistered email invite */
  inviteKind?: 'MEMBER' | 'EMAIL' | null;
  /** Only on invite response for EMAIL invites */
  emailSent?: boolean | null;
};

/** 订阅 · 额度快照（mock） */
export type SubscriptionUsageSnapshot = {
  planName: string;
  billingCycleLabel: string;
  brandPitchesUsed: number;
  brandPitchesLimit: number;
  draftConcurrentUsed: number;
  draftConcurrentLimit: number;
  renewalHint: string;
};

/** 复盘战报摘要（mock） */
export type BattleReportSummary = {
  id: string;
  /** 来源合作单 ID */
  dealId?: string;
  title: string;
  metrics: string[];
  lesson: string;
  /** 是否建议同步进 Media Kit 公开展示 */
  shareableToMediaKit: boolean;
};
