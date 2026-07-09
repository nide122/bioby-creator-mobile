#!/usr/bin/env python3
"""Tighten mobile i18n copy: strip marketing prefixes and apply PM-style brevity patches."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

LOCALES = Path(__file__).resolve().parents[1] / "src" / "i18n" / "locales"

STRIP_EN = [
    (re.compile(r"^Evidence:\s*", re.I), ""),
    (re.compile(r"^Benefit:\s*", re.I), ""),
    (re.compile(r"^Feature:\s*", re.I), ""),
    (re.compile(r"^Advantage:\s*", re.I), ""),
]
STRIP_ZH = [
    (re.compile(r"^证据来源："), ""),
    (re.compile(r"^证据："), ""),
    (re.compile(r"^利益："), ""),
    (re.compile(r"^优势："), ""),
    (re.compile(r"^特性："), ""),
]


def deep_merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def strip_marketing(text: str, locale: str) -> str:
    rules = STRIP_ZH if locale == "zh" else STRIP_EN
    out = text
    for pattern, repl in rules:
        out = pattern.sub(repl, out)
    return out.strip()


def walk_strings(node: Any, locale: str) -> Any:
    if isinstance(node, dict):
        return {k: walk_strings(v, locale) for k, v in node.items()}
    if isinstance(node, list):
        return [walk_strings(v, locale) for v in node]
    if isinstance(node, str):
        return strip_marketing(node, locale)
    return node


PATCH_EN: dict[str, Any] = {
    "auth": {
        "login": {
            "lead": "Pick up where you left off.",
            "readyCardSubtitle": "Drafts, proof, and payouts in one queue.",
            "reviewQueueHint": "See what needs you first.",
        },
        "register": {
            "title": "Start your deal queue",
            "promiseQueueText": "Emails become tasks.",
            "promiseControlText": "Quotes and rights stay explicit.",
        },
        "oauth": {
            "googleMailbox": "Connect Gmail",
            "microsoftMailbox": "Connect Outlook",
        },
    },
    "inboxThreadDetail": {
        "decisionTitleWithBudget": "Confirm budget & rights",
        "decisionTitleNoBudget": "Add budget & rights",
        "overrideNotice": "Uses your corrected category.",
        "classificationWhy": "Why this category",
        "categoryReason": {
            "commercial": "Partnership, budget, or delivery signals.",
            "pr_sample": "Unpaid samples stay out of your urgent queue.",
            "media": "Press asks stay separate from paid deals.",
            "personal": "Fan mail stays out of deal workflows.",
            "other": "Unclear intent—review when you can.",
        },
        "trainingDesc": {
            "commercial": "Similar threads from {{brand}} surface in Today.",
            "pr_sample": "Future unpaid samples stay in All mail only.",
            "media": "Future interviews won't interrupt Today.",
            "personal": "Future personal threads skip commercial queues.",
            "other": "Future unclear threads stay in Other.",
        },
        "restoreAiHint": "Restore AI's original label.",
        "riskHigherHint": "Future drafts tighten usage and payment terms.",
        "budgetUnclearHint": "Replies will ask for budget first.",
        "footerCommercial": "Quotes won't send until you approve.",
        "footerNonCommercial": "Stays out of Today's queue.",
        "linkPricingHint": "Packages and rates",
        "linkMediaKitHint": "Brand-facing profile",
        "linkProposalHint": "Quote layout preview",
    },
    "inboxScreen": {
        "connectionBannerBody": "Connect mail to sort brand pitches.",
        "aiSummarySub": "{{commercial}} deals · {{archived}} archived",
        "archiveHint": "View originals anytime.",
        "learningHint": "{{count}} correction(s) applied.",
        "auditNotice": "Every label links to the original message.",
        "titlePriority": "What needs you",
        "titleAll": "All mail",
        "descPriority": "Deals and risks ranked first.",
        "descAll": "Search and reclassify anytime.",
        "emptyCommercialDesc": "Connect mail to route pitches here.",
    },
    "dealsScreen": {
        "title": "Deals",
        "description": "{{total}} active · clear blockers on confirmed deals.",
        "whyRecommendedSubtitle": "Why we surfaced this",
        "emptyDesc": "Confirmed deals land here with escrow tracking.",
    },
    "assetsScreen": {
        "lead": "Brand-facing assets and private records.",
        "heroCtaSubtitle": "Audience, proof, and rates in one link.",
        "rows": {
            "mediaKit": {"subtitle": "What brands see before they reply"},
            "trust": {"subtitle": "Delivery and verification"},
            "rateCard": {"subtitle": "Packages and usage rights"},
            "proposal": {"subtitle": "Scope and terms"},
            "battleReports": {"subtitle": "Wins for your next pitch"},
            "drafts": {"subtitle": "Drafts waiting on you"},
            "disputes": {"subtitle": "Private—never shared externally"},
        },
        "safety": {
            "title": "Before you share",
            "body": "Hide floor rates, DMs, and open disputes.",
        },
    },
    "draftsScreen": {
        "listLead": "Review before price, rights, or promises change.",
        "emptyRowsHint": "Drafts from inbox threads appear here.",
    },
    "draftDetail": {
        "titleQuote": "Review quote",
        "titleReply": "Review reply",
        "checkQuoteBody": "Check scope and usage before send.",
        "checkFollowBody": "Light edit, then send.",
        "finalConfirmBody": "Confirm price, delivery, and payment language.",
        "boundarySnippet": "\n\nScope note: fees and timing change if deliverables or usage shift.",
    },
    "paymentsScreen": {
        "title": "Proof & payouts",
        "description": "Escrow, proof, and releases in one place.",
        "prioritiesTitle": "Needs attention",
        "prioritiesSubtitle": "Money and proof gaps first.",
        "uploadProofHint": "Complete proof moves payout to review.",
        "reminderHint": "Remind after the review window passes.",
        "followupAdvice": "Upload proof first. Remind only if the brand misses the window.",
    },
    "dealDetailScreen": {
        "heroSubtitle": "Stage and next step",
        "whyRecommendedSubtitle": "Match reasoning",
        "payoutEscrowTitle": "Escrow before production",
        "payoutEscrowFallback": "Lock prepay first.",
        "riskConfirmTitle": "Confirm boundaries",
        "riskConfirmFallback": "Confirm usage and license before you accept.",
        "keyStatusSubtitle": "Stage, money, risk",
        "riskBoundaryHint": "Route scope changes through drafts.",
        "linkPacketHint": "Scope and rights",
        "linkDeliveryHint": "Drafts and deadlines",
        "linkVerificationHint": "Links and screenshots",
        "linkPaymentsHint": "Escrow and releases",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "decisionTitleAwaitingPrepay": "Confirm prepay",
        "decisionTitlePendingVerification": "Upload proof to release",
        "decisionTitleDisputeRemediation": "Clear blockers first",
        "decisionTitleDefault": "Deliver to packet",
        "whyDealNowSubtitle": "Use stage, funds, and risk—not memory.",
        "keyStatusEscrowMoneyHint": "Confirm escrow before heavy production.",
        "keyStatusRiskEvidenceHint": "Packet is scope source of truth.",
    },
    "trustPassportScreen": {
        "title": "Trust passport",
        "description": "You choose what's public. DMs and disputes stay private.",
        "publishGuideTitle": "Public vs private",
        "publishGuideSubtitle": "Share proof, keep negotiation private.",
        "rowPublicHint": "Builds confidence on first collabs.",
        "rowPrivateHint": "Hidden from external profiles.",
        "rowBlockedHint": "Keep in Account or Disputes.",
        "ctaSyncMediaKitHint": "Align with media kit",
    },
    "disputesScreen": {
        "description": "{{count}} private case(s).",
        "sectionWhySubtitle": "Facts, proof, then reply.",
        "organizedHint": "Reply after proof is solid.",
        "noAutoAdmitHint": "Money and scope need you.",
        "emptyDesc": "Timing, disclosure, or proof issues appear here.",
    },
    "teamSettingsScreen": {
        "title": "Who approves money & rights",
        "description": "Roles, drafts, and payment reviews.",
        "approvalModelSubtitle": "Who can approve quotes, usage, payouts.",
        "ownerCommercialLead": "Pricing, rights, payouts, disputes need an owner.",
        "routinePrepLead": "Draft first—approve before send.",
        "inviteConfirmLead": "Pick role before inviting.",
        "footnote": "Seat changes may affect billing.",
    },
    "subscriptionSettingsScreen": {
        "title": "Workspace limits",
        "description": "Email volume, drafts, and seats.",
        "cardUpgradeSubtitle": "Upgrade before you hit caps.",
        "cardBillingSubtitle": "Payment method and invoices.",
        "upgradeExplain": "Near limits? Upgrade keeps AI flowing.",
        "billingExplain": "Confirm billing before changes.",
        "brandEmailQuotaHint": "Affects inbox, drafts, follow-ups.",
        "seatsHint": "Billing changes need confirmation.",
        "footerNote": "Changes only apply after you confirm.",
    },
    "pricingScreen": {
        "title": "Rate card",
        "description": "Packages, rights, add-ons, prepay.",
        "aiDraftHint": "AI drafts from your card—you approve sends.",
        "discountHint": "Paid media and long licenses need manual OK.",
        "notSubscriptionSubtitle": "Creator quotes to brands—not workspace billing.",
        "ctaCreateProposalHint": "From recommended tier",
        "ctaOpenMediaKitHint": "Audience and proof",
    },
    "proposalDetailScreen": {
        "title": "Review before send",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "brandPreviewSubtitle": "Positioning, price, boundaries.",
        "priceScopeSplitHint": "Clearer quotes, fewer squeezes.",
        "rightsNotDefaultHint": "Paid placements and long licenses are add-ons.",
        "rateCardHint": "Price, deliverables, usage.",
        "mediaKitCardHint": "Profile and wins.",
        "moneyTermsSubtitle": "Check price, rights, delivery promises.",
        "ctaShareSentSubtitle": "Next: packet and payout.",
        "ctaShareDraftSubtitle": "Boundaries preserved before send.",
    },
    "mediaKitScreen": {
        "title": "Media kit",
        "description": "Positioning and proof public; rates and DMs private.",
        "signatureFooter": "Brief + budget range via Bioby.",
        "publicPrivateSubtitle": "Trust brands faster, keep negotiation private.",
        "ctaReviewShareSummaryHint": "Safe summary link",
        "ctaEmailSignatureHint": "Footer copy",
    },
    "battleReportsScreen": {
        "description": "Review before reusing in kit or proposals.",
        "flowSubtitle": "Ship outcomes into reusable proof.",
        "archiveHint": "Results and lessons.",
        "reviewHint": "Names, metrics, context.",
    },
    "battleReportDetailScreen": {
        "title": "Reuse this win",
        "heroEvidenceLine": "{{title}}",
        "reusePublicSubtitle": "No floor rates, DMs, or disputes.",
        "reuseOutcomeHint": "Safe after private context is removed.",
        "brandDataHint": "Anonymize when needed.",
        "nextDealEvidenceHint": "Reduce brand hesitation.",
        "publicFieldsHint": "Names, metrics, privacy.",
    },
    "dealPacketScreen": {
        "title": "Deal packet",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "whyPacketSubtitle": "Scope, rights, acceptance, payouts.",
        "deliveryAlignedHint": "Confirmed scope drives tasks.",
        "changesNeedApprovalHint": "No verbal scope changes.",
    },
    "dealDeliveryScreen": {
        "title": "Awaiting feedback",
        "description": "Rough cut in review.",
        "heroCopy": "Wait for the window before final cut.",
        "feedbackAiDraftBody": "Reminder draft after the window—you approve send.",
        "ruleSilenceHint": "Prepare reminder—you approve send.",
        "ruleScopeHint": "Back to packet—don't promise extra work.",
    },
    "dealVerificationScreen": {
        "title": "Submit proof",
        "description": "Complete proof avoids payout delays.",
        "whyNotDirectSubtitle": "Precheck first—fewer rejections.",
        "precheckFindGapsHint": "Links, screenshots, disclosures, metrics.",
        "youApproveHint": "You sign off before review.",
    },
    "onboardingProfileScreen": {
        "title": "Creator profile",
        "whyProfileSubtitle": "AI matches deals to your channel.",
        "matchHint": "Link mail to your positioning.",
        "controlHint": "Edit public fields before sharing.",
        "placeholderBio": "e.g. skincare reviews, ingredient explainers",
    },
    "onboardingEmailScreen": {
        "title": "Connect inbox",
        "noteFromAccount": "Returns to Account when done.",
        "aiImportsSubtitle": "Brand mail becomes tasks. Skip to explore demo.",
        "signalHint": "Budget, scope, rights, risk.",
        "controlHint": "Quotes and rights still need you.",
    },
    "onboardingConsentScreen": {
        "title": "AI boundaries",
        "privacySubtitle": "Profile and mail inform budget and risk.",
        "modeAssistSubtitle": "Low-risk auto-send; quotes and payouts need you.",
        "modeReviewSubtitle": "You approve every send.",
        "boundaryBody": "Quotes, rights, payouts, exclusivity, and disputes stay manual.",
    },
    "onboardingCompleteScreen": {
        "title": "Workspace ready",
        "freeTierTitle": "Start on free",
        "freeTierLine2": "Triage, drafts, follow-ups included.",
        "aiReachReviewCopy": "Every send waits for you.",
        "aiReachAssistCopy": "Low-risk auto; money and rights stay with you.",
        "brandEvidenceTitle": "Brand-facing proof",
        "emailSkippedSecondary": "Connect anytime in Account.",
        "emailConnectedSecondary": "Original mail stays searchable.",
        "enterToday": "Open Today",
    },
    "replyStyleScreen": {
        "lead": "How AI sends replies. Applies immediately.",
        "savedNote": "Quotes, rights, payouts, and disputes always need approval.",
    },
    "profileSettingsScreen": {
        "lead": "How brands see you in drafts and your kit.",
        "mediaKitSubtitle": "Public brand preview.",
    },
    "dataExportScreen": {
        "lead": "Export workspace data or open financial records.",
        "footer": "Payments and disputes open in their own screens.",
        "rows": {
            "workspaceSubtitle": "Deals, drafts, profile (JSON)",
            "inboxSubtitle": "Summaries and metadata",
            "paymentsSubtitle": "Balances and releases",
            "disputesSubtitle": "Cases and status",
        },
        "workspaceAlert": {"message": "We'll email a download link. (Demo)"},
        "inboxAlert": {"message": "Summaries only—not full mailbox. (Demo)"},
    },
}

PATCH_ZH: dict[str, Any] = {
    "auth": {
        "login": {
            "lead": "接着上次继续。",
            "readyCardSubtitle": "草稿、凭证、收款同一队列。",
            "reviewQueueHint": "先看需要你处理的。",
        },
        "register": {
            "title": "创建合作队列",
            "promiseQueueText": "邮件变任务。",
            "promiseControlText": "报价与权益写清楚。",
        },
        "oauth": {"googleMailbox": "连接 Gmail", "microsoftMailbox": "连接 Outlook"},
    },
    "inboxThreadDetail": {
        "decisionTitleWithBudget": "确认预算与权益",
        "decisionTitleNoBudget": "补齐预算与权益",
        "overrideNotice": "已采用你纠正的分类。",
        "categoryReason": {
            "commercial": "有合作、预算或交付信号。",
            "pr_sample": "无付费寄样不进紧急队列。",
            "media": "媒体采访与付费合作分开。",
            "personal": "粉丝邮件不进商务流程。",
            "other": "意图不明—有空再看。",
        },
        "trainingDesc": {
            "commercial": "类似 {{brand}} 的线索会进 Today。",
            "pr_sample": "今后无付费寄样只在全部邮件。",
            "media": "今后采访不会打断 Today。",
            "personal": "今后个人邮件不进商务队列。",
            "other": "今后不明邮件留在其他。",
        },
        "restoreAiHint": "恢复 AI 原始分类。",
        "riskHigherHint": "后续草稿会收紧条款。",
        "budgetUnclearHint": "会先追问预算。",
        "footerCommercial": "报价需你审批后发送。",
        "footerNonCommercial": "不会进入 Today 队列。",
        "linkPricingHint": "套餐与报价",
        "linkMediaKitHint": "对外资料页",
        "linkProposalHint": "报价预览",
    },
    "inboxScreen": {
        "connectionBannerBody": "连接邮箱以自动分拣询盘。",
        "aiSummarySub": "{{commercial}} 条合作 · {{archived}} 条已归档",
        "archiveHint": "可随时查看原文。",
        "learningHint": "已应用 {{count}} 次纠正。",
        "auditNotice": "每条分类可回到原邮件。",
        "titlePriority": "需要你处理",
        "titleAll": "全部邮件",
        "descPriority": "合作与风险优先。",
        "descAll": "可搜索并重新分类。",
        "emptyCommercialDesc": "连接邮箱后询盘会出现在此。",
    },
    "dealsScreen": {
        "title": "合作",
        "description": "{{total}} 个进行中 · 先清已确认合作的阻塞项。",
        "whyRecommendedSubtitle": "推荐原因",
        "emptyDesc": "确认的合作会在此跟踪托管与交付。",
    },
    "assetsScreen": {
        "lead": "对外资料与私密记录。",
        "heroCtaSubtitle": "受众、凭证、报价一链展示。",
        "rows": {
            "mediaKit": {"subtitle": "品牌回复前看到的内容"},
            "trust": {"subtitle": "交付与核销"},
            "rateCard": {"subtitle": "套餐与授权"},
            "proposal": {"subtitle": "范围与条款"},
            "battleReports": {"subtitle": "下次 pitch 可用"},
            "drafts": {"subtitle": "待你审批的草稿"},
            "disputes": {"subtitle": "仅内部—不对外分享"},
        },
        "safety": {"title": "分享前", "body": "隐藏底价、私信与进行中争议。"},
    },
    "draftsScreen": {
        "listLead": "涉及价格、权益或承诺前先过目。",
        "emptyRowsHint": "来自收件箱的草稿会出现在此。",
    },
    "draftDetail": {
        "titleQuote": "审报价",
        "titleReply": "审回复",
        "checkQuoteBody": "发送前确认范围与授权。",
        "checkFollowBody": "轻改后即可发送。",
        "finalConfirmBody": "确认价格、交付与付款表述。",
    },
    "paymentsScreen": {
        "title": "凭证与收款",
        "description": "托管、凭证与放款集中管理。",
        "prioritiesTitle": "需关注",
        "prioritiesSubtitle": "先处理涉款与缺证项。",
        "uploadProofHint": "凭证齐全后进入付款审核。",
        "reminderHint": "审核窗口过后再催款。",
        "followupAdvice": "先上传凭证；品牌超时未审再提醒。",
    },
    "dealDetailScreen": {
        "heroSubtitle": "阶段与下一步",
        "whyRecommendedSubtitle": "匹配理由",
        "payoutEscrowTitle": "先托管再制作",
        "payoutEscrowFallback": "先锁定预付。",
        "riskConfirmTitle": "确认边界",
        "riskConfirmFallback": "接受前确认授权范围。",
        "keyStatusSubtitle": "阶段、款项、风险",
        "riskBoundaryHint": "范围变更走草稿审批。",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "decisionTitleAwaitingPrepay": "确认预付",
        "decisionTitlePendingVerification": "上传凭证放款",
        "decisionTitleDisputeRemediation": "先清阻塞项",
        "decisionTitleDefault": "按合同包交付",
        "whyDealNowSubtitle": "看阶段与风险，不靠记忆。",
        "keyStatusEscrowMoneyHint": "重制作前先确认托管。",
        "keyStatusRiskEvidenceHint": "合同包即范围依据。",
    },
    "trustPassportScreen": {
        "title": "信任通行证",
        "description": "公开内容由你决定；私信与争议默认私密。",
        "publishGuideTitle": "公开与私密",
        "publishGuideSubtitle": "展示凭证，谈判留私下。",
        "rowPublicHint": "有助于首次合作信任。",
        "rowPrivateHint": "不显示在对外主页。",
        "rowBlockedHint": "仅在账号或争议中查看。",
    },
    "disputesScreen": {
        "description": "{{count}} 个私密案件。",
        "sectionWhySubtitle": "先事实与凭证，再回复。",
        "organizedHint": "凭证充分后再回应。",
        "noAutoAdmitHint": "涉款与范围需你确认。",
        "emptyDesc": "时效、披露或凭证问题会出现在此。",
    },
    "teamSettingsScreen": {
        "title": "谁审批款项与权益",
        "description": "角色、草稿与付款审核。",
        "approvalModelSubtitle": "谁可批报价、授权、放款。",
        "ownerCommercialLead": "定价、权益、放款、争议需负责人。",
        "routinePrepLead": "先起草—发送前审批。",
        "inviteConfirmLead": "邀请前先选角色。",
        "footnote": "席位变更可能影响账单。",
    },
    "subscriptionSettingsScreen": {
        "title": "工作区限额",
        "description": "邮件量、草稿并发与席位。",
        "cardUpgradeSubtitle": "触顶前升级。",
        "cardBillingSubtitle": "支付方式与发票。",
        "upgradeExplain": "接近上限？升级保持 AI 流畅。",
        "billingExplain": "变更前先核对账单。",
        "brandEmailQuotaHint": "影响收件箱、草稿、跟进。",
        "seatsHint": "账单变更需确认。",
        "footerNote": "仅在你确认后生效。",
    },
    "pricingScreen": {
        "title": "报价单",
        "description": "套餐、授权、附加项、预付。",
        "aiDraftHint": "AI 按报价单起草—发送仍要你批。",
        "discountHint": "付费投放与长期授权需手动确认。",
        "notSubscriptionSubtitle": "对品牌的报价—非工作区订阅。",
    },
    "proposalDetailScreen": {
        "title": "发送前审阅",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "brandPreviewSubtitle": "定位、价格、边界。",
        "priceScopeSplitHint": "报价更清晰，少压范围。",
        "rightsNotDefaultHint": "付费投放与长期授权另计。",
        "moneyTermsSubtitle": "核对价格、授权、交付承诺。",
        "ctaShareSentSubtitle": "下一步：合同包与放款。",
        "ctaShareDraftSubtitle": "发送前保留边界。",
    },
    "mediaKitScreen": {
        "title": "媒体资料包",
        "description": "定位与凭证公开；底价与私信私密。",
        "signatureFooter": "通过 Bioby 提交 brief 与预算区间。",
        "publicPrivateSubtitle": "建立信任，保留谈判空间。",
    },
    "battleReportsScreen": {
        "description": "复用到资料包或提案前先审阅。",
        "flowSubtitle": "把结果变成可复用凭证。",
    },
    "battleReportDetailScreen": {
        "title": "复用此次成果",
        "heroEvidenceLine": "{{title}}",
        "reusePublicSubtitle": "不含底价、私信或争议。",
    },
    "dealPacketScreen": {
        "title": "合作资料包",
        "heroEvidenceLine": "{{brand}} · {{title}}",
        "whyPacketSubtitle": "范围、授权、验收、付款。",
        "changesNeedApprovalHint": "口头变更无效。",
    },
    "dealDeliveryScreen": {
        "title": "等待反馈",
        "description": "初剪审核中。",
        "heroCopy": "窗口结束后再出终剪。",
        "feedbackAiDraftBody": "窗口后起草提醒—发送前仍要你批。",
    },
    "dealVerificationScreen": {
        "title": "提交凭证",
        "description": "材料齐全避免放款延迟。",
        "whyNotDirectSubtitle": "先预检—少退回。",
        "youApproveHint": "提交前需你确认。",
    },
    "onboardingProfileScreen": {
        "title": "创作者资料",
        "whyProfileSubtitle": "AI 按频道与定位匹配合作。",
        "matchHint": "邮件关联你的定位。",
        "controlHint": "分享前可编辑公开字段。",
    },
    "onboardingEmailScreen": {
        "title": "连接收件箱",
        "noteFromAccount": "完成后返回账号页。",
        "aiImportsSubtitle": "品牌邮件变任务。可跳过体验演示。",
        "signalHint": "预算、范围、授权、风险。",
        "controlHint": "报价与权益仍需你批。",
    },
    "onboardingConsentScreen": {
        "title": "AI 边界",
        "privacySubtitle": "资料与邮件用于预算与风险判断。",
        "modeAssistSubtitle": "低风险可自动；报价与款项需你批。",
        "modeReviewSubtitle": "每次发送都需你确认。",
        "boundaryBody": "报价、授权、款项、独家与争议保持人工。",
    },
    "onboardingCompleteScreen": {
        "title": "工作区已就绪",
        "freeTierTitle": "从免费版开始",
        "freeTierLine2": "含分拣、草稿与跟进摘要。",
        "aiReachReviewCopy": "每次发送都等你确认。",
        "aiReachAssistCopy": "低风险自动；款项与权益仍是你批。",
        "brandEvidenceTitle": "品牌可见凭证",
        "emailSkippedSecondary": "随时在账号中连接。",
        "emailConnectedSecondary": "原邮件仍可搜索。",
        "enterToday": "进入 Today",
    },
    "replyStyleScreen": {
        "lead": "AI 如何发送回复。立即生效。",
        "savedNote": "报价、权益、款项与争议始终需审批。",
    },
    "profileSettingsScreen": {
        "lead": "品牌在草稿与资料包中看到的内容。",
        "mediaKitSubtitle": "对外预览。",
    },
    "dataExportScreen": {
        "lead": "导出工作区数据或查看财务记录。",
        "footer": "付款与争议在各自页面打开。",
        "rows": {
            "workspaceSubtitle": "合作、草稿、资料 (JSON)",
            "inboxSubtitle": "摘要与元数据",
            "paymentsSubtitle": "余额与放款",
            "disputesSubtitle": "案件与状态",
        },
    },
}


def main() -> None:
    for name, patch in [("en.json", PATCH_EN), ("zh.json", PATCH_ZH)]:
        path = LOCALES / name
        locale = "zh" if name.startswith("zh") else "en"
        data = json.loads(path.read_text(encoding="utf-8"))
        deep_merge(data, patch)
        data = walk_strings(data, locale)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"optimized {path.name}")


if __name__ == "__main__":
    main()
