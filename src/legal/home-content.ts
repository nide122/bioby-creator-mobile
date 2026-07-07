import type { AppLocale } from '@/src/i18n';

import type { MarketingHomeContent } from './types';

const homeZh: MarketingHomeContent = {
  metaTitle: 'Bioby Creator — Gmail 商务邮件管理，助力达人识别合作线索',
  metaDescription:
    '连接 Gmail，自动同步商务邮件，AI 辅助分类、Brief 提取与回复草稿。面向欧美市场的创作者与 KOL 商务协作工具。',
  heroTitle: '为创作者打造的 Gmail 商务收件箱',
  heroSubtitle:
    'Bioby Creator 帮助您连接 Gmail，同步品牌合作邮件，识别高价值商机，并安全地起草与发送回复——让您把精力放在创作与谈判上，而不是淹没在收件箱里。',
  heroNote:
    '使用 Gmail 连接功能前，您需在 Google 授权页面明确同意我们访问您的 Gmail 数据。我们仅将邮件用于您账户内的商务管理，详见',
  aboutTitle: '产品定位',
  aboutParagraphs: [
    'Bioby Creator 是一款面向创作者、KOL 与自由职业达人的商务邮件助手。当您通过 Gmail 接收品牌合作、赞助与商务询盘时，Bioby 可安全连接邮箱、同步相关会话、辅助识别合作线索并整理 Brief，在 App 内生成回复草稿并由您确认后发送。',
    '我们不会将您的邮件出售给第三方，不会将邮件内容用于与您无关的广告定向，不会将 Gmail 数据用于训练对外售卖的通用 AI 数据产品。',
  ],
  featuresTitle: '功能',
  features: [
    {
      title: '连接 Gmail',
      body: '通过 Google 官方 OAuth；申请 gmail.readonly（同步与分析）与 gmail.compose（草稿与发送）。',
    },
    {
      title: '邮件同步',
      body: '同步 INBOX 与已发送文件夹，在移动端或 Web 统一查看与处理。',
    },
    {
      title: '商务分类',
      body: '识别品牌合作与询盘等商务信号，优先处理高价值线程。',
    },
    {
      title: 'Brief 与摘要',
      body: '提取预算、交付物、时间线等合作要点，支持快速决策。',
    },
    {
      title: '回复草稿',
      body: '根据上下文生成回复建议；发送前需经您确认，通过 Gmail API 以您的名义发送。',
    },
    {
      title: '断开与删除',
      body: '可在 App 内断开邮箱；注销账户后可按隐私政策删除服务端数据。',
    },
  ],
  trustTitle: '信任与安全',
  trustBullets: [
    '全站 TLS/HTTPS 加密',
    'OAuth Refresh Token 及敏感凭据在服务端加密存储',
    '遵循 Google API Services User Data Policy（Limited Use）',
    '面向欧美用户：按 GDPR 等适用法规处理个人数据',
  ],
  ctaPrimary: '开始使用',
  ctaSecondary: '登录',
};

const homeEn: MarketingHomeContent = {
  metaTitle: 'Bioby Creator — Gmail business inbox for creators',
  metaDescription:
    'Connect Gmail, sync brand deals, classify opportunities, extract briefs, and send approved replies. Built for creators working with US & EU brands.',
  heroTitle: 'A Gmail business inbox built for creators',
  heroSubtitle:
    'Bioby Creator connects Gmail, surfaces brand deals, extracts briefs, and helps you draft and send replies you approve—so you spend time creating and negotiating, not drowning in email.',
  heroNote:
    'Before connecting Gmail, you must explicitly consent on Google’s authorization screen. We use mail only for in-app business workflow. See our ',
  heroNoteAfterLink: '.',
  aboutTitle: 'What we do',
  aboutParagraphs: [
    'Bioby Creator helps creators, influencers, and freelancers manage brand collaboration email. Sync conversations, spot opportunities, extract briefs, and reply from one workspace—with you in control of every send.',
    'We do not sell your mail, use it for unrelated ads, or train commercial data products on Gmail content.',
  ],
  featuresTitle: 'Features',
  features: [
    {
      title: 'Connect Gmail',
      body: 'Official Google OAuth with gmail.readonly (sync) and gmail.compose (drafts & send).',
    },
    {
      title: 'Mail sync',
      body: 'Sync INBOX and Sent for a unified mobile and web workflow.',
    },
    {
      title: 'Business classification',
      body: 'Prioritize brand deals and partnership inquiries.',
    },
    {
      title: 'Briefs',
      body: 'Extract budget, deliverables, and timelines for faster decisions.',
    },
    {
      title: 'Reply drafts',
      body: 'AI-assisted drafts you review before sending via Gmail API.',
    },
    {
      title: 'Disconnect & delete',
      body: 'Disconnect anytime; account deletion follows our Privacy Policy.',
    },
  ],
  trustTitle: 'Trust & security',
  trustBullets: [
    'TLS/HTTPS everywhere',
    'Encrypted OAuth tokens and credentials at rest',
    'Google API Services User Data Policy (Limited Use)',
    'GDPR-aligned practices for US & EU users',
  ],
  ctaPrimary: 'Get started',
  ctaSecondary: 'Sign in',
};

export const homeByLocale: Record<AppLocale, MarketingHomeContent> = {
  zh: homeZh,
  en: homeEn,
};
