import { getPublicWebBaseUrl } from '@/src/lib/public-web-base-url';

const PUBLIC_API_MARKER = '/api/v1/public/proposals/';

export function extractProposalShareToken(publicPath: string): string | undefined {
  const trimmed = publicPath.trim();
  if (!trimmed) return undefined;

  try {
    const pathname = new URL(trimmed, 'https://proposal-link.invalid').pathname;
    const markerIndex = pathname.indexOf(PUBLIC_API_MARKER);
    if (markerIndex < 0) return undefined;
    const encodedToken = pathname.slice(markerIndex + PUBLIC_API_MARKER.length).split('/')[0];
    return encodedToken ? decodeURIComponent(encodedToken) : undefined;
  } catch {
    return undefined;
  }
}

/** Brand-facing page URL. The API URL remains an implementation detail. */
export function buildPublicProposalWebUrl(publicPath: string): string | undefined {
  const token = extractProposalShareToken(publicPath);
  if (!token) return undefined;
  return `${getPublicWebBaseUrl()}/p/${encodeURIComponent(token)}`;
}
