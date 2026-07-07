import type { AppLocale } from '@/src/i18n';

import { legalConfig, legalEntityLabels } from './config';
import type { LegalDocument } from './types';

const { privacyEmail, effectiveDate } = legalConfig;
const { dataControllerZh, dataControllerEn, registeredAddressZh, registeredAddressEn } = legalEntityLabels;

const privacyZh: LegalDocument = {
  title: '隐私政策',
  effectiveDate,
  lastUpdated: effectiveDate,
  intro: [
    `${dataControllerZh}（以下简称「我们」）运营 Bioby Creator（网站、移动应用及 API，以下简称「服务」）。本政策说明我们如何收集、使用、存储、共享及保护您的个人信息，特别是当您使用 Google 账户登录或连接 Gmail 邮箱时。`,
    '本政策适用于面向美国、欧洲经济区（EEA）、英国及其他地区用户的服务。若您位于 EEA/英国，我们作为数据控制者（Data Controller）处理您的个人数据。',
  ],
  sections: [
    {
      title: '1. 我们是谁',
      bullets: [
        `数据控制者：${dataControllerZh}`,
        registeredAddressZh,
        `联系邮箱：${privacyEmail}`,
      ],
    },
    {
      title: '2. 我们收集哪些信息',
      paragraphs: ['当您使用 Google 登录时，我们可能通过 OAuth 获取：账户唯一标识（openid）、姓名与头像（profile）、主邮箱地址（email）。'],
    },
    {
      title: '2.2 Gmail 邮箱连接',
      paragraphs: [
        '当您主动在 App 内「连接 Gmail」时，我们会在您明确授权后申请以下 Google 权限：',
      ],
      bullets: [
        'gmail.readonly — 读取 Gmail 邮件（只读）：同步 INBOX 与已发送邮件；读取主题、发件人/收件人、时间、Message-ID、Thread-ID、正文与 snippet、附件元数据，用于商务分类、Brief 提取与商机管理。不会通过此权限修改或删除邮件标签（发送/草稿除外）。',
        'gmail.compose — 撰写与发送：在 App 内创建 Gmail 草稿，并在您确认后以您的名义发送回复。我们不会未经您确认自动发送邮件。',
        'OAuth Access Token / Refresh Token（服务端加密存储，用于在授权有效期内同步与发送您确认的回复）。',
        '同步至 Bioby 的邮件副本及衍生数据（分类、Brief、商机、草稿等）。',
      ],
    },
    {
      title: '2.3 其他信息',
      bullets: [
        '您主动提供的创作者资料、回复模板与 Brief。',
        '设备类型、App 版本、诊断日志（不含邮件正文）。',
        'IP 地址（安全与滥用防护）。',
      ],
    },
    {
      title: '2.4 我们不收集',
      bullets: [
        '您的 Google 账户密码。',
        'mail.google.com 全邮箱权限。',
        '用于出售给数据经纪商的邮件数据集。',
      ],
    },
    {
      title: '3. 我们如何使用信息',
      bullets: [
        '提供核心服务：同步、分类、Brief、草稿与发送（履行合同）。',
        'Gmail 连接与同步：仅在您授权后处理（同意；可随时撤回）。',
        '安全与防滥用：检测异常登录（合法利益）。',
      ],
    },
    {
      title: '3.1 Google Limited Use 承诺',
      paragraphs: ['我们对 Google 用户数据的处理遵守 Google API Services User Data Policy，包括 Limited Use 要求：'],
      bullets: [
        '仅为向用户提供 Bioby Creator 邮件商务管理功能而使用 Gmail 数据。',
        '不将 Gmail 数据用于广告投放（含再营销）。',
        '不出售 Gmail 数据给第三方或数据经纪商。',
        '不将 Gmail 数据用于训练与 Bioby 用户功能无关的对外售卖 AI/数据产品。',
        '员工仅在经您同意、安全/合规需要或修复您报告的错误时访问 Gmail 数据，且访问最小化。',
      ],
    },
    {
      title: '4. AI 与自动化',
      paragraphs: [
        '我们可能使用自动化（含 AI）对已同步邮件进行商务分类、Brief 提取与回复草稿建议。AI 输出仅供参考；发送邮件、确认 Brief 等关键操作由您决定。',
        '您有权反对对您产生重大影响的 solely automated 决策；如需人工复核，请联系 privacy 邮箱。',
      ],
    },
    {
      title: '5. 信息共享',
      bullets: [
        'Google LLC：OAuth 与 Gmail API（登录、同步、发送）。',
        '云基础设施与 AI 服务提供商：仅为提供服务所必需的数据，合同约束其用途。',
        '我们不会向数据经纪商出售邮件内容。',
      ],
    },
    {
      title: '6. 国际数据传输',
      paragraphs: [
        '若您位于 EEA/英国而数据处理发生在美国或其他第三国，我们将通过欧盟标准合同条款（SCCs）等 GDPR 认可的机制保障传输合法性。联系 privacy 邮箱可索取更多信息。',
      ],
    },
    {
      title: '7. 数据保留',
      bullets: [
        '账户信息：账户存续期间。',
        'Gmail OAuth Token：连接有效期间；断开后 30 天内删除或作废。',
        '同步邮件及衍生数据：连接有效期间；断开邮箱后 30 天内删除（法律另有要求除外）。',
        '已注销账户：注销完成后 30 天内删除或匿名化。',
        '安全日志：通常 90 天。',
      ],
    },
    {
      title: '8. 安全',
      bullets: [
        '全站 TLS/HTTPS 传输加密。',
        'OAuth Refresh Token 及邮箱凭据等服务端敏感字段应用层加密存储。',
        '访问控制与最小权限原则。',
      ],
    },
    {
      title: '9. 您的权利',
      bullets: [
        '访问、更正、删除、限制处理、数据可携、反对处理、撤回同意。',
        'App 内：设置 → 断开 Gmail / 注销账户。',
        'Google 侧：Google 账户 → 安全 → 第三方应用访问权，撤销 Bioby Creator。',
        `邮件联系：${privacyEmail}（GDPR 请求通常 30 天内回复）。`,
      ],
    },
    {
      title: '10. 加州居民（CCPA/CPRA）',
      paragraphs: [
        '我们不出售您的个人信息。加州居民享有知情、删除、更正等权利。请求请发至 privacy 邮箱，主题注明「California Privacy Request」。',
      ],
    },
    {
      title: '11. 儿童',
      paragraphs: ['服务面向 18 周岁及以上用户。我们不会有意收集 18 岁以下儿童个人信息。'],
    },
    {
      title: '12. 政策变更',
      paragraphs: [
        '我们可能更新本政策；重大变更将通过网站或 App 通知。顶部「最后更新」日期将同步修改。继续使用服务即表示您接受更新后的政策（法律要求另行取得同意的除外）。',
      ],
    },
    {
      title: '13. 联系我们',
      bullets: [dataControllerZh, registeredAddressZh, `联系邮箱：${privacyEmail}`],
    },
  ],
};

const privacyEn: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate,
  lastUpdated: effectiveDate,
  intro: [
    `${dataControllerEn} ("we," "us") operates Bioby Creator (the website, mobile apps, and APIs, the "Service"). This Policy explains how we collect, use, store, share, and protect personal information, especially when you sign in with Google or connect Gmail.`,
    'This Policy applies to users in the United States, the European Economic Area (EEA), the United Kingdom, and other regions. Where GDPR/UK GDPR applies, we act as the data controller.',
  ],
  sections: [
    {
      title: '1. Who we are',
      bullets: [
        `Data controller: ${dataControllerEn}`,
        registeredAddressEn,
        `Contact: ${privacyEmail}`,
      ],
    },
    {
      title: '2. Information we collect',
      paragraphs: [
        'When you sign in with Google, we may receive your Google account identifier (openid), name and profile photo (profile), and primary email address (email).',
      ],
    },
    {
      title: '2.2 Gmail connection',
      paragraphs: ['When you choose "Connect Gmail" in the app, we request the following permissions after your explicit consent:'],
      bullets: [
        'gmail.readonly — Read Gmail (read-only): sync INBOX and Sent; read subject, parties, timestamps, Message-ID, Thread-ID, body/snippet, and attachment metadata for business classification, brief extraction, and deal workflow. We do not modify or delete labels via this scope (except compose/send below).',
        'gmail.compose — Compose and send: create Gmail drafts in the app and send replies you approve on your behalf. We never send email without your confirmation.',
        'OAuth access/refresh tokens (encrypted at rest on our servers).',
        'Synced mail copies and derived data (classification, briefs, opportunities, drafts).',
      ],
    },
    {
      title: '2.3 Other data',
      bullets: [
        'Creator profile and templates you provide.',
        'Device/app metadata and diagnostic logs (no mail bodies in logs).',
        'IP address for security and abuse prevention.',
      ],
    },
    {
      title: '2.4 What we do not collect',
      bullets: [
        'Your Google account password.',
        'The broad mail.google.com scope.',
        'Mail datasets sold to data brokers.',
      ],
    },
    {
      title: '3. How we use information',
      bullets: [
        'Provide the Service: sync, classification, briefs, drafts, and sending (contract).',
        'Gmail sync: only after you connect and consent (consent; withdraw anytime).',
        'Security and abuse prevention (legitimate interests).',
      ],
    },
    {
      title: '3.1 Google Limited Use',
      paragraphs: ['We comply with the Google API Services User Data Policy, including Limited Use:'],
      bullets: [
        'Use Gmail data only to provide Bioby Creator mail workflow features to you.',
        'No ads (including retargeting) using Gmail data.',
        'No selling Gmail data to third parties or data brokers.',
        'No training unrelated commercial AI/data products on Gmail data.',
        'Human access only with your consent, for security/compliance, or to fix errors you report—minimized access.',
      ],
    },
    {
      title: '4. AI and automation',
      paragraphs: [
        'We may use automation (including AI) to classify business mail, extract briefs, and suggest reply drafts. Outputs are assistive; you decide before sending or confirming deals.',
        'You may object to solely automated decisions with significant effects; contact us for human review.',
      ],
    },
    {
      title: '5. Sharing',
      bullets: [
        'Google LLC: OAuth and Gmail API.',
        'Cloud and AI subprocessors: limited to providing the Service under contractual restrictions.',
        'We do not sell mail content to data brokers.',
      ],
    },
    {
      title: '6. International transfers',
      paragraphs: [
        'If you are in the EEA/UK and data is processed in the US or other countries, we rely on Standard Contractual Clauses (SCCs) or other lawful mechanisms. Contact us for details.',
      ],
    },
    {
      title: '7. Retention',
      bullets: [
        'Account data: while your account is active.',
        'Gmail tokens: while connected; deleted within 30 days after disconnect.',
        'Synced mail and derivatives: while connected; deleted within 30 days after mailbox disconnect unless law requires longer.',
        'Deleted accounts: deleted or anonymized within 30 days after closure.',
        'Security logs: typically 90 days.',
      ],
    },
    {
      title: '8. Security',
      bullets: [
        'TLS/HTTPS in transit.',
        'Application-layer encryption for OAuth tokens and sensitive credentials at rest.',
        'Access controls and least privilege.',
      ],
    },
    {
      title: '9. Your rights',
      bullets: [
        'Access, rectification, erasure, restriction, portability, objection, and withdrawal of consent.',
        'In-app: disconnect Gmail or delete your account.',
        'Google Account → Security → Third-party access to revoke Bioby Creator.',
        `Email ${privacyEmail} (GDPR requests answered within 30 days where applicable).`,
      ],
    },
    {
      title: '10. California residents (CCPA/CPRA)',
      paragraphs: [
        'We do not sell personal information. California residents may request access, deletion, or correction by emailing privacy with subject "California Privacy Request."',
      ],
    },
    {
      title: '11. Children',
      paragraphs: ['The Service is for users 18+. We do not knowingly collect data from children under 18.'],
    },
    {
      title: '12. Changes',
      paragraphs: [
        'We may update this Policy; material changes will be announced on the site or in-app. Continued use after updates means you accept the revised Policy where permitted by law.',
      ],
    },
    {
      title: '13. Contact',
      bullets: [dataControllerEn, registeredAddressEn, `Email: ${privacyEmail}`],
    },
  ],
};

export const privacyByLocale: Record<AppLocale, LegalDocument> = {
  zh: privacyZh,
  en: privacyEn,
};
