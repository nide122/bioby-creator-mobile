const QUOTE_TEXT_MARKERS: RegExp[] = [
  /\nOn .+ wrote:\s*\n/i,
  /\nAm .+ schrieb .+:\s*\n/i,
  /\nLe .+ a écrit\s*:\s*\n/i,
  /\n-----Original Message-----/i,
  /\n_{3,}\s*\n/,
  /\nFrom: .+\n(?:Sent|Date): .+\nTo:/i,
  /\n发件人：.+\n发送时间：.+\n收件人：/,
  /\n在 .+ 写道：\s*\n/,
];

const GMAIL_QUOTE_HTML_RE = /<div[^>]*class="[^"]*gmail_quote[^"]*"[\s\S]*$/i;
const BLOCKQUOTE_TAIL_RE = /<blockquote[\s\S]*$/i;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function stripQuotedPlainText(text: string): string {
  if (!text.trim()) return '';

  let result = normalizeNewlines(text);
  for (const marker of QUOTE_TEXT_MARKERS) {
    const match = marker.exec(result);
    if (match && match.index > 0) {
      result = result.slice(0, match.index);
      break;
    }
  }

  const lines = result.split('\n');
  const firstQuotedLine = lines.findIndex((line) => /^>+/.test(line.trim()));
  if (firstQuotedLine > 0) {
    result = lines.slice(0, firstQuotedLine).join('\n');
  }

  return result.trim();
}

export function stripQuotedHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';

  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(trimmed, 'text/html');
    const removeSelectors = [
      '.gmail_quote',
      '.gmail_extra',
      '.gmail_attr',
      '#divRplyFwdMsg',
      '.moz-cite-prefix',
      '.yahoo-quoted-begin',
    ];
    for (const selector of removeSelectors) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
    document.querySelectorAll('blockquote').forEach((node) => node.remove());
    const cleaned = document.body.innerHTML.trim();
    if (cleaned) return cleaned;
  }

  return trimmed.replace(GMAIL_QUOTE_HTML_RE, '').replace(BLOCKQUOTE_TAIL_RE, '').trim();
}

export function stripQuotedEmailContent(
  bodyText: string | null | undefined,
  bodyHtml: string | null | undefined,
): { text: string; html: string | null } {
  const strippedHtml = bodyHtml?.trim() ? stripQuotedHtml(bodyHtml) : null;
  const strippedText = bodyText?.trim()
    ? stripQuotedPlainText(bodyText)
    : strippedHtml
      ? ''
      : '';

  return {
    text: strippedText,
    html: strippedHtml,
  };
}
