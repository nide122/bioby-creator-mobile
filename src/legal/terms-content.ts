import type { AppLocale } from '@/src/i18n';

import { legalConfig, legalEntityLabels } from './config';
import type { LegalDocument } from './types';

const { legalEmail, effectiveDate } = legalConfig;
const { dataControllerZh, dataControllerEn, registeredAddressZh, registeredAddressEn } = legalEntityLabels;

const termsZh: LegalDocument = {
  title: '服务条款',
  effectiveDate,
  lastUpdated: effectiveDate,
  intro: [
    `欢迎使用 Bioby Creator（「服务」），由 ${dataControllerZh}（「我们」）提供。访问或使用服务即表示您同意本条款及我们的隐私政策。`,
  ],
  sections: [
    {
      title: '1. 资格',
      paragraphs: ['您须年满 18 周岁，且有资格与 Google 签订 Gmail API 相关协议。'],
    },
    {
      title: '2. 账户与 Gmail 连接',
      bullets: [
        '您负责保管账户凭据。',
        '连接 Gmail 即表示您授权我们按隐私政策所述 scope 访问您的 Gmail。',
        '您可随时在 App 或 Google 账户设置中撤销授权。',
        '您应仅连接您有权管理的邮箱。',
      ],
    },
    {
      title: '3. 服务性质与 AI 免责声明',
      bullets: [
        '服务提供邮件同步、分类、Brief 与草稿建议；不构成法律、财务或商业建议。',
        'AI 生成内容可能存在错误；发送任何邮件前您应自行审阅。',
        '我们不对因您依赖 AI 建议导致的商业损失承担责任（法律不允许排除的责任除外）。',
      ],
    },
    {
      title: '4. 可接受使用',
      bullets: [
        '不得违反适用法律或 Google API 政策。',
        '不得上传恶意代码、滥用 API 或逆向工程服务。',
        '不得使用服务发送 spam 或骚扰邮件。',
      ],
    },
    {
      title: '5. 知识产权',
      paragraphs: [
        '服务软件、界面与文档归我们或许可方所有。您保留对您的邮件与用户生成内容的权利；您授予我们为提供服务所必需的处理许可。',
      ],
    },
    {
      title: '6. 免责声明',
      paragraphs: ['服务按「现状」提供。在法律允许范围内，我们否认所有默示保证。'],
    },
    {
      title: '7. 责任限制',
      paragraphs: [
        '在法律允许的最大范围内，我们对间接、附带、特殊或后果性损害不承担责任；我们的总责任不超过您过去 12 个月向我们支付的费用（或 100 美元，以较高者为准；若未付费则适用后者）。',
      ],
    },
    {
      title: '8. 终止',
      paragraphs: ['您可随时停止使用并注销账户。我们可在通知后终止或限制服务。终止后，数据删除按隐私政策执行。'],
    },
    {
      title: '9. 联系我们',
      bullets: [dataControllerZh, registeredAddressZh, `邮箱：${legalEmail}`],
    },
  ],
};

const termsEn: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate,
  lastUpdated: effectiveDate,
  intro: [
    `Welcome to Bioby Creator (the "Service"), provided by ${dataControllerEn} ("we," "us"). By using the Service you agree to these Terms and our Privacy Policy.`,
  ],
  sections: [
    {
      title: '1. Eligibility',
      paragraphs: ['You must be at least 18 years old and authorized to bind yourself to Google’s Gmail API terms.'],
    },
    {
      title: '2. Account and Gmail',
      bullets: [
        'You are responsible for safeguarding your credentials.',
        'Connecting Gmail authorizes us to access Gmail as described in the Privacy Policy.',
        'You may revoke access anytime in the app or Google Account settings.',
        'Connect only mailboxes you are authorized to manage.',
      ],
    },
    {
      title: '3. AI disclaimer',
      bullets: [
        'The Service assists with sync, classification, briefs, and draft suggestions—not legal, financial, or business advice.',
        'AI output may be wrong; review before sending.',
        'We are not liable for business losses from reliance on AI suggestions except where law forbids exclusion.',
      ],
    },
    {
      title: '4. Acceptable use',
      bullets: [
        'Do not violate applicable law or Google API policies.',
        'No malware, API abuse, reverse engineering, spam, or harassment.',
      ],
    },
    {
      title: '5. Intellectual property',
      paragraphs: [
        'We own the Service software and UI. You retain rights in your mail and user content; you grant us a license to process it to provide the Service.',
      ],
    },
    {
      title: '6. Disclaimer',
      paragraphs: ['THE SERVICE IS PROVIDED "AS IS" TO THE MAXIMUM EXTENT PERMITTED BY LAW.'],
    },
    {
      title: '7. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY IS LIMITED TO FEES PAID IN THE PRIOR 12 MONTHS OR USD $100, WHICHEVER IS GREATER (OR USD $100 IF YOU PAID NOTHING).',
      ],
    },
    {
      title: '8. Termination',
      paragraphs: [
        'You may stop using the Service anytime. We may suspend or terminate for violations. Data handling after termination follows the Privacy Policy.',
      ],
    },
    {
      title: '9. Contact',
      bullets: [dataControllerEn, registeredAddressEn, `Email: ${legalEmail}`],
    },
  ],
};

export const termsByLocale: Record<AppLocale, LegalDocument> = {
  zh: termsZh,
  en: termsEn,
};
