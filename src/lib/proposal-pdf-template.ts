import type { TFunction } from 'i18next';

import type { ProposalPreview } from '@/src/types/domain';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bulletSection(title: string, items: string[], tone: string): string {
  if (!items.length) return '';
  return `<section class="term-card ${tone}">
    <h3>${escapeHtml(title)}</h3>
    <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </section>`;
}

export function buildProposalPdfHtml(proposal: ProposalPreview, t: TFunction): string {
  const version = proposal.version ?? proposal.proposedVersion ?? 1;
  const quoteRows = proposal.skuLines
    .map((line) => `<tr>
      <td><strong>${escapeHtml(line.deliverable)}</strong><span>${escapeHtml(line.platform)}</span></td>
      <td>${escapeHtml(line.turnaroundLabel)}</td>
      <td class="price">${escapeHtml(line.priceLabel)}</td>
    </tr>`)
    .join('');
  const snapshot = proposal.creatorSnapshot;
  const platformRows = snapshot?.platforms?.length
    ? `<div class="platforms">${snapshot.platforms.map((platform) => `<div class="platform">
        <strong>${escapeHtml(platform.name)}</strong>
        <span>${escapeHtml(platform.followersRange)}</span>
      </div>`).join('')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${escapeHtml(t('proposalPdf.documentLanguage'))}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(proposal.title)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 38px 42px;
      color: #172033;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", "Microsoft YaHei", Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.45;
    }
    .hero { border-bottom: 2px solid #e8edf7; padding-bottom: 18px; margin-bottom: 20px; }
    .eyebrow { color: #4263eb; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
    h1 { font-size: 28px; line-height: 1.2; margin: 8px 0 10px; letter-spacing: -.02em; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; color: #667085; }
    .pill { border-radius: 999px; background: #eef3ff; color: #3656d4; padding: 5px 10px; font-weight: 700; }
    section { margin-bottom: 18px; break-inside: avoid; }
    h2 { font-size: 17px; margin: 0 0 8px; }
    h3 { font-size: 13px; margin: 0 0 7px; }
    .summary { margin: 0; font-size: 14px; line-height: 1.55; color: #344054; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #dde3ef; border-radius: 14px; overflow: hidden; }
    th { background: #f7f9fc; color: #667085; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; text-align: left; }
    th, td { padding: 9px 12px; border-bottom: 1px solid #e8edf4; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    td span { display: block; color: #7a8498; font-size: 12px; margin-top: 3px; }
    .price { text-align: right; white-space: nowrap; font-weight: 800; color: #1f7a55; }
    .terms { display: grid; grid-template-columns: 1fr; gap: 8px; }
    .term-card { border: 1px solid #e1e6ef; border-left: 5px solid #6c7fd8; border-radius: 12px; padding: 10px 14px; margin: 0; }
    .term-card.payment { border-left-color: #20a46b; }
    .term-card.risk { border-left-color: #d65a5a; }
    ul { margin: 0; padding-left: 20px; }
    li + li { margin-top: 3px; }
    .creator { border-radius: 14px; background: #f7f9fc; padding: 12px 14px; }
    .creator-name { font-size: 15px; font-weight: 800; margin-bottom: 4px; }
    .creator-bio { color: #667085; margin: 0; }
    .platforms { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }
    .platform { min-width: 140px; border: 1px solid #dde3ef; background: #fff; border-radius: 10px; padding: 7px 10px; }
    .platform span { display: block; color: #667085; font-size: 12px; margin-top: 3px; }
    footer { border-top: 1px solid #e8edf4; padding-top: 10px; color: #98a2b3; font-size: 10px; }
  </style>
</head>
<body>
  <header class="hero">
    <div class="eyebrow">${escapeHtml(t('proposalPdf.eyebrow'))}</div>
    <h1>${escapeHtml(proposal.title)}</h1>
    <div class="meta">
      <span class="pill">${escapeHtml(t('proposalPdf.version', { version }))}</span>
      <span>${escapeHtml(t('proposalPdf.brand', { brand: proposal.brandHint }))}</span>
      <span>${escapeHtml(t('proposalPdf.creator', { creator: proposal.creatorDisplayName }))}</span>
    </div>
  </header>

  <section>
    <h2>${escapeHtml(t('proposalPdf.summaryTitle'))}</h2>
    <p class="summary">${escapeHtml(proposal.executiveSummary)}</p>
  </section>

  ${quoteRows ? `<section><h2>${escapeHtml(t('proposalPdf.quoteTitle'))}</h2>
    <table><thead><tr>
      <th>${escapeHtml(t('proposalPdf.deliverable'))}</th>
      <th>${escapeHtml(t('proposalPdf.timeline'))}</th>
      <th class="price">${escapeHtml(t('proposalPdf.price'))}</th>
    </tr></thead><tbody>${quoteRows}</tbody></table></section>` : ''}

  <section>
    <h2>${escapeHtml(t('proposalPdf.termsTitle'))}</h2>
    <div class="terms">
      ${bulletSection(t('proposalPdf.rightsTitle'), proposal.rightsBullets, 'rights')}
      ${bulletSection(t('proposalPdf.paymentTitle'), proposal.paymentBullets, 'payment')}
      ${bulletSection(t('proposalPdf.riskTitle'), proposal.riskBullets, 'risk')}
    </div>
  </section>

  ${snapshot ? `<section><h2>${escapeHtml(t('proposalPdf.creatorTitle'))}</h2>
    <div class="creator">
      <div class="creator-name">${escapeHtml(snapshot.headline || proposal.creatorDisplayName)}</div>
      ${snapshot.bio ? `<p class="creator-bio">${escapeHtml(snapshot.bio)}</p>` : ''}
      ${platformRows}
    </div>
  </section>` : ''}

  <footer>${escapeHtml(t('proposalPdf.footer'))}</footer>
</body>
</html>`;
}
