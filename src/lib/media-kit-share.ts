import type { TFunction } from 'i18next';

import {
  MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX,
  MEDIA_KIT_PDF_WIDTH_PX,
} from '@/src/lib/media-kit-pdf.constants';
import { shareGeneratedPdf } from '@/src/lib/media-kit-pdf';
import { isMediaKitSectionVisible } from '@/src/lib/media-kit-sections';
import type { MediaKitPreview, MediaKitSectionId } from '@/src/types/domain';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildShareMessage(
  kit: MediaKitPreview,
  headline: string,
  bio: string,
  footer: string,
  t: TFunction
): string {
  const lines: string[] = [headline];
  if (kit.contactUrl) {
    lines.push(kit.contactUrl);
  }
  lines.push('', bio);

  if (kit.aboutTags?.length) {
    lines.push('', kit.aboutTags.join(' · '));
  }
  if (kit.heroStats?.length) {
    lines.push('', t('mediaKitShare.statsSection'));
    kit.heroStats.forEach((s) => lines.push(`${s.label}: ${s.value}`));
  }
  if (kit.publicProofs?.length) {
    lines.push('', t('mediaKitScreen.trustProofTitle'));
    kit.publicProofs.forEach((p) => lines.push(`${p.label}: ${p.value}`));
  }
  if (kit.audience) {
    lines.push('', t('mediaKitShare.audienceSection'));
    if (kit.audience.topLocations) {
      lines.push(`${t('mediaKitShare.audienceLocations')}: ${kit.audience.topLocations}`);
    }
    if (kit.audience.genderAge) {
      lines.push(`${t('mediaKitShare.audienceDemographics')}: ${kit.audience.genderAge}`);
    }
    if (kit.audience.postingCadence) {
      lines.push(`${t('mediaKitShare.audienceCadence')}: ${kit.audience.postingCadence}`);
    }
  }
  if (kit.platforms.length) {
    lines.push('', t('mediaKitShare.channelsSection'));
    kit.platforms.forEach((p) => {
      const handle = p.handle ? `@${p.handle}` : p.name;
      lines.push(`${p.name} (${handle}): ${p.followersRange}${p.monthlyViews ? ` · ${p.monthlyViews}` : ''}`);
    });
  }
  if (kit.rateSummaries?.length) {
    lines.push('', t('mediaKitShare.rateSummarySection'));
    kit.rateSummaries.forEach((r) => lines.push(`${r.title}: ${r.startingPrice}`));
  }
  if (kit.servicesTable?.length) {
    lines.push('', t('mediaKitShare.servicesSection'));
    kit.servicesTable.forEach((r) => lines.push(`${r.service}: ${r.fee}`));
  }
  if (kit.partnerships?.length) {
    lines.push('', t('mediaKitShare.partnershipsSection'), kit.partnerships.join(' · '));
  }
  if (kit.cases.length) {
    lines.push('', t('mediaKitScreen.proofTitle'));
    kit.cases.forEach((c) => {
      const highlight = c.resultSummary?.trim() || c.outcomeNote?.trim();
      lines.push(`${c.title}${highlight ? ` — ${highlight}` : ''}`);
    });
  }
  if (kit.paymentTerms) {
    lines.push('', kit.paymentTerms);
  }
  if (kit.contactEmail) {
    lines.push('', `${t('mediaKitShare.contact')}: ${kit.contactEmail}`);
  }
  lines.push('', kit.inviteCta, '', footer);
  return lines.join('\n');
}

function htmlSection(title: string, subtitle: string | undefined, body: string): string {
  const subtitleHtml = subtitle
    ? `<p class="section-subtitle">${escapeHtml(subtitle)}</p>`
    : '';
  return `<section class="section media-kit-section"><h2>${escapeHtml(title)}</h2>${subtitleHtml}${body}</section>`;
}

export function buildShareHtml(
  kit: MediaKitPreview,
  headline: string,
  bio: string,
  footer: string,
  sectionOrder: MediaKitSectionId[],
  t: TFunction
): string {
  const sections: string[] = [];

  for (const id of sectionOrder) {
    if (!isMediaKitSectionVisible(id, kit)) continue;

    switch (id) {
      case 'about':
        sections.push(
          htmlSection(
            headline,
            t('mediaKitScreen.aboutSubtitle'),
            `<p class="bio">${escapeHtml(bio)}</p>${
              kit.aboutTags?.length
                ? `<p class="tags">${kit.aboutTags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</p>`
                : ''
            }`
          )
        );
        break;
      case 'stats':
        sections.push(
          htmlSection(
            t('mediaKitShare.statsSection'),
            undefined,
            `<div class="stats-grid">${kit.heroStats
              ?.map(
                (stat) =>
                  `<div class="stat"><div class="stat-value">${escapeHtml(stat.value)}</div><div class="stat-label">${escapeHtml(stat.label)}</div></div>`
              )
              .join('')}</div>`
          )
        );
        break;
      case 'trust_proof':
        sections.push(
          htmlSection(
            t('mediaKitScreen.trustProofTitle'),
            t('mediaKitScreen.trustProofSubtitle'),
            `<div class="proof-grid">${kit.publicProofs
              ?.map(
                (proof) =>
                  `<div class="proof"><div class="proof-value">${escapeHtml(proof.value)}</div><div class="proof-label">${escapeHtml(proof.label)}</div>${
                    proof.trendNote ? `<div class="proof-note">${escapeHtml(proof.trendNote)}</div>` : ''
                  }</div>`
              )
              .join('')}</div>`
          )
        );
        break;
      case 'audience':
        sections.push(
          htmlSection(
            t('mediaKitScreen.audienceTitle'),
            t('mediaKitScreen.audienceSubtitle'),
            `<dl class="kv-list">${
              kit.audience?.topLocations
                ? `<div class="kv"><dt>${escapeHtml(t('mediaKitScreen.audienceLocations'))}</dt><dd>${escapeHtml(kit.audience.topLocations)}</dd></div>`
                : ''
            }${
              kit.audience?.genderAge
                ? `<div class="kv"><dt>${escapeHtml(t('mediaKitScreen.audienceDemographics'))}</dt><dd>${escapeHtml(kit.audience.genderAge)}</dd></div>`
                : ''
            }${
              kit.audience?.postingCadence
                ? `<div class="kv"><dt>${escapeHtml(t('mediaKitScreen.audienceCadence'))}</dt><dd>${escapeHtml(kit.audience.postingCadence)}</dd></div>`
                : ''
            }</dl>`
          )
        );
        break;
      case 'channels':
        sections.push(
          htmlSection(
            t('mediaKitScreen.channelsTitle'),
            t('mediaKitScreen.channelsSubtitle'),
            `<div class="stack">${kit.platforms
              .map(
                (p) =>
                  `<div class="card"><div class="card-top"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.followersRange)}</span></div>${
                    p.handle ? `<div class="muted">@${escapeHtml(p.handle)}</div>` : ''
                  }${p.nicheNote ? `<div class="muted">${escapeHtml(p.nicheNote)}</div>` : ''}${
                    p.monthlyViews ? `<div class="accent">${escapeHtml(p.monthlyViews)}</div>` : ''
                  }</div>`
              )
              .join('')}</div>`
          )
        );
        break;
      case 'rates':
        sections.push(
          htmlSection(
            t('mediaKitScreen.rateSummaryTitle'),
            t('mediaKitScreen.rateSummarySubtitle'),
            `<div class="rate-grid">${kit.rateSummaries
              ?.map(
                (rate) =>
                  `<div class="rate-card"><div class="rate-price">${escapeHtml(rate.startingPrice)}</div><div class="rate-title">${escapeHtml(rate.title)}</div>${
                    rate.description ? `<div class="muted">${escapeHtml(rate.description)}</div>` : ''
                  }</div>`
              )
              .join('')}</div>`
          )
        );
        break;
      case 'services':
        sections.push(
          htmlSection(
            t('mediaKitScreen.servicesTitle'),
            t('mediaKitScreen.servicesSubtitle'),
            `<table class="table"><thead><tr><th>${escapeHtml(t('mediaKitScreen.servicesColService'))}</th><th>${escapeHtml(t('mediaKitScreen.servicesColFee'))}</th></tr></thead><tbody>${kit.servicesTable
              ?.map(
                (row) =>
                  `<tr><td>${escapeHtml(row.service)}</td><td class="fee">${escapeHtml(row.fee)}</td></tr>`
              )
              .join('')}</tbody></table>`
          )
        );
        break;
      case 'partnerships':
        sections.push(
          htmlSection(
            t('mediaKitScreen.partnershipsTitle'),
            t('mediaKitScreen.partnershipsSubtitle'),
            `<p class="tags">${kit.partnerships?.map((brand) => `<span class="tag neutral">${escapeHtml(brand)}</span>`).join('')}</p>`
          )
        );
        break;
      case 'cases':
        sections.push(
          htmlSection(
            t('mediaKitScreen.proofTitle'),
            undefined,
            kit.cases.length
              ? `<div class="stack">${kit.cases
                  .map((c) => {
                    const highlight = c.resultSummary?.trim() || c.outcomeNote?.trim();
                    const detail =
                      c.resultSummary?.trim() &&
                      c.outcomeNote?.trim() &&
                      c.outcomeNote.trim() !== c.resultSummary.trim()
                        ? c.outcomeNote.trim()
                        : null;
                    return `<div class="card">${
                      highlight ? `<div class="highlight">${escapeHtml(highlight)}</div>` : ''
                    }<div class="case-title">${escapeHtml(c.title)}</div><div class="tag">${escapeHtml(c.industry)}</div>${
                      detail ? `<div class="muted">${escapeHtml(detail)}</div>` : ''
                    }</div>`;
                  })
                  .join('')}</div>`
              : `<p class="muted">${escapeHtml(t('mediaKitPublicScreen.proofEmptySubtitle'))}</p>`
          )
        );
        break;
      case 'contact':
        sections.push(
          htmlSection(
            t('mediaKitScreen.contactTitle'),
            t('mediaKitScreen.contactSubtitle'),
            `${kit.contactUrl ? `<p class="contact-url">${escapeHtml(kit.contactUrl)}</p>` : ''}${
              kit.contactEmail ? `<p class="contact-email">${escapeHtml(kit.contactEmail)}</p>` : ''
            }<p class="cta">${escapeHtml(kit.inviteCta)}</p>${
              kit.paymentTerms ? `<p class="muted italic">${escapeHtml(kit.paymentTerms)}</p>` : ''
            }`
          )
        );
        break;
      default:
        break;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)}</title>
  <style>
    @page {
      size: ${MEDIA_KIT_PDF_WIDTH_PX}px ${MEDIA_KIT_PDF_SINGLE_PAGE_HEIGHT_PX}px;
      margin: 24px;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      margin: 0;
      padding: 32px;
      line-height: 1.5;
      font-size: 14px;
    }
    .section { margin-bottom: 20px; }
    h2 { margin: 0 0 6px; font-size: 20px; line-height: 1.25; }
    .section-subtitle { margin: 0 0 12px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .bio { margin: 0; font-size: 15px; }
    .muted { color: #6b7280; font-size: 13px; margin-top: 4px; }
    .accent { color: #059669; font-weight: 700; margin-top: 4px; }
    .italic { font-style: italic; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
    .tag {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .tag.neutral { background: #f3f4f6; color: #374151; }
    .stats-grid, .proof-grid, .rate-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .stat, .proof, .rate-card, .card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .stat, .proof { flex: 1 1 140px; min-width: 140px; }
    .stat-value, .proof-value { font-size: 22px; font-weight: 800; }
    .stat-label, .proof-label { font-weight: 700; margin-top: 4px; }
    .proof-note { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .rate-card { flex: 1 1 180px; min-width: 180px; }
    .rate-price { font-size: 20px; font-weight: 800; color: #059669; }
    .rate-title { font-weight: 700; margin-top: 4px; }
    .stack { display: grid; gap: 12px; }
    .card-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .kv-list { margin: 0; }
    .kv { margin-bottom: 10px; }
    .kv dt { color: #6b7280; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
    .kv dd { margin: 0; font-size: 14px; }
    .table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .table th, .table td { padding: 10px 12px; text-align: left; border-top: 1px solid #e5e7eb; }
    .table th { background: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .table .fee { text-align: right; font-weight: 700; color: #059669; }
    .highlight {
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      border-radius: 8px;
      padding: 10px 12px;
      color: #047857;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .case-title { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .contact-url { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #6b7280; }
    .contact-email { font-size: 15px; font-weight: 700; }
    .cta { font-weight: 600; margin-top: 8px; }
    .footer-block {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  ${sections.join('\n')}
  <footer class="footer-block">${escapeHtml(footer)}</footer>
</body>
</html>`;
}

export function buildMediaKitPdfFilename(headline: string): string {
  const slug =
    headline
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'media-kit';
  return `${slug}.pdf`;
}

export async function shareMediaKitPdf(options: {
  html: string;
  filename: string;
  dialogTitle: string;
}): Promise<void> {
  await shareGeneratedPdf(options.html, options.filename, options.dialogTitle);
}
